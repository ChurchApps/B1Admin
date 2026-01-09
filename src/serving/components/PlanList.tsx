import React, { useCallback, memo } from "react";
import {
  Box, Card, CardContent, Typography, Stack, Paper, Chip, Avatar, Button, ButtonGroup, Menu, MenuItem
} from "@mui/material";
import { Add as AddIcon, Assignment as AssignmentIcon, CalendarMonth as CalendarIcon, Edit as EditIcon, EventNote as EventNoteIcon, ArrowDropDown as ArrowDropDownIcon, MenuBook as MenuBookIcon } from "@mui/icons-material";
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
  const [addMenuAnchor, setAddMenuAnchor] = React.useState<null | HTMLElement>(null);
  const canEdit = UserHelper.checkAccess(Permissions.membershipApi.plans.edit);

  const plansQuery = useQuery<PlanInterface[]>({
    queryKey: props.planTypeId ? [`/plans/types/${props.planTypeId}`, "DoingApi"] : ["/plans", "DoingApi"],
    placeholderData: [],
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
      serviceOrder: true,
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
    setAddMenuAnchor(null);
    setShowLessonSchedule(true);
  }, []);

  const handleAddPlanFromMenu = useCallback(() => {
    setAddMenuAnchor(null);
    addPlan();
  }, [addPlan]);

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
            backgroundColor: "grey.50",
            border: "1px dashed",
            borderColor: "grey.300",
            borderRadius: 2,
            mb: 3,
          }}>
          <EventNoteIcon sx={{ fontSize: 64, color: "grey.400", mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {Locale.label("plans.planList.noPlans")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {Locale.label("plans.planList.createFirst")}
          </Typography>
          {canEdit && (
            <>
              <ButtonGroup variant="contained" size="large">
                <Button
                  startIcon={<AddIcon />}
                  onClick={addPlan}
                  data-testid="add-plan-button"
                  sx={{
                    fontSize: "1rem",
                    py: 1.5,
                    px: 3,
                  }}>
                  {Locale.label("plans.planList.createPlan")}
                </Button>
                <Button
                  onClick={(e) => setAddMenuAnchor(e.currentTarget)}
                  sx={{ px: 1 }}
                >
                  <ArrowDropDownIcon />
                </Button>
              </ButtonGroup>
              <Menu
                anchorEl={addMenuAnchor}
                open={Boolean(addMenuAnchor)}
                onClose={() => setAddMenuAnchor(null)}
              >
                <MenuItem onClick={handleAddPlanFromMenu}>
                  <AddIcon sx={{ mr: 1 }} /> {Locale.label("plans.planList.createPlan")}
                </MenuItem>
                <MenuItem onClick={handleScheduleLesson}>
                  <MenuBookIcon sx={{ mr: 1 }} /> {Locale.label("plans.planList.scheduleLesson") || "Schedule Lesson"}
                </MenuItem>
              </Menu>
            </>
          )}
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ position: "relative" }}>
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <AssignmentIcon sx={{ color: "primary.main" }} />
            <Typography variant="h5" sx={{ fontWeight: 600, color: "text.primary" }}>
              {Locale.label("plans.planList.plans")}
            </Typography>
          </Stack>
          {canEdit && (
            <>
              <ButtonGroup variant="contained" size="medium">
                <Button
                  startIcon={<AddIcon />}
                  onClick={addPlan}
                  data-testid="add-plan-button">
                  {Locale.label("plans.planList.newPlan")}
                </Button>
                <Button
                  size="small"
                  onClick={(e) => setAddMenuAnchor(e.currentTarget)}
                  sx={{ px: 0.5 }}
                >
                  <ArrowDropDownIcon />
                </Button>
              </ButtonGroup>
              <Menu
                anchorEl={addMenuAnchor}
                open={Boolean(addMenuAnchor)}
                onClose={() => setAddMenuAnchor(null)}
              >
                <MenuItem onClick={handleAddPlanFromMenu}>
                  <AddIcon sx={{ mr: 1 }} /> {Locale.label("plans.planList.newPlan")}
                </MenuItem>
                <MenuItem onClick={handleScheduleLesson}>
                  <MenuBookIcon sx={{ mr: 1 }} /> {Locale.label("plans.planList.scheduleLesson") || "Schedule Lesson"}
                </MenuItem>
              </Menu>
            </>
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
              borderColor: "grey.200",
              borderRadius: 2,
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: 3,
                borderColor: "primary.main",
              },
            }}>
            <CardContent sx={{ pb: "16px !important" }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Stack direction="row" alignItems="center" spacing={2} sx={{ flex: 1, minWidth: 0 }}>
                  <Avatar
                    sx={{
                      bgcolor: "primary.main",
                      width: 48,
                      height: 48,
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
                        whiteSpace: "nowrap",
                      }}>
                      {p.name}
                    </Typography>

                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                      {p.serviceDate && (
                        <Chip
                          icon={<CalendarIcon />}
                          label={DateHelper.formatHtml5Date(p.serviceDate)}
                          variant="outlined"
                          size="small"
                          sx={{
                            color: "text.secondary",
                            borderColor: "grey.400",
                            fontSize: "0.75rem",
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
                            fontSize: "0.75rem",
                          }}
                        />
                      )}
                    </Stack>
                  </Box>
                </Stack>

                {canEdit && (
                  <Box sx={{ ml: 2 }}>
                    <Button
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => setPlan(p)}
                      variant="outlined"
                      sx={{
                        color: "primary.main",
                        borderColor: "primary.main",
                        "&:hover": {
                          backgroundColor: "primary.light",
                          borderColor: "primary.dark",
                        },
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
