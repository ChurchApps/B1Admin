import React, { memo, useCallback, useMemo } from "react";
import { Grid, Typography, Stack, Box, Chip, Button, Divider } from "@mui/material";
import { EmptyState } from "../../../components/ui/EmptyState";
import { SectionHeading } from "../../../components/ui/SectionHeading";
import { type GroupMemberInterface, type TaskInterface } from "@churchapps/helpers";
import { ApiHelper, ArrayHelper, DateHelper, Locale, UserHelper, Loading } from "@churchapps/apphelper";
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
  CheckBox as ClosedTasksIcon
} from "@mui/icons-material";

interface Props {
  compact?: boolean;
  status: string;
  onStatusChange?: (status: string) => void;
}

export const TaskList = memo((props: Props) => {
  const [showAdd, setShowAdd] = React.useState(false);
  const context = React.useContext(UserContext);

  const tasks = useQuery<TaskInterface[]>({
    queryKey: props.status === Locale.label("tasks.taskPage.closed") ? ["/tasks/closed", "DoingApi"] : ["/tasks", "DoingApi"],
    placeholderData: []
  });

  const groupMembers = useQuery<GroupMemberInterface[]>({
    queryKey: ["/groupmembers?personId=" + UserHelper.person?.id, "MembershipApi"],
    enabled: !!UserHelper.person?.id,
    placeholderData: []
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
    queryFn: () => ApiHelper.post("/tasks/loadForGroups", { groupIds, status: props.status }, "DoingApi")
  });

  const editContent = (
    <Button
      variant="contained"
      size="small"
      startIcon={<AddIcon />}
      onClick={() => setShowAdd(true)}
      data-testid="add-task-button"
      aria-label={Locale.label("tasks.taskList.addTaskAria")}
      sx={{ fontWeight: 600 }}>
      {Locale.label("tasks.taskList.addTask")}
    </Button>
  );

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
          borderColor: "divider",
          backgroundColor: "background.subtle",
          "&:hover": {
            backgroundColor: "action.hover",
            borderColor: "primary.main"
          },
          "&:last-child": { mb: 0 }
        }}>
        <Stack spacing={2}>
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 2
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
                  "&:hover": { textDecoration: "underline" }
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
                flexShrink: 0
              }}
            />
          </Box>

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
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        {icon}
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "text.primary" }}>
          {title}
        </Typography>
        <Chip label={count} size="small" color="primary" sx={{ fontWeight: 600, fontSize: "0.75rem" }} />
      </Stack>
    ),
    []
  );

  const sections = useMemo(() => {
    const assignedToMe = tasks.data?.length > 0 ? ArrayHelper.getAll(tasks.data, "assignedToId", context.person?.id) : [];
    const createdByMe = tasks.data?.length > 0 ? ArrayHelper.getAll(tasks.data, "createdById", context.person?.id) : [];
    const assignedToMyGroups = groupIds.length > 0 && groupTasks.data?.length > 0
      ? ArrayHelper.getAllArray(groupTasks.data, "assignedToId", groupIds)
      : [];
    const sectionIcon = { fontSize: "small" as const, sx: { color: "text.secondary" } };
    return [
      { key: "assignMe", label: Locale.label("tasks.taskList.assignMe"), icon: <AssignedIcon {...sectionIcon} />, items: assignedToMe },
      { key: "assignGroup", label: Locale.label("tasks.taskList.assignGroup"), icon: <GroupIcon {...sectionIcon} />, items: assignedToMyGroups },
      { key: "reqMe", label: Locale.label("tasks.taskList.reqMe"), icon: <CreatedIcon {...sectionIcon} />, items: createdByMe }
    ];
  }, [tasks.data, groupTasks.data, groupIds, context.person?.id]);

  const hasAnyTasks = sections.some((s) => s.items.length > 0);

  const toggle = props.onStatusChange && (props.status === "Open"
    ? { next: "Closed", icon: <ClosedTasksIcon />, label: Locale.label("tasks.tasksPage.showClosed"), aria: Locale.label("tasks.taskList.showClosedTasksAria"), testId: "show-closed-tasks-button" }
    : { next: "Open", icon: <OpenTasksIcon />, label: Locale.label("tasks.tasksPage.showOpen"), aria: Locale.label("tasks.taskList.showOpenTasksAria"), testId: "show-open-tasks-button" });

  const headerAction = (
    <Stack direction="row" spacing={1} alignItems="center">
      {toggle && (
        <Button
          variant="outlined"
          size="small"
          startIcon={toggle.icon}
          onClick={() => props.onStatusChange(toggle.next)}
          data-testid={toggle.testId}
          aria-label={toggle.aria}
          sx={{ fontWeight: 600 }}>
          {toggle.label}
        </Button>
      )}
      {editContent}
    </Stack>
  );

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

      <Box>
        <SectionHeading title={Locale.label("tasks.taskList.tasks")} action={headerAction} />

        {tasks.isLoading || groupMembers.isLoading ? (
          <Loading />
        ) : hasAnyTasks ? (
          <Stack spacing={4}>
            {sections.filter((s) => s.items.length > 0).map((s) => (
              <Box key={s.key}>
                {getSectionHeader(s.label, s.icon, s.items.length)}
                <Stack spacing={2}>{s.items.map((t) => getTask(t))}</Stack>
              </Box>
            ))}
          </Stack>
        ) : (
          <EmptyState icon={<TaskIcon />} title={Locale.label("tasks.taskList.noTasks")} />
        )}
      </Box>
    </>
  );
});
