import React, { memo, useCallback, useMemo } from "react";
import { Box, Button } from "@mui/material";
import { type GroupMemberInterface, type TaskInterface } from "@churchapps/helpers";
import { ApiHelper, ArrayHelper, DateHelper, Locale, UserHelper, Loading } from "@churchapps/apphelper";
import { Link } from "react-router-dom";
import { NewTask } from "./";
import UserContext from "../../../UserContext";
import { useQuery } from "@tanstack/react-query";
import { AddBlock, ListPills, Pill, platedColor } from "../../plated";

interface Props {
  compact?: boolean;
  status: string;
  onStatusChange?: (status: string) => void;
}

export const TaskList = memo((props: Props) => {
  const [showAdd, setShowAdd] = React.useState(false);
  const [tab, setTab] = React.useState(0);
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
      <Box
        key={task.id}
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr auto" },
          gap: "8px 18px",
          padding: "11px 0",
          borderTop: `1px solid ${platedColor.line}`
        }}>
        <Box>
          <Link to={`/serving/tasks/${task.id}`} style={{ color: platedColor.ink, fontWeight: 650, fontSize: "1.12rem", textDecoration: "none" }}>
            {task.title}
          </Link>
          <Box sx={{ color: platedColor.mute, fontSize: "0.9rem", mt: "2px" }}>
            #{task.taskNumber} {Locale.label("tasks.taskPage.opened")} {DateHelper.getDisplayDuration(DateHelper.toDate(task.dateCreated))} {Locale.label("tasks.taskPage.ago")} {Locale.label("tasks.taskPage.by")} {task.createdByLabel}
            {!props.compact && task.assignedToLabel ? ` · ${task.assignedToLabel}` : ""}
          </Box>
        </Box>
        <Box sx={{ color: task.status === "Open" ? platedColor.first : platedColor.here, fontSize: "0.88rem" }}>{task.status}</Box>
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
  const active = tab === 0 ? assignedToMe : tab === 1 ? assignedToMyGroups : createdByMe;

  if (tasks.isLoading || groupMembers.isLoading) return <Loading />;

  return (
    <>
      {showAdd && (
        <NewTask
          compact={props.compact}
          onCancel={() => setShowAdd(false)}
          onSave={() => { refetch(); setShowAdd(false); }}
        />
      )}

      <ListPills>
        {props.onStatusChange && (
          <>
            <Pill
              on={props.status === "Open"}
              onClick={() => props.onStatusChange?.("Open")}
              testId="show-open-tasks-button">
              {Locale.label("tasks.taskPage.open")}
            </Pill>
            <Pill
              on={props.status !== "Open"}
              onClick={() => props.onStatusChange?.("Closed")}
              testId="show-closed-tasks-button">
              {Locale.label("tasks.tasksPage.showClosed")}
            </Pill>
          </>
        )}
        <Pill on={tab === 0} onClick={() => setTab(0)} testId="tasklist-tab-assigned">{Locale.label("tasks.taskList.assignMe")} {assignedToMe.length}</Pill>
        <Pill on={tab === 1} onClick={() => setTab(1)} testId="tasklist-tab-groups">{Locale.label("tasks.taskList.assignGroup")} {assignedToMyGroups.length}</Pill>
        <Pill on={tab === 2} onClick={() => setTab(2)} testId="tasklist-tab-created">{Locale.label("tasks.taskList.reqMe")} {createdByMe.length}</Pill>
      </ListPills>

      {props.compact
        ? (active.length > 0 ? active.map((t) => getTask(t)) : <p style={{ color: platedColor.mute }}>{Locale.label("tasks.taskList.noTasks")}</p>)
        : hasAnyTasks
          ? (
            <>
              {assignedToMe.map((t) => getTask(t))}
              {assignedToMyGroups.map((t) => getTask(t))}
              {createdByMe.map((t) => getTask(t))}
            </>
          )
          : <p style={{ color: platedColor.mute }}>{Locale.label("tasks.taskList.noTasks")}</p>}

      {!showAdd && (
        <AddBlock title={Locale.label("tasks.taskList.addTask")}>
          <Button
            onClick={() => setShowAdd(true)}
            data-testid="add-task-button"
            aria-label={Locale.label("tasks.taskList.addTaskAria")}
            sx={{ color: platedColor.accent, fontWeight: 600, textTransform: "none" }}>
            {Locale.label("tasks.taskList.addTask")}
          </Button>
        </AddBlock>
      )}
    </>
  );
});
