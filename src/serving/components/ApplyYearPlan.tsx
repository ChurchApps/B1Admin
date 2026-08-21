import React, { useEffect, useMemo, useState } from "react";
import { Alert, Box, Checkbox, FormControl, InputLabel, LinearProgress, MenuItem, Select, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { ApiHelper, DateHelper, Locale } from "@churchapps/apphelper";
import { FormCard } from "../../components/ui";
import { type PlanInterface } from "../../helpers";

interface YearPlanWeek {
  week?: number;
  lessonId?: string;
  lessonName?: string;
  studyId?: string;
  studyName?: string;
  programId?: string;
  venueId?: string;
  venueName?: string;
  externalProviderId?: string;
}

interface YearPlan {
  id?: string;
  name?: string;
  weeks?: YearPlanWeek[];
}

interface Props {
  ministryId: string;
  planTypeId?: string;
  plans: PlanInterface[];
  onSave: () => void;
  onCancel: () => void;
}

interface PreviewRow {
  week: YearPlanWeek;
  date: Date;
  included: boolean;
  skipReason?: string;
  path?: string;
}

const addWeeks = (start: Date, weeks: number) => {
  const d = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 12, 0, 0);
  d.setDate(d.getDate() + (weeks * 7));
  return d;
};

const dateKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const venuePath = (week: YearPlanWeek) => {
  if (!week.programId || !week.studyId || !week.lessonId || !week.venueId) return "";
  return `/lessons/${week.programId}/${week.studyId}/${week.lessonId}/${week.venueId}`;
};

export const ApplyYearPlan: React.FC<Props> = (props) => {
  const [yearPlans, setYearPlans] = useState<YearPlan[] | null>(null);
  const [planId, setPlanId] = useState("");
  const [startDate, setStartDate] = useState<Date>(() => {
    const lastSunday = DateHelper.getLastSunday();
    return new Date(lastSunday.getFullYear(), lastSunday.getMonth(), lastSunday.getDate() + 7, 12, 0, 0);
  });
  const [weekCount, setWeekCount] = useState(52);
  const [copyMode, setCopyMode] = useState("all");
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ApiHelper.get("/yearPlans/public", "LessonsApi").then((data: YearPlan[]) => {
      const list = data || [];
      setYearPlans(list);
      if (list[0]?.id) setPlanId(list[0].id);
    }).catch(() => {
      setYearPlans([]);
      setError(Locale.label("plans.applyYearPlan.loadFailed") || "Could not load published year plans.");
    });
  }, []);

  const selectedPlan = useMemo(() => (yearPlans || []).find(p => p.id === planId), [yearPlans, planId]);

  const occupiedDates = useMemo(() => {
    const keys = new Set<string>();
    for (const p of props.plans || []) {
      if (!p.serviceDate) continue;
      keys.add(dateKey(DateHelper.toDate(p.serviceDate)));
    }
    return keys;
  }, [props.plans]);

  const previousPlan = useMemo(() => {
    if (!props.plans || props.plans.length === 0) return null;
    const withDate = [...props.plans].filter(p => p.serviceDate).sort((a, b) => {
      const dateA = a.serviceDate ? new Date(a.serviceDate).getTime() : 0;
      const dateB = b.serviceDate ? new Date(b.serviceDate).getTime() : 0;
      return dateB - dateA;
    });
    return withDate[0] || null;
  }, [props.plans]);

  const rows: PreviewRow[] = useMemo(() => {
    const weeks = (selectedPlan?.weeks || []).slice(0, Math.max(1, weekCount));
    return weeks.map((week, i) => {
      const date = addWeeks(startDate, i);
      const path = venuePath(week);
      let skipReason = "";
      if (week.externalProviderId) skipReason = Locale.label("plans.applyYearPlan.externalSkipped") || "External provider weeks are applied from Lessons.church content only.";
      else if (!path) skipReason = Locale.label("plans.applyYearPlan.missingVenue") || "Missing program, lesson, or venue.";
      else if (occupiedDates.has(dateKey(date))) skipReason = Locale.label("plans.applyYearPlan.dateTaken") || "A plan already exists on this date.";
      return { week, date, path: path || undefined, included: !skipReason, skipReason: skipReason || undefined };
    });
  }, [selectedPlan, startDate, weekCount, occupiedDates]);

  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  useEffect(() => { setExcluded(new Set()); }, [planId, startDate, weekCount]);

  const toSchedule = rows.filter((r, i) => r.included && !excluded.has(i));

  const handleSave = async () => {
    if (toSchedule.length === 0) return;
    setSaving(true);
    setSaveProgress(0);
    setError(null);
    try {
      let copySourceId: string | undefined = previousPlan?.id;
      for (let i = 0; i < toSchedule.length; i++) {
        const row = toSchedule[i];
        const displayName = row.week.lessonName || row.week.studyName || Locale.label("plans.lessonScheduleEdit.fallbackLesson") || "Lesson";
        const newPlan: PlanInterface = {
          ministryId: props.ministryId,
          planTypeId: props.planTypeId,
          serviceDate: row.date,
          name: `${DateHelper.prettyDate(row.date)} - ${displayName}`,
          notes: "",
          serviceOrder: true,
          providerId: "lessonschurch",
          providerPlanId: row.path,
          providerPlanName: displayName,
          contentType: "provider",
          contentId: row.week.venueId
        };
        if (copyMode !== "none" && copySourceId) {
          const created = await ApiHelper.post("/plans/copy/" + copySourceId, { ...newPlan, copyMode }, "DoingApi");
          if (created?.id) copySourceId = created.id;
        } else {
          await ApiHelper.post("/plans", [newPlan], "DoingApi");
        }
        setSaveProgress(Math.round(((i + 1) / toSchedule.length) * 100));
      }
      props.onSave();
    } catch (err) {
      console.error("Error applying year plan:", err);
      setError(Locale.label("plans.applyYearPlan.savingFailed") || "Failed to create some plans. Please check and try again.");
      setSaving(false);
    }
  };

  return (
    <FormCard
      title={Locale.label("plans.applyYearPlan.title") || "Apply Year Plan"}
      icon="event_repeat"
      onSave={handleSave}
      onCancel={props.onCancel}
      disabled={saving || toSchedule.length === 0}
      isSubmitting={saving}
      saveText={saving ? `${Locale.label("plans.applyYearPlan.schedulingProgress") || "Scheduling..."} ${saveProgress}%` : undefined}
      saveTestId="apply-year-plan-save"
      data-testid="apply-year-plan"
    >
      {saving && <LinearProgress variant="determinate" value={saveProgress} sx={{ mb: 2 }} />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {yearPlans && yearPlans.length === 0 && (
        <Alert severity="info">{Locale.label("plans.applyYearPlan.nonePublished") || "No year plans have been published yet."}</Alert>
      )}

      <Stack spacing={2}>
        <FormControl fullWidth>
          <InputLabel>{Locale.label("plans.applyYearPlan.yearPlan") || "Year plan"}</InputLabel>
          <Select
            label={Locale.label("plans.applyYearPlan.yearPlan") || "Year plan"}
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
            disabled={saving}
            data-testid="apply-year-plan-select"
          >
            {(yearPlans || []).map(p => (
              <MenuItem key={p.id} value={p.id}>{p.name} ({p.weeks?.length || 0} {Locale.label("plans.applyYearPlan.weeks") || "weeks"})</MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          fullWidth
          type="date"
          label={Locale.label("plans.applyYearPlan.startDate") || "First class date"}
          value={DateHelper.formatHtml5Date(startDate)}
          onChange={(e) => setStartDate(DateHelper.toDate(e.target.value))}
          disabled={saving}
          data-testid="apply-year-plan-start-date"
        />

        <FormControl fullWidth>
          <InputLabel>{Locale.label("plans.applyYearPlan.weekCount") || "How many weeks"}</InputLabel>
          <Select
            label={Locale.label("plans.applyYearPlan.weekCount") || "How many weeks"}
            value={weekCount}
            onChange={(e) => setWeekCount(Number(e.target.value))}
            disabled={saving}
            data-testid="apply-year-plan-week-count"
          >
            <MenuItem value={12}>12 {Locale.label("plans.applyYearPlan.weeks") || "weeks"}</MenuItem>
            <MenuItem value={24}>24 {Locale.label("plans.applyYearPlan.weeks") || "weeks"}</MenuItem>
            <MenuItem value={44}>44 {Locale.label("plans.applyYearPlan.weeks") || "weeks"}</MenuItem>
            <MenuItem value={52}>52 {Locale.label("plans.applyYearPlan.weeks") || "weeks"}</MenuItem>
          </Select>
        </FormControl>

        {previousPlan && (
          <FormControl fullWidth>
            <InputLabel>{Locale.label("plans.planEdit.copyPrevious") || "Copy from previous plan"}</InputLabel>
            <Select
              label={Locale.label("plans.planEdit.copyPrevious") || "Copy from previous plan"}
              value={copyMode}
              onChange={(e) => setCopyMode(e.target.value)}
              disabled={saving}
              data-testid="apply-year-plan-copy-mode"
            >
              <MenuItem value="none">{Locale.label("plans.planEdit.copyNothing") || "Nothing"}</MenuItem>
              <MenuItem value="positions">{Locale.label("plans.planEdit.copyPositions") || "Positions Only"}</MenuItem>
              <MenuItem value="all">{Locale.label("plans.planEdit.copyAll") || "Positions and Assignments"}</MenuItem>
            </Select>
          </FormControl>
        )}

        {rows.length > 0 && (
          <>
            <Typography variant="subtitle2" color="text.secondary">
              {toSchedule.length} {Locale.label("plans.applyYearPlan.lessonsToSchedule") || "lessons to schedule"}
            </Typography>
            <Box sx={{ maxHeight: 420, overflow: "auto", border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
              <Table size="small" data-testid="apply-year-plan-preview">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" />
                    <TableCell>{Locale.label("plans.applyYearPlan.week") || "Week"}</TableCell>
                    <TableCell>{Locale.label("plans.bulkLessonSchedule.date") || "Date"}</TableCell>
                    <TableCell>{Locale.label("plans.bulkLessonSchedule.lesson") || "Lesson"}</TableCell>
                    <TableCell>{Locale.label("plans.bulkLessonSchedule.venue") || "Venue"}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row, i) => {
                    const checked = row.included && !excluded.has(i);
                    return (
                      <TableRow key={i} sx={{ opacity: checked ? 1 : 0.5 }} data-testid={`apply-year-plan-row-${i}`}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={checked}
                            disabled={saving || !row.included}
                            onChange={() => setExcluded(prev => {
                              const next = new Set(prev);
                              if (next.has(i)) next.delete(i); else next.add(i);
                              return next;
                            })}
                            data-testid={`apply-year-plan-include-${i}`}
                          />
                        </TableCell>
                        <TableCell>{row.week.week}</TableCell>
                        <TableCell>{dateKey(row.date)}</TableCell>
                        <TableCell>
                          {row.week.studyName} — {row.week.lessonName}
                          {row.skipReason && <Typography variant="caption" color="text.secondary" display="block">{row.skipReason}</Typography>}
                        </TableCell>
                        <TableCell>{row.week.venueName || "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          </>
        )}
      </Stack>
    </FormCard>
  );
};
