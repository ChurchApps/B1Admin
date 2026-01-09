import React, { memo, useCallback, useMemo } from "react";
import {
  Grid, Typography, Card, CardContent, Stack, Box, Chip, Button, Paper, Divider 
} from "@mui/material";
import { type GroupMemberInterface, type TaskInterface } from "@churchapps/helpers";
import { ArrayHelper, DateHelper, Locale, UserHelper, Loading } from "@churchapps/apphelper";
import { Link } from "react-router-dom";
import { NewTask } from "./";
import UserContext from "../../../UserContext";
import { useQuery } from "@tanstack/react-query";
import {
  Assignment as TaskIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  CalendarToday as CalendarIcon,
  CheckCircle as CompletedIcon,
  RadioButtonUnchecked as OpenIcon,
  Add as AddIcon,
  AssignmentInd as AssignedIcon,
  AssignmentTurnedIn as CreatedIcon,
  CheckBoxOutlined as OpenTasksIcon,
  CheckBox as ClosedTasksIcon,
} from "@mui/icons-material";

interface Props {
  compact?: boolean;
  status: string;
  onStatusChange?: (status: string) => void;
}

export const TaskList = memo((props: Props) => {
  const [showAdd, setShowAdd] = React.useState(false);
  const context = React.useContext(UserContext);

  // React Query hooks for data fetching
  const tasks = useQuery<TaskInterface[]>({
    queryKey: props.status === Locale.label("tasks.taskPage.closed") ? ["/tasks/closed", "DoingApi"] : ["/tasks", "DoingApi"],
    placeholderData: [],
  });

  const groupMembers = useQuery<GroupMemberInterface[]>({
    queryKey: ["/groupmembers?personId=" + UserHelper.person?.id, "MembershipApi"],
    enabled: !!UserHelper.person?.id,
    placeholderData: [],
  });

  const groupIds = useMemo(() => {
    if (groupMembers.data?.length > 0) {
      return ArrayHelper.getIds(groupMembers.data, "groupId");
    }
    return [];
  }, [groupMembers.data]);

  const groupTasks = useQuery<TaskInterface[]>({
    queryKey: ["/tasks/loadForGroups", "DoingApi", groupIds, props.status],
    enabled: groupIds.length > 0,
    placeholderData: [],
    queryFn: async () => {
      if (groupIds.length === 0) return [];
      const { ApiHelper } = await import("@churchapps/apphelper");
      return ApiHelper.post("/tasks/loadForGroups", { groupIds, status: props.status }, "DoingApi");
    },
  });

  const editContent = (
    <Button
      variant="contained"
      size="small"
      startIcon={<AddIcon />}
      onClick={() => setShowAdd(true)}
      data-testid="add-task-button"
      aria-label="Add task"
      sx={{
        borderRadius: 2,
        textTransform: "none",
        fontWeight: 600,
      }}>
      {Locale.label("tasks.taskList.addTask")}
    </Button>
  );

  // Refetch function for all queries
  const refetch = useCallback(() => {
    tasks.refetch();
    groupMembers.refetch();
    groupTasks.refetch();
  }, [tasks, groupMembers, groupTasks]);

  const getTask = useCallback(
    (task: TaskInterface) => (
      <Box
        key={task.id}
        sx={{
          mb: 2,
          p: 2,
          transition: "all 0.2s ease-in-out",
          borderRadius: 2,
          border: "1px solid",
          borderColor: "grey.300",
          backgroundColor: "grey.50",
          "&:hover": {
            backgroundColor: "grey.100",
            borderColor: "primary.main",
          },
          "&:last-child": { mb: 0 },
        }}>
        <Stack spacing={2}>
          {/* Task Header */}
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 2,
            }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="h6"
                component={Link}
                to={`/serving/tasks/${task.id}`}
                sx={{
                  fontWeight: 600,
                  color: "primary.main",
                  textDecoration: "none",
                  fontSize: "1.1rem",
                  wordBreak: "break-word",
                  "&:hover": { textDecoration: "underline" },
                }}>
                {task.title}
              </Typography>

              <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
                <CalendarIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                <Typography variant="caption" color="text.secondary">
                  #{task.taskNumber} {Locale.label("tasks.taskPage.opened")} {DateHelper.getDisplayDuration(DateHelper.toDate(task.dateCreated))} {Locale.label("tasks.taskPage.ago")}{" "}
                  {Locale.label("tasks.taskPage.by")} {task.createdByLabel}
                </Typography>
              </Stack>
            </Box>

            <Chip
              icon={task.status === "Open" ? <OpenIcon /> : <CompletedIcon />}
              label={task.status}
              size="small"
              sx={{
                backgroundColor: task.status === "Open" ? "warning.light" : "success.light",
                color: task.status === "Open" ? "warning.dark" : "success.dark",
                fontWeight: 600,
                flexShrink: 0,
              }}
            />
          </Box>

          {/* Task Details */}
          {!props.compact && (
            <>
              <Divider />
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <GroupIcon sx={{ fontSize: 18, color: "secondary.main" }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {Locale.label("tasks.taskList.associatedWith")}:
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 3 }}>
                    {task.associatedWithLabel || Locale.label("tasks.taskList.notSpecified")}
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <PersonIcon sx={{ fontSize: 18, color: "info.main" }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {Locale.label("tasks.taskList.assignedTo")}:
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 3 }}>
                    {task.assignedToLabel || Locale.label("tasks.taskList.unassigned")}
                  </Typography>
                </Grid>
              </Grid>
            </>
          )}
        </Stack>
      </Box>
    ),
    [props.compact]
  );

  const getSectionHeader = useCallback(
    (title: string, icon: React.ReactNode, count: number) => (
      <Box sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          {icon}
          <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
            {title}
          </Typography>
          <Chip label={count} size="small" color="primary" sx={{ fontWeight: 600, fontSize: "0.75rem" }} />
        </Stack>
      </Box>
    ),
    []
  );

  const assignedToMyGroups = useMemo(() => {
    if (groupMembers.data?.length > 0) {
      const memberGroupIds = ArrayHelper.getIds(groupMembers.data, "groupId");
      return groupTasks.data?.length > 0 ? ArrayHelper.getAllArray(groupTasks.data, "assignedToId", memberGroupIds) : [];
    }
    return [];
  }, [groupMembers.data, groupTasks.data]);

  const assignedToMe = useMemo(() => {
    return tasks.data?.length > 0 ? ArrayHelper.getAll(tasks.data, "assignedToId", context.person?.id) : [];
  }, [tasks.data, context.person?.id]);

  const createdByMe = useMemo(() => {
    return tasks.data?.length > 0 ? ArrayHelper.getAll(tasks.data, "createdById", context.person?.id) : [];
  }, [tasks.data, context.person?.id]);

  const getAssignedToMyGroups = () => {
    if (assignedToMyGroups.length === 0) return null;
    return (
      <Box sx={{ mb: 4 }}>
        {getSectionHeader(Locale.label("tasks.taskList.assignGroup"), <GroupIcon />, assignedToMyGroups.length)}
        <Stack spacing={2}>{assignedToMyGroups.map((t) => getTask(t))}</Stack>
      </Box>
    );
  };

  const getAssignedToMe = () => {
    if (assignedToMe.length === 0) return null;
    return (
      <Box sx={{ mb: 4 }}>
        {getSectionHeader(Locale.label("tasks.taskList.assignMe"), <AssignedIcon />, assignedToMe.length)}
        <Stack spacing={2}>{assignedToMe.map((t) => getTask(t))}</Stack>
      </Box>
    );
  };

  const getCreatedByMe = () => {
    if (createdByMe.length === 0) return null;
    return (
      <Box sx={{ mb: 4 }}>
        {getSectionHeader(Locale.label("tasks.taskList.reqMe"), <CreatedIcon />, createdByMe.length)}
        <Stack spacing={2}>{createdByMe.map((t) => getTask(t))}</Stack>
      </Box>
    );
  };

  const hasAnyTasks = assignedToMe.length > 0 || assignedToMyGroups.length > 0 || createdByMe.length > 0;

  // Show loading state if any query is loading
  if (tasks.isLoading || groupMembers.isLoading) {
    return (
      <Card
        sx={{
          borderRadius: 2,
          border: "1px solid",
          borderColor: "grey.200",
        }}>
        <CardContent>
          <Loading />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {showAdd && (
        <NewTask
          compact={props.compact}
          onCancel={() => {
            setShowAdd(false);
          }}
          onSave={() => {
            refetch();
            setShowAdd(false);
          }}
        />
      )}

      <Card
        sx={{
          borderRadius: 2,
          border: "1px solid",
          borderColor: "grey.200",
        }}>
        <CardContent>
          {/* Header */}
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <TaskIcon sx={{ color: "primary.main" }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
                {Locale.label("tasks.taskList.tasks")}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              {props.onStatusChange &&
                (props.status === "Open" ? (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ClosedTasksIcon />}
                    onClick={() => props.onStatusChange("Closed")}
                    data-testid="show-closed-tasks-button"
                    aria-label="Show closed tasks"
                    sx={{
                      textTransform: "none",
                      fontWeight: 600,
                    }}>
                    {Locale.label("tasks.tasksPage.showClosed")}
                  </Button>
                ) : (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<OpenTasksIcon />}
                    onClick={() => props.onStatusChange("Open")}
                    data-testid="show-open-tasks-button"
                    aria-label="Show open tasks"
                    sx={{
                      textTransform: "none",
                      fontWeight: 600,
                    }}>
                    {Locale.label("tasks.tasksPage.showOpen")}
                  </Button>
                ))}
              {editContent}
            </Stack>
          </Stack>

          {/* Content */}
          {hasAnyTasks ? (
            <Stack spacing={4}>
              {getAssignedToMe()}
              {getAssignedToMyGroups()}
              {getCreatedByMe()}
            </Stack>
          ) : (
            <Paper
              sx={{
                p: 4,
                textAlign: "center",
                backgroundColor: "grey.50",
                border: "1px dashed",
                borderColor: "grey.300",
              }}>
              <TaskIcon sx={{ fontSize: 48, color: "grey.400", mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                {Locale.label("tasks.taskList.noTasks")}
              </Typography>
            </Paper>
          )}
        </CardContent>
      </Card>
    </>
  );
});
