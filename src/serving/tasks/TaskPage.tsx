import React, { useContext, useCallback } from "react";
import { Box, Stack, Typography, Button, TextField, IconButton } from "@mui/material";
import { ApiHelper, Notes, DateHelper, type ConversationInterface, Locale, Loading } from "@churchapps/apphelper";
import { type TaskInterface, type UserContextInterface } from "@churchapps/helpers";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { PageContainer, EmptyState, RecordLayout, StatusBadge, TextAction, eyebrowSx, RecordActions } from "../../components/ui";
import { ContentPicker } from "./components/ContentPicker";
import { notifyAssignee } from "./components/taskNotifications";
import UserContext from "../../UserContext";
import { RequestedChanges } from "./components/RequestedChanges";
import { AccountDeletionRequest } from "./components/AccountDeletionRequest";
import { GroupJoinRequestTask } from "./components/GroupJoinRequestTask";
import { TaskReminderEdit } from "./components/TaskReminderEdit";
import { TaskContact } from "./components/TaskContact";
import { canEditCards } from "./workflows/permissions";
import { useConfirmDelete } from "../../hooks";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Assignment as AssignmentIcon, Edit as EditIcon } from "@mui/icons-material";

export const TaskPage = () => {
  const params = useParams();
  const [modalField, setModalField] = React.useState("");
  const context = useContext(UserContext);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [titleDraft, setTitleDraft] = React.useState<string | null>(null);
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  const task = useQuery<TaskInterface>({
    queryKey: ["/tasks/" + params.id, "DoingApi"],
    enabled: !!params.id
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (updatedTask: TaskInterface) => {
      return ApiHelper.post("/tasks", [updatedTask], "DoingApi");
    },
    onSuccess: () => {
      task.refetch();
      queryClient.invalidateQueries({ queryKey: ["/tasks", "DoingApi"] });
      queryClient.invalidateQueries({ queryKey: ["/tasks/closed", "DoingApi"] });
    }
  });

  const handleContentPicked = useCallback(
    (contentType: string, contentId: string, label: string) => {
      if (!task.data) return;
      const t = { ...task.data };
      switch (modalField) {
        case "associatedWith":
          // Empty values clear the association; null (not undefined) so the Api writes NULL.
          t.associatedWithType = (contentId ? contentType : null) as string;
          t.associatedWithId = (contentId || null) as string;
          t.associatedWithLabel = (contentId ? label : null) as string;
          break;
        case "assignedTo":
          t.assignedToType = contentType;
          t.assignedToId = contentId;
          t.assignedToLabel = label;
          break;
      }
      const reassigned = modalField === "assignedTo" && !!t.assignedToId && (t.assignedToId !== task.data.assignedToId || t.assignedToType?.toLowerCase() !== task.data.assignedToType?.toLowerCase());
      updateTaskMutation.mutate(t, {
        onSuccess: () => {
          if (reassigned) notifyAssignee(t, `${Locale.label("tasks.newTask.newAssign")}: ${t.title}`);
        }
      });
      setModalField("");
    },
    [task.data, modalField, updateTaskMutation]
  );

  const handleStatusChange = useCallback(
    (status: string) => {
      if (!task.data) return;
      const t = { ...task.data };
      t.status = status;
      t.dateClosed = status === "Open" ? undefined : new Date();
      updateTaskMutation.mutate(t);
    },
    [task.data, updateTaskMutation]
  );

  const handleDueDateChange = useCallback(
    (val: string) => {
      if (!task.data) return;
      updateTaskMutation.mutate({ ...task.data, dueDate: (val ? new Date(val + "T12:00") : null) as Date });
    },
    [task.data, updateTaskMutation]
  );

  const handleTitleSave = useCallback(() => {
    const title = titleDraft?.trim();
    if (!task.data || !title) return;
    updateTaskMutation.mutate({ ...task.data, title }, { onSuccess: () => setTitleDraft(null) });
  }, [task.data, titleDraft, updateTaskMutation]);

  const handleDelete = useCallback(async () => {
    if (!task.data?.id) return;
    if (!(await confirm(Locale.label("tasks.taskPage.confirmDelete")))) return;
    await ApiHelper.delete("/tasks/" + task.data.id, "DoingApi");
    queryClient.invalidateQueries({ queryKey: ["/tasks", "DoingApi"] });
    queryClient.invalidateQueries({ queryKey: ["/tasks/closed", "DoingApi"] });
    navigate("/serving/tasks");
  }, [task.data, confirm, queryClient, navigate]);

  const handleModalClose = useCallback(() => {
    setModalField("");
  }, []);

  const handleCreateConversation = useCallback(async () => {
    if (!task.data) return;
    const conv: ConversationInterface = {
      allowAnonymousPosts: false,
      contentType: "task",
      contentId: task.data.id,
      title: "Task #" + task.data.id + " Notes",
      visibility: "hidden"
    };
    const result: ConversationInterface[] = await ApiHelper.post("/conversations", [conv], "MessagingApi");
    const t = { ...task.data };
    t.conversationId = result[0].id;
    updateTaskMutation.mutate(t);
    return t.conversationId;
  }, [task.data, updateTaskMutation]);

  if (task.isLoading) return <Loading />;
  if (!task.data?.id) {
    return (
      <PageContainer>
        <EmptyState
          icon={<AssignmentIcon />}
          title={Locale.label("tasks.taskPage.notFound", "Task not found")}
          action={<Button variant="contained" component={RouterLink} to="/serving/tasks">{Locale.label("tasks.myWork.title")}</Button>}
        />
      </PageContainer>
    );
  }

  const open = task.data.status === "Open";
  const canEdit = canEditCards();
  // Same {date, message}[] history workflow cards keep in data; the Api adds reassignment lines.
  const history: { date?: string; message?: string }[] = (() => {
    if (!task.data.data) return [];
    try {
      const parsed = JSON.parse(task.data.data);
      return Array.isArray(parsed?.history) ? parsed.history : [];
    } catch {
      return [];
    }
  })();
  const quiet = { typography: "body2", color: "text.secondary", overflowWrap: "anywhere" } as const;

  const identity = (
    <Box component="aside" data-testid="task-identity" sx={{ minWidth: 0 }}>
      <Typography sx={eyebrowSx}>#{task.data.taskNumber}</Typography>
      {titleDraft === null
        ? (
          <Stack direction="row" spacing={0.5} alignItems="flex-start" sx={{ mt: 0.5 }}>
            <Typography id="page-header-title" variant="h1" component="h1" sx={{ overflowWrap: "anywhere", minWidth: 0 }}>{task.data.title}</Typography>
            {canEdit && <IconButton size="small" onClick={() => setTitleDraft(task.data?.title || "")} aria-label={Locale.label("tasks.taskPage.editTitle")} data-testid="task-edit-title"><EditIcon fontSize="small" /></IconButton>}
          </Stack>
        )
        : (
          <Box sx={{ mt: 0.5 }}>
            <TextField fullWidth size="small" autoFocus value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleTitleSave(); if (e.key === "Escape") setTitleDraft(null); }} inputProps={{ "aria-label": Locale.label("tasks.taskPage.editTitle") }} data-testid="task-title-input" />
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Button size="small" variant="contained" disabled={!titleDraft.trim() || updateTaskMutation.isPending} onClick={handleTitleSave} data-testid="task-title-save">{Locale.label("tasks.taskPage.saveTitle")}</Button>
              <Button size="small" onClick={() => setTitleDraft(null)} data-testid="task-title-cancel">{Locale.label("tasks.taskPage.cancelTitle")}</Button>
            </Stack>
          </Box>
        )}
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
        <StatusBadge tone={open ? "warning" : "success"} data-testid="task-status">{task.data.status}</StatusBadge>
        <Typography sx={quiet}>
          {Locale.label("tasks.taskPage.created")} {DateHelper.prettyDateTime(DateHelper.toDate(task.data.dateCreated))} {Locale.label("tasks.taskPage.by")} {task.data.createdByLabel}
        </Typography>
        {task.data.dateClosed && <Typography sx={quiet} data-testid="task-closed-on">{Locale.label("tasks.taskPage.closedOn")} {DateHelper.prettyDateTime(DateHelper.toDate(task.data.dateClosed))}</Typography>}
      </Stack>
      <RecordActions
        sx={{ mt: 2 }}
        buttons={<>
          <Button variant="contained" onClick={() => handleStatusChange(open ? "Closed" : "Open")} data-testid="task-status-toggle">
            {open ? Locale.label("tasks.taskPage.closeTask", "Close task") : Locale.label("tasks.taskPage.reopenTask", "Reopen task")}
          </Button>
          <Button variant="outlined" onClick={() => setModalField("assignedTo")} aria-label={Locale.label("tasks.taskPage.editAssigned")} data-testid="task-assign">{Locale.label("tasks.taskPage.assign")}</Button>
        </>}>
        <TextAction small onClick={() => setModalField("associatedWith")} aria-label={Locale.label("tasks.taskPage.editAssoc")} data-testid="task-associate">{Locale.label("tasks.taskPage.associate")}</TextAction>
        <TextAction small to="/serving/tasks" component={RouterLink}>{Locale.label("tasks.myWork.title")}</TextAction>
        {canEdit && task.data.taskType !== "accountDeletion" && <TextAction small onClick={handleDelete} data-testid="task-delete">{Locale.label("tasks.taskPage.deleteTask")}</TextAction>}
      </RecordActions>
      <Box component="dl" sx={{ mt: 3, mb: 0, display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 2, rowGap: 1, typography: "body2", "& dt": { color: "text.secondary", m: 0 }, "& dd": { m: 0, overflowWrap: "anywhere" } }}>
        <dt>{Locale.label("tasks.taskPage.associated")}</dt>
        <dd>
          <span data-testid="task-associated-label">{task.data.associatedWithLabel || Locale.label("tasks.taskPage.notSpec")}</span>
          <TaskContact taskId={task.data.id || ""} associatedWithType={task.data.associatedWithType} associatedWithId={task.data.associatedWithId} />
        </dd>
        <dt>{Locale.label("tasks.taskPage.assigned")}</dt>
        <dd data-testid="task-assigned-label">{task.data.assignedToLabel || Locale.label("tasks.taskPage.unassigned")}</dd>
        <dt>{Locale.label("tasks.taskPage.due")}</dt>
        <dd>
          {task.data.assignmentId
            ? (DateHelper.formatHtml5Date(task.data.dueDate) || "-")
            : <TextField type="date" size="small" variant="standard" defaultValue={DateHelper.formatHtml5Date(task.data.dueDate)} key={String(task.data.dueDate || "")} onBlur={(e) => { if (e.target.value !== DateHelper.formatHtml5Date(task.data.dueDate)) handleDueDateChange(e.target.value); }} inputProps={{ "aria-label": Locale.label("tasks.taskPage.due") }} data-testid="task-due-input" />}
        </dd>
      </Box>
      {history.length > 0 && (
        <Box sx={{ mt: 3 }} data-testid="task-history">
          <Typography sx={eyebrowSx}>{Locale.label("tasks.taskPage.history")}</Typography>
          <Stack spacing={0.5} sx={{ mt: 1 }}>
            {history.map((h, i) => (
              <Typography key={i} variant="body2" sx={{ overflowWrap: "anywhere" }} data-testid={"task-history-entry-" + i}>
                {h.message}
                {h.date && <Box component="span" sx={{ color: "text.secondary", ml: 1 }}>{DateHelper.prettyDateTime(new Date(h.date))}</Box>}
              </Typography>
            ))}
          </Stack>
        </Box>
      )}
      <Box sx={{ mt: 3 }}>
        <TaskReminderEdit taskId={task.data.id || ""} dueDate={task.data.dueDate} />
      </Box>
    </Box>
  );

  return (
    <PageContainer>
      <RecordLayout identity={identity} spacing={3} data-testid="task-record">
        {task.data.taskType === "directoryUpdate" && <RequestedChanges task={task.data} />}
        {task.data.taskType === "accountDeletion" && <AccountDeletionRequest task={task.data} />}
        {task.data.taskType === "groupJoinRequest" && <GroupJoinRequestTask task={task.data} />}
        <Notes context={context as UserContextInterface} conversationId={task.data.conversationId || ""} createConversation={handleCreateConversation as () => Promise<string>} />
      </RecordLayout>
      {ConfirmDialogElement}
      {modalField !== "" && <ContentPicker onClose={handleModalClose} onSelect={handleContentPicked} allowNone={modalField === "associatedWith"} />}
    </PageContainer>
  );
};
