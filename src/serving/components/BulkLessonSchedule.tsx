import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box, Button, Typography, Stack, TextField, FormControl, InputLabel,
  Select, MenuItem, Table, TableHead, TableRow, TableCell, TableBody,
  Checkbox, LinearProgress, Alert
} from "@mui/material";
import { MenuBook as MenuBookIcon } from "@mui/icons-material";
import { ApiHelper, DateHelper, InputBox, Locale } from "@churchapps/apphelper";
import { getProvider, type ContentFolder, type ContentItem } from "@churchapps/content-providers";
import { type PlanInterface } from "../../helpers";
import { LessonSelector } from "./LessonSelector";

interface Props {
  ministryId: string;
  planTypeId?: string;
  plans: PlanInterface[];
  onSave: () => void;
  onCancel: () => void;
}

interface ScheduleEntry {
  lesson: ContentFolder;
  venue: ContentFolder | null;
  date: Date;
  included: boolean;
}

export const BulkLessonSchedule: React.FC<Props> = (props) => {
  const [startDate, setStartDate] = useState<Date>(() => {
    const lastSunday = DateHelper.getLastSunday();
    return new Date(lastSunday.getFullYear(), lastSunday.getMonth(), lastSunday.getDate() + 7, 12, 0, 0);
  });
  const [intervalDays, setIntervalDays] = useState<number>(7);
  const [copyMode, setCopyMode] = useState<string>("all");
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Selected starting lesson (from LessonSelector)
  const [selectedVenueId, setSelectedVenueId] = useState<string>("");
  const [selectedVenueName, setSelectedVenueName] = useState<string>("");
  const [selectedContentPath, setSelectedContentPath] = useState<string>("");
  const [selectedProviderId, setSelectedProviderId] = useState<string>("");
  const [showLessonSelector, setShowLessonSelector] = useState(false);

  // Find the most recent previous plan with a lesson
  const previousPlan = useMemo(() => {
    if (!props.plans || props.plans.length === 0) return null;
    const withLesson = props.plans
      .filter(p => p.providerPlanId && p.providerId)
      .sort((a, b) => {
        const dateA = a.serviceDate ? new Date(a.serviceDate).getTime() : 0;
        const dateB = b.serviceDate ? new Date(b.serviceDate).getTime() : 0;
        return dateB - dateA;
      });
    return withLesson[0] || null;
  }, [props.plans]);

  // Browse content at a given path for a provider
  const browseAt = useCallback(async (path: string, provId: string): Promise<ContentFolder[]> => {
    const provider = getProvider(provId);
    if (!provider) return [];
    let items: ContentItem[] = [];
    if (provider.requiresAuth) {
      items = await ApiHelper.post("/providerProxy/browse", { ministryId: props.ministryId, providerId: provId, path: path || null }, "DoingApi");
    } else {
      items = await provider.browse(path || null, null);
    }
    return items.filter((item): item is ContentFolder => item.type === "folder");
  }, [props.ministryId]);

  const handleLessonSelect = useCallback((venueId: string, venueName?: string, contentPath?: string, providerId?: string) => {
    setSelectedVenueId(venueId);
    setSelectedVenueName(venueName || "");
    setSelectedContentPath(contentPath || "");
    setSelectedProviderId(providerId || "");
    setShowLessonSelector(false);
    setError(null);
  }, []);

  // When a starting lesson is selected, load all sibling lessons from that point onward
  useEffect(() => {
    if (!selectedContentPath || !selectedProviderId) return;

    const loadSeries = async () => {
      setLoadingEntries(true);
      setEntries([]);

      // Parse: /lessons/{programId}/{studyId}/{lessonId}/{venueId}
      const segments = selectedContentPath.replace(/^\//, "").split("/").filter(Boolean);
      if (segments.length < 4) {
        setError("Selected lesson path format not supported for bulk scheduling.");
        setLoadingEntries(false);
        return;
      }

      try {
        const studyLevelPath = "/" + segments.slice(0, 3).join("/");
        const selectedLessonId = segments[3];

        // Load all lessons in the study
        const allLessons = await browseAt(studyLevelPath, selectedProviderId);

        // Find the selected lesson's index
        const selectedIndex = allLessons.findIndex(l => {
          const s = l.path.replace(/^\//, "").split("/").filter(Boolean);
          return s[s.length - 1] === selectedLessonId;
        });
        const remaining = selectedIndex >= 0 ? allLessons.slice(selectedIndex) : allLessons;

        if (remaining.length === 0) {
          setError("No lessons found in this series.");
          setLoadingEntries(false);
          return;
        }

        // Load venues for remaining lessons in parallel, match by selected venue name
        const newEntries: ScheduleEntry[] = await Promise.all(
          remaining.map(async (lesson, i) => {
            const date = new Date(startDate);
            date.setDate(date.getDate() + (i * intervalDays));

            let venue: ContentFolder | null = null;
            try {
              const venues = await browseAt(lesson.path, selectedProviderId);
              venue = venues.find(v => v.title === selectedVenueName) || venues[0] || null;
            } catch { /* venue will be null */ }

            return { lesson, venue, date, included: true };
          })
        );

        setEntries(newEntries);
      } catch (err) {
        console.error("Error loading bulk schedule data:", err);
        setError("Failed to load lesson data. Please try again.");
      } finally {
        setLoadingEntries(false);
      }
    };

    loadSeries();
  }, [selectedContentPath, selectedProviderId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Recalculate dates when startDate or interval changes
  useEffect(() => {
    if (entries.length > 0) {
      setEntries(prev => prev.map((entry, i) => {
        const date = new Date(startDate);
        date.setDate(date.getDate() + (i * intervalDays));
        return { ...entry, date };
      }));
    }
  }, [startDate, intervalDays]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleEntry = (index: number) => {
    setEntries(prev => prev.map((e, i) => i === index ? { ...e, included: !e.included } : e));
  };

  const includedCount = entries.filter(e => e.included && e.venue).length;

  const handleSave = async () => {
    setSaving(true);
    setSaveProgress(0);

    const toSchedule = entries.filter(e => e.included && e.venue);
    try {
      for (let i = 0; i < toSchedule.length; i++) {
        const entry = toSchedule[i];
        const formattedDate = DateHelper.prettyDate(entry.date);

        const newPlan: PlanInterface = {
          ministryId: props.ministryId,
          planTypeId: props.planTypeId,
          serviceDate: entry.date,
          name: `${formattedDate} - ${entry.venue!.title}`,
          notes: "",
          serviceOrder: true,
          providerId: selectedProviderId,
          providerPlanId: entry.venue!.path,
          providerPlanName: entry.venue!.title,
          contentType: "provider",
          contentId: entry.venue!.id
        };

        if (copyMode !== "none" && previousPlan?.id) {
          await ApiHelper.post("/plans/copy/" + previousPlan.id, { ...newPlan, copyMode }, "DoingApi");
        } else {
          await ApiHelper.post("/plans", [newPlan], "DoingApi");
        }

        setSaveProgress(Math.round(((i + 1) / toSchedule.length) * 100));
      }
      props.onSave();
    } catch (err) {
      console.error("Error creating bulk plans:", err);
      setError("Failed to create some plans. Please check and try again.");
      setSaving(false);
    }
  };

  return (
    <>
      <InputBox
        headerText={Locale.label("plans.bulkLessonSchedule.title") || "Bulk Schedule Lessons"}
        headerIcon="calendar_month"
        saveFunction={handleSave}
        cancelFunction={props.onCancel}
        saveText={saving ? `Scheduling... ${saveProgress}%` : undefined}
      >
        {saving && <LinearProgress variant="determinate" value={saveProgress} sx={{ mb: 2 }} />}
        {error && <Alert severity="info" sx={{ mb: 2 }}>{error}</Alert>}

        <Stack spacing={2}>
          {/* Lesson Selection - same pattern as LessonScheduleEdit */}
          <Box>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {Locale.label("plans.bulkLessonSchedule.startingLesson") || "Starting Lesson"}
            </Typography>
            {selectedVenueId ? (
              <Box
                sx={{
                  p: 2,
                  border: 1,
                  borderColor: "primary.main",
                  borderRadius: 1,
                  bgcolor: "action.hover",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <MenuBookIcon color="primary" />
                  <Typography variant="subtitle1">{selectedVenueName || selectedVenueId}</Typography>
                </Box>
                <Button
                  size="small"
                  onClick={() => setShowLessonSelector(true)}
                  disabled={saving}
                >
                  {Locale.label("common.change") || "Change"}
                </Button>
              </Box>
            ) : (
              <Button
                variant="outlined"
                fullWidth
                onClick={() => setShowLessonSelector(true)}
                startIcon={<MenuBookIcon />}
                disabled={saving}
                sx={{ py: 2 }}
              >
                {Locale.label("plans.lessonScheduleEdit.selectLesson") || "Select Lesson"}
              </Button>
            )}
          </Box>

          <TextField
            fullWidth
            label={Locale.label("plans.bulkLessonSchedule.startDate") || "Start Date"}
            type="date"
            value={DateHelper.formatHtml5Date(startDate)}
            onChange={(e) => setStartDate(DateHelper.toDate(e.target.value))}
            disabled={saving}
          />

          <FormControl fullWidth>
            <InputLabel>{Locale.label("plans.bulkLessonSchedule.interval") || "Interval"}</InputLabel>
            <Select
              label={Locale.label("plans.bulkLessonSchedule.interval") || "Interval"}
              value={intervalDays}
              onChange={(e) => setIntervalDays(Number(e.target.value))}
              disabled={saving}
            >
              <MenuItem value={7}>{Locale.label("plans.bulkLessonSchedule.weekly") || "Weekly"}</MenuItem>
              <MenuItem value={14}>{Locale.label("plans.bulkLessonSchedule.biWeekly") || "Bi-Weekly"}</MenuItem>
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
              >
                <MenuItem value="none">{Locale.label("plans.planEdit.copyNothing") || "Nothing"}</MenuItem>
                <MenuItem value="positions">{Locale.label("plans.planEdit.copyPositions") || "Positions Only"}</MenuItem>
                <MenuItem value="all">{Locale.label("plans.planEdit.copyAll") || "Positions and Assignments"}</MenuItem>
              </Select>
            </FormControl>
          )}

          {/* Loading indicator for entries */}
          {loadingEntries && (
            <Box sx={{ py: 2, textAlign: "center" }}>
              <LinearProgress />
              <Typography sx={{ mt: 1 }} variant="body2" color="text.secondary">Loading lesson series...</Typography>
            </Box>
          )}

          {/* Preview table */}
          {entries.length > 0 && (
            <>
              <Typography variant="subtitle2" color="text.secondary">
                {includedCount} {Locale.label("plans.bulkLessonSchedule.lessonsToSchedule") || "lessons to schedule"}
              </Typography>

              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" />
                    <TableCell>{Locale.label("plans.bulkLessonSchedule.date") || "Date"}</TableCell>
                    <TableCell>{Locale.label("plans.bulkLessonSchedule.lesson") || "Lesson"}</TableCell>
                    <TableCell>{Locale.label("plans.bulkLessonSchedule.venue") || "Venue"}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {entries.map((entry, i) => (
                    <TableRow key={i} sx={{ opacity: entry.included ? 1 : 0.5 }}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={entry.included}
                          onChange={() => toggleEntry(i)}
                          disabled={saving || !entry.venue}
                        />
                      </TableCell>
                      <TableCell>{DateHelper.prettyDate(entry.date)}</TableCell>
                      <TableCell>{entry.lesson.title}</TableCell>
                      <TableCell>{entry.venue?.title || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </Stack>
      </InputBox>

      <LessonSelector
        open={showLessonSelector}
        onClose={() => setShowLessonSelector(false)}
        onSelect={handleLessonSelect}
        returnVenueName={true}
        ministryId={props.ministryId}
        initialNavigationPath={previousPlan?.providerPlanId}
        initialProviderId={previousPlan?.providerId}
        previousVenueName={previousPlan?.providerPlanName}
      />
    </>
  );
};
