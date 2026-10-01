import React, { memo, useCallback, useMemo } from "react";
import { Box, Link as MuiLink, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { PillTabs, ResultsBar, StatusBadge, tableScrollSx } from "../../../components/ui";
import { type GroupMemberInterface, type TaskInterface } from "@churchapps/helpers";
import { ApiHelper, ArrayHelper, DateHelper, Locale, UserHelper, Loading } from "@churchapps/apphelper";
import { Link } from "react-router-dom";
import { NewTask } from "./";
import UserContext from "../../../UserContext";
import { useQuery } from "@tanstack/react-query";

interface Props {
  status: string;
  onStatusChange: (status: string) => void;
  /** The page's Add Task button opens the inline form at the bottom. */
  adding: boolean;
  onAddClose: () => void;
}

const wideCellSx = { display: { xs: "none", md: "table-cell" } };

export const TaskList = memo((props: Props) => {
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

  const groupIds = useMemo(() => (groupMembers.data && groupMembers.data.length > 0 ? ArrayHelper.getIds(groupMembers.data, "groupId") : []), [groupMembers.data]);

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

  const assignedToMyGroups = useMemo(() => {
    if (groupIds.length === 0 || !groupTasks.data?.length) return [];
    return ArrayHelper.getAllArray(groupTasks.data, "assignedToId", groupIds);
  }, [groupIds, groupTasks.data]);

  const assignedToMe = useMemo(() => (tasks.data?.length ? ArrayHelper.getAll(tasks.data, "assignedToId", context?.person?.id) : []), [tasks.data, context?.person?.id]);
  const createdByMe = useMemo(() => (tasks.data?.length ? ArrayHelper.getAll(tasks.data, "createdById", context?.person?.id) : []), [tasks.data, context?.person?.id]);

  if (tasks.isLoading || groupMembers.isLoading) return <Loading />;

  const active = tab === "groups" ? assignedToMyGroups : tab === "created" ? createdByMe : assignedToMe;
  const countLabel = (text: string, count: number) => `${text} ${count}`;

  const table = active.length === 0
    ? <Typography color="text.secondary">{Locale.label("tasks.taskList.noTasks")}</Typography>
    : (
      <Box sx={tableScrollSx} role="region" aria-label={Locale.label("tasks.taskList.tasks")} tabIndex={0}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{Locale.label("tasks.taskList.task", "Task")}</TableCell>
              <TableCell sx={wideCellSx}>{Locale.label("tasks.taskList.associatedWith")}</TableCell>
              <TableCell sx={wideCellSx}>{Locale.label("tasks.taskList.assignedTo")}</TableCell>
              <TableCell sx={wideCellSx}>{Locale.label("tasks.taskPage.opened")}</TableCell>
              <TableCell align="right">{Locale.label("tasks.taskList.statusColumn", "Status")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {active.map((task) => (
              <TableRow key={task.id} hover>
                <TableCell sx={{ py: 1.5 }}>
                  <MuiLink component={Link} to={`/serving/tasks/${task.id}`} underline="hover" sx={{ fontWeight: 600, wordBreak: "break-word" }}>{task.title}</MuiLink>
                  <Typography variant="body2" color="text.secondary">#{task.taskNumber}</Typography>
                </TableCell>
                <TableCell sx={{ ...wideCellSx, color: "text.secondary" }}>{task.associatedWithLabel || Locale.label("tasks.taskList.notSpecified")}</TableCell>
                <TableCell sx={{ ...wideCellSx, color: "text.secondary" }}>{task.assignedToLabel || Locale.label("tasks.taskList.unassigned")}</TableCell>
                <TableCell sx={{ ...wideCellSx, color: "text.secondary", whiteSpace: "nowrap" }}>
                  {DateHelper.getDisplayDuration(DateHelper.toDate(task.dateCreated))} {Locale.label("tasks.taskPage.ago")}
                  <Typography variant="body2" color="text.secondary">{Locale.label("tasks.taskPage.by")} {task.createdByLabel}</Typography>
                </TableCell>
                <TableCell align="right"><StatusBadge tone={task.status === "Open" ? "warning" : "success"}>{task.status}</StatusBadge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    );

  return (
    <Box data-testid="task-list">
      <Stack spacing={2}>
        <ResultsBar
          end={(
            <PillTabs
              aria-label={Locale.label("tasks.taskList.status", "Task status")}
              value={props.status === "Open" ? "Open" : "Closed"}
              onChange={(v) => props.onStatusChange(v)}
              options={[
                { value: "Open", label: Locale.label("tasks.taskPage.open"), "data-testid": "show-open-tasks-button" },
                { value: "Closed", label: Locale.label("tasks.taskPage.closed"), "data-testid": "show-closed-tasks-button" }
              ]}
            />
          )}>
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
        </ResultsBar>
        {table}
      </Stack>
      {props.adding && (
        <Box id="add-task-bar" data-testid="add-task-bar" sx={{ borderTop: 1, borderColor: "divider", pt: 3, mt: 3, scrollMarginTop: 24 }}>
          <NewTask onCancel={props.onAddClose} onSave={() => { refetch(); props.onAddClose(); }} />
        </Box>
      )}
    </Box>
  );
});
