import React, { useCallback, memo } from "react";
import { Box, Card, CardContent, Typography, Stack, Paper, Chip, Avatar, Button, Menu, MenuItem, ListItemIcon, ListItemText, FormControlLabel, Switch } from "@mui/material";
import { Add as AddIcon, ArrowDropDown as ArrowDropDownIcon, Assignment as AssignmentIcon, CalendarMonth as CalendarIcon, Edit as EditIcon, EventNote as EventNoteIcon, MenuBook as MenuBookIcon, DateRange as DateRangeIcon, History as HistoryIcon } from "@mui/icons-material";
import { Link } from "react-router-dom";
import { type GroupInterface } from "@churchapps/helpers";
import { type PlanInterface } from "../../helpers";
import { ArrayHelper, DateHelper, Locale, Loading, UserHelper, Permissions } from "@churchapps/apphelper";
import { PlanEdit } from "./PlanEdit";
import { LessonScheduleEdit } from "./LessonScheduleEdit";
import { BulkLessonSchedule } from "./BulkLessonSchedule";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "../../queryClient";

interface Props {
  ministry: GroupInterface;
  planTypeId?: string;
}



export const PlanList = memo((props: Props) => {
  const [plan, setPlan] = React.useState<PlanInterface>(null);
  const [showPast, setShowPast] = React.useState(false);
  const [showLessonSchedule, setShowLessonSchedule] = React.useState(false);
  const [showBulkSchedule, setShowBulkSchedule] = React.useState(false);
  const [lessonMenuAnchor, setLessonMenuAnchor] = React.useState<null | HTMLElement>(null);
  const canEdit = UserHelper.checkAccess(Permissions.membershipApi.plans.edit);

  const plansQuery = useQuery<PlanInterface[]>({
    queryKey: props.planTypeId ? [`/plans/types/${props.planTypeId}`, "DoingApi"] : ["/plans", "DoingApi"],
    placeholderData: []
  });

  const plans = React.useMemo(() => {
    let result: PlanInterface[];
    // When planTypeId is provided, the API already returns filtered data
    if (props.planTypeId) {
      result = plansQuery.data || [];
    } else {
      // When no planTypeId, filter by ministry only
      result = ArrayHelper.getAll(plansQuery.data || [], "ministryId", props.ministry.id);
    }
    if (!showPast) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      result = result.filter(p => {
        if (!p.serviceDate) return true;
        const d = new Date(p.serviceDate);
        d.setHours(0, 0, 0, 0);
        return d >= today;
      });
    }
    return result;
  }, [plansQuery.data, props.ministry.id, props.planTypeId, showPast]);

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
        ministryId={props.ministry.id}
        planTypeId={props.planTypeId}
        plans={plans}
        onSave={handleUpdated}
        onCancel={() => setShowBulkSchedule(false)}
      />
    );
  }

  if (showLessonSchedule && canEdit) {
    return (
      <LessonScheduleEdit
        ministryId={props.ministry.id}
        planTypeId={props.planTypeId}
        plans={plans}
        onSave={handleUpdated}
        onCancel={() => setShowLessonSchedule(false)}
      />
    );
  }

  if (plan && canEdit) {
    return <PlanEdit plan={plan} plans={plans} updatedFunction={handleUpdated} />;
  }

  if (plansQuery.isLoading) {
    return <Loading />;
  }

  const hasPastPlans = !showPast && plans.length === 0 && (plansQuery.data || []).length > 0;

  if (plans.length === 0 && !hasPastPlans) {
    return (
      <Box>
        <Paper
          sx={{
            p: 6,
            textAlign: "center",
            backgroundColor: "var(--bg-sub)",
            border: "1px dashed",
            borderColor: "var(--border-main)",
            borderRadius: 2,
            mb: 3
          }}>
          <EventNoteIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {Locale.label("plans.planList.noPlans")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {Locale.label("plans.planList.createFirst")}
          </Typography>
          {canEdit && (
            <Stack direction="row" spacing={2} justifyContent="center">
              <Button
                variant="contained"
                size="large"
                startIcon={<AddIcon />}
                onClick={addPlan}
                data-testid="add-plan-button"
                sx={{
                  fontSize: "1rem",
                  py: 1.5,
                  px: 3
                }}>
                {Locale.label("plans.planList.createPlan")}
              </Button>
              <Button
                variant="contained"
                size="large"
                startIcon={<MenuBookIcon />}
                endIcon={<ArrowDropDownIcon />}
                onClick={(e) => setLessonMenuAnchor(e.currentTarget)}
                sx={{
                  fontSize: "1rem",
                  py: 1.5,
                  px: 3
                }}>
                {Locale.label("plans.planList.scheduleLesson") || "Schedule Lesson"}
              </Button>
            </Stack>
          )}
        </Paper>

        <Menu
          anchorEl={lessonMenuAnchor}
          open={Boolean(lessonMenuAnchor)}
          onClose={() => setLessonMenuAnchor(null)}
        >
          <MenuItem onClick={() => { setLessonMenuAnchor(null); handleScheduleLesson(); }}>
            <ListItemIcon><MenuBookIcon fontSize="small" /></ListItemIcon>
            <ListItemText>{Locale.label("plans.planList.scheduleLesson") || "Schedule Lesson"}</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { setLessonMenuAnchor(null); setShowBulkSchedule(true); }}>
            <ListItemIcon><DateRangeIcon fontSize="small" /></ListItemIcon>
            <ListItemText>{Locale.label("plans.planList.bulkSchedule") || "Bulk Schedule"}</ListItemText>
          </MenuItem>
        </Menu>
      </Box>
    );
  }

  return (
    <Box sx={{ position: "relative" }}>
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap spacing={1} sx={{ mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <AssignmentIcon sx={{ color: "primary.main" }} />
            <Typography variant="h5" sx={{ fontWeight: 600, color: "text.primary" }}>
              {Locale.label("plans.planList.plans")}
            </Typography>
            <FormControlLabel
              control={<Switch size="small" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} />}
              label={<Stack direction="row" alignItems="center" spacing={0.5}><HistoryIcon fontSize="small" /><Typography variant="body2">Show Past</Typography></Stack>}
              sx={{ ml: 2 }}
            />
          </Stack>
          {canEdit && (
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                size="medium"
                startIcon={<AddIcon />}
                onClick={addPlan}
                data-testid="add-plan-button">
                {Locale.label("plans.planList.newPlan")}
              </Button>
              <Button
                variant="contained"
                size="medium"
                startIcon={<MenuBookIcon />}
                endIcon={<ArrowDropDownIcon />}
                onClick={(e) => setLessonMenuAnchor(e.currentTarget)}>
                {Locale.label("plans.planList.scheduleLesson") || "Schedule Lesson"}
              </Button>
            </Stack>
          )}
        </Stack>
      </Box>

      {hasPastPlans && (
        <Paper
          sx={{
            p: 4,
            textAlign: "center",
            backgroundColor: "var(--bg-sub)",
            border: "1px dashed",
            borderColor: "var(--border-main)",
            borderRadius: 2,
            mb: 3
          }}>
          <EventNoteIcon sx={{ fontSize: 48, color: "text.secondary", mb: 1 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Upcoming Plans
          </Typography>
          <Typography variant="body2" color="text.secondary">
            There are no plans scheduled for today or later. Use the "Show Past" toggle above to view past plans.
          </Typography>
        </Paper>
      )}

      <Stack spacing={2} sx={{ mb: 4 }}>
        {plans.map((p) => (
          <Card
            key={p.id}
            sx={{
              transition: "all 0.2s ease-in-out",
              border: "1px solid",
              borderColor: "var(--border-light)",
              borderRadius: 2,
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: 3,
                borderColor: "primary.main"
              }
            }}>
            <CardContent sx={{ pb: "16px !important" }}>
              <Stack direction="row" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" useFlexGap spacing={1}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ flex: 1, minWidth: 0 }}>
                  <Avatar
                    sx={{
                      bgcolor: "primary.main",
                      width: 48,
                      height: 48,
                      flexShrink: 0
                    }}>
                    <CalendarIcon />
                  </Avatar>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="h6"
                      component={Link}
                      to={`/serving/plans/${p.id}`}
                      sx={{
                        fontWeight: 600,
                        color: "primary.main",
                        textDecoration: "none",
                        fontSize: "1.1rem",
                        "&:hover": { textDecoration: "underline" },
                        display: "block",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}>
                      {p.name}
                    </Typography>

                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                      {p.serviceDate && (
                        <Chip
                          icon={<CalendarIcon />}
                          label={DateHelper.formatHtml5Date(p.serviceDate)}
                          variant="outlined"
                          size="small"
                          sx={{
                            color: "text.secondary",
                            borderColor: "var(--border-main)",
                            fontSize: "0.75rem"
                          }}
                        />
                      )}
                      {p.serviceOrder && (
                        <Chip
                          label={Locale.label("plans.planList.serviceOrder")}
                          variant="outlined"
                          size="small"
                          sx={{
                            color: "success.main",
                            borderColor: "success.main",
                            fontSize: "0.75rem"
                          }}
                        />
                      )}
                    </Stack>
                  </Box>
                </Stack>

                {canEdit && (
                  <Box sx={{ flexShrink: 0 }}>
                    <Button
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => setPlan(p)}
                      variant="outlined"
                      sx={{
                        color: "primary.main",
                        borderColor: "primary.main",
                        whiteSpace: "nowrap",
                        "&:hover": {
                          backgroundColor: "primary.light",
                          borderColor: "primary.dark"
                        }
                      }}>
                      {Locale.label("common.edit")}
                    </Button>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Menu
        anchorEl={lessonMenuAnchor}
        open={Boolean(lessonMenuAnchor)}
        onClose={() => setLessonMenuAnchor(null)}
      >
        <MenuItem onClick={() => { setLessonMenuAnchor(null); handleScheduleLesson(); }}>
          <ListItemIcon><MenuBookIcon fontSize="small" /></ListItemIcon>
          <ListItemText>{Locale.label("plans.planList.scheduleLesson") || "Schedule Lesson"}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { setLessonMenuAnchor(null); setShowBulkSchedule(true); }}>
          <ListItemIcon><DateRangeIcon fontSize="small" /></ListItemIcon>
          <ListItemText>{Locale.label("plans.planList.bulkSchedule") || "Bulk Schedule"}</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
});
