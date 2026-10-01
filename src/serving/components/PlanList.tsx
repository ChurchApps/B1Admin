import React, { useCallback, memo } from "react";
import { Box, Button, Typography, Stack, Link, Menu, MenuItem, ListItemIcon, ListItemText, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import { PillTabs, Surface, TextAction, VerbRow, srOnlySx, tableScrollSx } from "../../components/ui";
import { Add as AddIcon, CalendarMonth as CalendarIcon, ContentCopyOutlined as TemplatesIcon, MenuBook as MenuBookIcon, DateRange as DateRangeIcon } from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { type GroupInterface } from "@churchapps/helpers";
import { type PlanInterface, hasPlansEditAccess } from "../../helpers";
import { ArrayHelper, DateHelper, Locale, Loading } from "@churchapps/apphelper";
import { PlanEdit } from "./PlanEdit";
import { PlanTemplateManager } from "./PlanTemplateManager";
import { LessonScheduleEdit } from "./LessonScheduleEdit";
import { BulkLessonSchedule } from "./BulkLessonSchedule";
import { ApplyYearPlan } from "./ApplyYearPlan";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "../../queryClient";

const toolLinkSx = { display: "inline-flex", alignItems: "center", gap: 0.5, "& .MuiSvgIcon-root": { fontSize: 18 } };

interface Props {
  ministry: GroupInterface;
  planTypeId?: string;
}

export const PlanList = memo((props: Props) => {
  const [plan, setPlan] = React.useState<PlanInterface | null>(null);
  const [showPast, setShowPast] = React.useState(false);
  const [showLessonSchedule, setShowLessonSchedule] = React.useState(false);
  const [showBulkSchedule, setShowBulkSchedule] = React.useState(false);
  const [showApplyYearPlan, setShowApplyYearPlan] = React.useState(false);
  const [showTemplates, setShowTemplates] = React.useState(false);
  const [lessonMenuAnchor, setLessonMenuAnchor] = React.useState<null | HTMLElement>(null);
  const lessonAnchorRef = React.useRef<HTMLSpanElement>(null);
  const hasPlansEdit = hasPlansEditAccess();

  const myMinistriesQuery = useQuery<GroupInterface[]>({
    queryKey: ["/groups/my/ministry", "MembershipApi"],
    enabled: !hasPlansEdit,
    placeholderData: []
  });

  const isMinistryMember = !hasPlansEdit && (myMinistriesQuery.data || []).some((g) => g.id === props.ministry.id);
  const canEdit = hasPlansEdit || isMinistryMember;

  const plansQuery = useQuery<PlanInterface[]>({
    queryKey: props.planTypeId ? [`/plans/types/${props.planTypeId}`, "DoingApi"] : ["/plans", "DoingApi"],
    placeholderData: []
  });

  const allPlans = React.useMemo(() => {
    // When planTypeId is provided, the API already returns filtered data
    if (props.planTypeId) return plansQuery.data || [];
    // When no planTypeId, filter by ministry only
    return ArrayHelper.getAll(plansQuery.data || [], "ministryId", props.ministry.id);
  }, [plansQuery.data, props.ministry.id, props.planTypeId]);

  const plans = React.useMemo(() => {
    if (showPast) return allPlans;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return allPlans.filter(p => {
      if (!p.serviceDate) return true;
      const d = DateHelper.toDate(p.serviceDate);
      d.setHours(0, 0, 0, 0);
      return d >= today;
    });
  }, [allPlans, showPast]);

  const addPlan = useCallback(() => {
    const lastSunday = DateHelper.getLastSunday();
    // Create a new date using local year/month/day to avoid timezone issues
    const date = new Date(lastSunday.getFullYear(), lastSunday.getMonth(), lastSunday.getDate() + 7, 12, 0, 0);
    const name = DateHelper.prettyDate(date);
    setPlan({
      ministryId: props.ministry.id,
      planTypeId: props.planTypeId,
      serviceDate: date,
      name,
      notes: "",
      serviceOrder: true
    });
  }, [props.ministry.id, props.planTypeId]);

  const handleUpdated = useCallback(() => {
    setPlan(null);
    setShowLessonSchedule(false);
    setShowBulkSchedule(false);
    setShowApplyYearPlan(false);
    plansQuery.refetch();
    // Invalidate both the specific plan type query and the general plans query
    if (props.planTypeId) {
      queryClient.invalidateQueries({ queryKey: [`/plans/types/${props.planTypeId}`, "DoingApi"] });
    }
    queryClient.invalidateQueries({ queryKey: ["/plans", "DoingApi"] });
  }, [plansQuery, props.planTypeId]);

  const handleScheduleLesson = useCallback(() => {
    setShowLessonSchedule(true);
  }, []);


  if (showBulkSchedule && canEdit) {
    return (
      <BulkLessonSchedule
        ministryId={props.ministry.id || ""}
        planTypeId={props.planTypeId}
        plans={allPlans}
        onSave={handleUpdated}
        onCancel={() => setShowBulkSchedule(false)}
      />
    );
  }

  if (showApplyYearPlan && canEdit) {
    return (
      <ApplyYearPlan
        ministryId={props.ministry.id || ""}
        planTypeId={props.planTypeId}
        plans={allPlans}
        onSave={handleUpdated}
        onCancel={() => setShowApplyYearPlan(false)}
      />
    );
  }

  if (showLessonSchedule && canEdit) {
    return (
      <LessonScheduleEdit
        ministryId={props.ministry.id || ""}
        planTypeId={props.planTypeId}
        plans={allPlans}
        onSave={handleUpdated}
        onCancel={() => setShowLessonSchedule(false)}
      />
    );
  }

  if (plan && canEdit) {
    return <PlanEdit plan={plan} plans={allPlans} updatedFunction={handleUpdated} />;
  }

  if (plansQuery.isLoading) {
    return <Loading />;
  }

  const lessonMenu = (
    <Menu anchorEl={lessonMenuAnchor} open={Boolean(lessonMenuAnchor)} onClose={() => setLessonMenuAnchor(null)}>
      <MenuItem onClick={() => { setLessonMenuAnchor(null); handleScheduleLesson(); }}>
        <ListItemIcon><MenuBookIcon fontSize="small" /></ListItemIcon>
        <ListItemText>{Locale.label("plans.planList.scheduleLesson", "Schedule Lesson")}</ListItemText>
      </MenuItem>
      <MenuItem onClick={() => { setLessonMenuAnchor(null); setShowBulkSchedule(true); }}>
        <ListItemIcon><DateRangeIcon fontSize="small" /></ListItemIcon>
        <ListItemText>{Locale.label("plans.planList.bulkSchedule", "Bulk Schedule")}</ListItemText>
      </MenuItem>
      <MenuItem onClick={() => { setLessonMenuAnchor(null); setShowApplyYearPlan(true); }} data-testid="apply-year-plan-menu">
        <ListItemIcon><CalendarIcon fontSize="small" /></ListItemIcon>
        <ListItemText>{Locale.label("plans.planList.applyYearPlan", "Apply Year Plan")}</ListItemText>
      </MenuItem>
    </Menu>
  );

  const scheduleLessonVerb = (
    <Box component="span" ref={lessonAnchorRef}>
      <TextAction onClick={() => setLessonMenuAnchor(lessonAnchorRef.current)} data-testid="schedule-lesson-button">
        <Box component="span" sx={toolLinkSx}><MenuBookIcon />{Locale.label("plans.planList.scheduleLesson", "Schedule Lesson")}</Box>
      </TextAction>
    </Box>
  );

  const addPlanButton = (label: string) => (
    <Button variant="contained" startIcon={<AddIcon />} onClick={addPlan} data-testid="add-plan-button" sx={{ flexShrink: 0 }}>{label}</Button>
  );

  const hasPastPlans = !showPast && plans.length === 0 && allPlans.length > 0;

  if (plans.length === 0 && !hasPastPlans) {
    return (
      <Surface>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
          <Typography variant="h3" component="h2">{Locale.label("plans.planList.plans")}</Typography>
          {canEdit && addPlanButton(Locale.label("plans.planList.createPlan"))}
        </Stack>
        <Typography color="text.secondary">{Locale.label("plans.planList.noPlans")}</Typography>
        {canEdit && <VerbRow sx={{ mt: 1 }}>{scheduleLessonVerb}</VerbRow>}
        {lessonMenu}
      </Surface>
    );
  }

  return (
    <Surface>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h3" component="h2">{Locale.label("plans.planList.plans")}</Typography>
        {canEdit && (
          <Stack direction="row" spacing={3} alignItems="center" useFlexGap flexWrap="wrap">
            <VerbRow plain>
              {scheduleLessonVerb}
              <TextAction onClick={() => setShowTemplates(true)} data-testid="plan-templates-button">
                <Box component="span" sx={toolLinkSx}><TemplatesIcon />{Locale.label("plans.templates.button", "Templates")}</Box>
              </TextAction>
            </VerbRow>
            {addPlanButton(Locale.label("plans.planList.newPlan"))}
          </Stack>
        )}
      </Stack>
      <PillTabs
        aria-label={Locale.label("plans.planList.plans")}
        value={showPast ? "past" : "upcoming"}
        onChange={(v) => setShowPast(v === "past")}
        options={[
          { value: "upcoming", label: Locale.label("plans.planList.upcoming", "Upcoming"), "data-testid": "plans-upcoming-pill" },
          { value: "past", label: Locale.label("plans.planList.past", "Past"), "data-testid": "plans-past-pill" }
        ]}
        sx={{ mb: 2 }}
      />

      {hasPastPlans ? (
        <Typography color="text.secondary">
          {Locale.label("plans.planList.noUpcomingHint", "Nothing is scheduled from today on. Choose \"Past\" to see earlier plans.")}
        </Typography>
      ) : (
        <Box sx={tableScrollSx} role="region" aria-label={Locale.label("plans.planList.plans")} tabIndex={0}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{Locale.label("common.name")}</TableCell>
                {canEdit && <TableCell align="right"><Box component="span" sx={srOnlySx}>{Locale.label("plans.servingPage.actions", "Actions")}</Box></TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {plans.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link component={RouterLink} to={`/serving/plans/${p.id}`} underline="hover" sx={{ fontWeight: 600 }}>
                      {p.name}
                    </Link>
                    <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
                      {[p.serviceDate ? DateHelper.prettyDate(DateHelper.toDate(p.serviceDate)) : "", p.serviceOrder ? Locale.label("plans.planList.serviceOrder") : ""].filter(Boolean).join(" · ")}
                    </Typography>
                  </TableCell>
                  {canEdit && (
                    <TableCell align="right">
                      <TextAction small onClick={() => setPlan(p)} aria-label={Locale.label("common.edit")}>{Locale.label("common.edit")}</TextAction>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      {lessonMenu}

      {showTemplates && canEdit && (
        <PlanTemplateManager ministryId={props.ministry.id || ""} plans={plans} onClose={() => setShowTemplates(false)} />
      )}
    </Surface>
  );
});
