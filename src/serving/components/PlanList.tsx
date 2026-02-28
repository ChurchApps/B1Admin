import React, { useCallback, memo } from "react";
import { Box, Card, CardContent, Typography, Stack, Paper, Chip, Avatar, Button } from "@mui/material";
import { Add as AddIcon, Assignment as AssignmentIcon, CalendarMonth as CalendarIcon, Edit as EditIcon, EventNote as EventNoteIcon, MenuBook as MenuBookIcon } from "@mui/icons-material";
import { Link } from "react-router-dom";
import { type GroupInterface } from "@churchapps/helpers";
import { type PlanInterface } from "../../helpers";
import { ArrayHelper, DateHelper, Locale, Loading, UserHelper, Permissions } from "@churchapps/apphelper";
import { PlanEdit } from "./PlanEdit";
import { LessonScheduleEdit } from "./LessonScheduleEdit";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "../../queryClient";

interface Props {
  ministry: GroupInterface;
  planTypeId?: string;
}



export const PlanList = memo((props: Props) => {
  const [plan, setPlan] = React.useState<PlanInterface>(null);
  const [showLessonSchedule, setShowLessonSchedule] = React.useState(false);
  const canEdit = UserHelper.checkAccess(Permissions.membershipApi.plans.edit);

  const plansQuery = useQuery<PlanInterface[]>({
    queryKey: props.planTypeId ? [`/plans/types/${props.planTypeId}`, "DoingApi"] : ["/plans", "DoingApi"],
    placeholderData: []
  });

  const plans = React.useMemo(() => {
    // When planTypeId is provided, the API already returns filtered data
    if (props.planTypeId) {
      return plansQuery.data || [];
    }
    // When no planTypeId, filter by ministry only
    return ArrayHelper.getAll(plansQuery.data || [], "ministryId", props.ministry.id);
  }, [plansQuery.data, props.ministry.id, props.planTypeId]);

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

  if (plans.length === 0) {
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
                onClick={handleScheduleLesson}
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
                onClick={handleScheduleLesson}>
                {Locale.label("plans.planList.scheduleLesson") || "Schedule Lesson"}
              </Button>
            </Stack>
          )}
        </Stack>
      </Box>

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
    </Box>
  );
});
