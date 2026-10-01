import React, { memo, useCallback, useMemo } from "react";
import { Grid, Typography, Stack, Box, Button, Link as MuiLink } from "@mui/material";
import { AddBar, CardWithHeader, PillTabs, StatusBadge, Surface } from "../../../components/ui";
import { type GroupMemberInterface, type TaskInterface } from "@churchapps/helpers";
import { ApiHelper, ArrayHelper, DateHelper, Locale, UserHelper, Loading } from "@churchapps/apphelper";
import { Link } from "react-router-dom";
import { NewTask } from "./";
import UserContext from "../../../UserContext";
import { useQuery } from "@tanstack/react-query";
import { Assignment as TaskIcon, Add as AddIcon } from "@mui/icons-material";

interface Props {
  compact?: boolean;
  status: string;
  /** Page layout: no card, add at the bottom. */
  plain?: boolean;
  onStatusChange?: (status: string) => void;
}

export const TaskList = memo((props: Props) => {
  const [showAdd, setShowAdd] = React.useState(false);
  const [tab, setTab] = React.useState("assigned");
  const context = React.useContext(UserContext);

  const tasks = useQuery<TaskInterface[]>({
    queryKey: props.status === "Closed" ? ["/tasks/closed", "DoingApi"] : ["/tasks", "DoingApi"],
    placeholderData: []
  });

  const groupMembers = useQuery<GroupMemberInterface[]>({
    queryKey: ["/groupmembers?personId=" + UserHelper.person?.id, "MembershipApi"],
    enabled: !!UserHelper.person?.id,
    placeholderData: []
  });

  const groupIds = useMemo(() => {
    if (groupMembers.data && groupMembers.data.length > 0) {
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
      return ApiHelper.post("/tasks/loadForGroups", { groupIds, status: props.status }, "DoingApi");
    }
  });

  const refetch = useCallback(() => {
    tasks.refetch();
    groupMembers.refetch();
    groupTasks.refetch();
  }, [tasks, groupMembers, groupTasks]);

  const getTask = useCallback(
    (task: TaskInterface) => (
      <Box key={task.id} sx={{ py: 2, borderTop: 1, borderColor: "divider", "&:first-of-type": { borderTop: 0, pt: 0 } }}>
        <Stack spacing={1}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <MuiLink component={Link} to={`/serving/tasks/${task.id}`} underline="hover" sx={{ fontWeight: 600, wordBreak: "break-word" }}>
                {task.title}
              </MuiLink>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                #{task.taskNumber} {Locale.label("tasks.taskPage.opened")} {DateHelper.getDisplayDuration(DateHelper.toDate(task.dateCreated))} {Locale.label("tasks.taskPage.ago")}{" "}
                {Locale.label("tasks.taskPage.by")} {task.createdByLabel}
              </Typography>
            </Box>
            <StatusBadge tone={task.status === "Open" ? "warning" : "success"}>{task.status}</StatusBadge>
          </Stack>

          {!props.compact && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{Locale.label("tasks.taskList.associatedWith")}:</Typography>
                <Typography variant="body2" color="text.secondary">
                  {task.associatedWithLabel || Locale.label("tasks.taskList.notSpecified")}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{Locale.label("tasks.taskList.assignedTo")}:</Typography>
                <Typography variant="body2" color="text.secondary">
                  {task.assignedToLabel || Locale.label("tasks.taskList.unassigned")}
                </Typography>
              </Grid>
            </Grid>
          )}
        </Stack>
      </Box>
    ),
    [props.compact]
  );

  const assignedToMyGroups = useMemo(() => {
    if (groupMembers.data && groupMembers.data.length > 0) {
      const memberGroupIds = ArrayHelper.getIds(groupMembers.data, "groupId");
      return groupTasks.data && groupTasks.data.length > 0 ? ArrayHelper.getAllArray(groupTasks.data, "assignedToId", memberGroupIds) : [];
    }
    return [];
  }, [groupMembers.data, groupTasks.data]);

  const assignedToMe = useMemo(() => {
    return tasks.data && tasks.data.length > 0 ? ArrayHelper.getAll(tasks.data, "assignedToId", context?.person?.id) : [];
  }, [tasks.data, context?.person?.id]);

  const createdByMe = useMemo(() => {
    return tasks.data && tasks.data.length > 0 ? ArrayHelper.getAll(tasks.data, "createdById", context?.person?.id) : [];
  }, [tasks.data, context?.person?.id]);

  const hasAnyTasks = assignedToMe.length > 0 || assignedToMyGroups.length > 0 || createdByMe.length > 0;
  const active = tab === "groups" ? assignedToMyGroups : tab === "created" ? createdByMe : assignedToMe;

  if (tasks.isLoading || groupMembers.isLoading) {
    return props.plain ? <Loading /> : <Surface><Loading /></Surface>;
  }

  const noTasks = <Typography color="text.secondary">{Locale.label("tasks.taskList.noTasks")}</Typography>;
  const countLabel = (text: string, count: number) => `${text} ${count}`;

  const statusPills = props.onStatusChange && (
    <PillTabs
      aria-label={Locale.label("tasks.taskList.status", "Task status")}
      value={props.status === "Open" ? "Open" : "Closed"}
      onChange={(v) => props.onStatusChange?.(v)}
      options={[
        { value: "Open", label: Locale.label("tasks.taskPage.open"), "data-testid": "show-open-tasks-button" },
        { value: "Closed", label: Locale.label("tasks.taskPage.closed"), "data-testid": "show-closed-tasks-button" }
      ]}
    />
  );

  const filterPills = (
    <PillTabs
      aria-label={Locale.label("tasks.taskList.tasks")}
      value={tab}
      onChange={setTab}
      options={[
        { value: "assigned", label: countLabel(Locale.label("tasks.taskList.assignMe"), assignedToMe.length), "data-testid": "tasklist-tab-assigned" },
        { value: "groups", label: countLabel(Locale.label("tasks.taskList.assignGroup"), assignedToMyGroups.length), "data-testid": "tasklist-tab-groups" },
        { value: "created", label: countLabel(Locale.label("tasks.taskList.reqMe"), createdByMe.length), "data-testid": "tasklist-tab-created" }
      ]}
    />
  );

  const list = props.compact
    ? (active.length > 0 ? <Box>{active.map((t) => getTask(t))}</Box> : noTasks)
    : hasAnyTasks
      ? <Box>{[...assignedToMe, ...assignedToMyGroups, ...createdByMe].map((t) => getTask(t))}</Box>
      : noTasks;

  const newTask = (
    <NewTask
      compact={props.compact}
      onCancel={() => setShowAdd(false)}
      onSave={() => { refetch(); setShowAdd(false); }}
    />
  );

  const openAdd = () => {
    setShowAdd(true);
    if (props.plain) setTimeout(() => document.getElementById("add-task-bar")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  const addButton = () => (
    <Button
      variant="contained"
      startIcon={<AddIcon />}
      onClick={openAdd}
      data-testid="add-task-button"
      aria-label={Locale.label("tasks.taskList.addTaskAria")}>
      {Locale.label("tasks.taskList.addTask")}
    </Button>
  );

  if (props.plain) {
    return (
      <Box data-testid="task-list">
        <Stack spacing={1.5} sx={{ mb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" useFlexGap flexWrap="wrap">
            {statusPills || <span />}
            {addButton()}
          </Stack>
          {props.compact && filterPills}
        </Stack>
        {list}
        {showAdd && <AddBar data-testid="add-task-bar" sx={{ scrollMarginTop: 24 }}><Box id="add-task-bar">{newTask}</Box></AddBar>}
      </Box>
    );
  }

  return (
    <>
      {showAdd && newTask}
      <Box sx={{ mt: showAdd ? 3 : 0 }}>
        <CardWithHeader
          title={Locale.label("tasks.taskList.tasks")}
          icon={<TaskIcon />}
          actions={addButton()}>
          {statusPills && <Box sx={{ mb: 1.5 }}>{statusPills}</Box>}
          {props.compact && <Box sx={{ mb: 2 }}>{filterPills}</Box>}
          {list}
        </CardWithHeader>
      </Box>
    </>
  );
});
