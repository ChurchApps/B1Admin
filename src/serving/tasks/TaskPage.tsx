import React, { useContext, useCallback } from "react";
import { Box, Stack, Typography, Button } from "@mui/material";
import { ApiHelper, Notes, DateHelper, type ConversationInterface, Locale, Loading } from "@churchapps/apphelper";
import { type TaskInterface, type UserContextInterface } from "@churchapps/helpers";
import { Link as RouterLink, useParams } from "react-router-dom";
import { PageContainer, RecordLayout, StatusBadge, TextAction, eyebrowSx, RecordActions } from "../../components/ui";
import { ContentPicker } from "./components/ContentPicker";
import UserContext from "../../UserContext";
import { RequestedChanges } from "./components/RequestedChanges";
import { AccountDeletionRequest } from "./components/AccountDeletionRequest";
import { GroupJoinRequestTask } from "./components/GroupJoinRequestTask";
import { TaskReminderEdit } from "./components/TaskReminderEdit";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const TaskPage = () => {
  const params = useParams();
  const [modalField, setModalField] = React.useState("");
  const context = useContext(UserContext);
  const queryClient = useQueryClient();

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
          t.associatedWithType = contentType;
          t.associatedWithId = contentId;
          t.associatedWithLabel = label;
          break;
        case "assignedTo":
          t.assignedToType = contentType;
          t.assignedToId = contentId;
          t.assignedToLabel = label;
          break;
      }
      updateTaskMutation.mutate(t);
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
  if (!task.data) return <></>;

  const open = task.data.status === "Open";
  const quiet = { typography: "body2", color: "text.secondary", overflowWrap: "anywhere" } as const;

  const identity = (
    <Box component="aside" data-testid="task-identity" sx={{ minWidth: 0 }}>
      <Typography sx={eyebrowSx}>#{task.data.taskNumber}</Typography>
      <Typography id="page-header-title" variant="h1" component="h1" sx={{ mt: 0.5, overflowWrap: "anywhere" }}>{task.data.title}</Typography>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
        <StatusBadge tone={open ? "warning" : "success"} data-testid="task-status">{task.data.status}</StatusBadge>
        <Typography sx={quiet}>
          {Locale.label("tasks.taskPage.created")} {DateHelper.getDisplayDuration(DateHelper.toDate(task.data.dateCreated))} {Locale.label("tasks.taskPage.ago")} {Locale.label("tasks.taskPage.by")} {task.data.createdByLabel}
        </Typography>
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
      </RecordActions>
      <Box component="dl" sx={{ mt: 3, mb: 0, display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 2, rowGap: 1, typography: "body2", "& dt": { color: "text.secondary", m: 0 }, "& dd": { m: 0, overflowWrap: "anywhere" } }}>
        <dt>{Locale.label("tasks.taskPage.associated")}</dt>
        <dd data-testid="task-associated-label">{task.data.associatedWithLabel || Locale.label("tasks.taskPage.notSpec")}</dd>
        <dt>{Locale.label("tasks.taskPage.assigned")}</dt>
        <dd data-testid="task-assigned-label">{task.data.assignedToLabel || Locale.label("tasks.taskPage.unassigned")}</dd>
      </Box>
      <Box sx={{ mt: 3, "& .MuiAccordion-root": { boxShadow: "none", border: 1, borderColor: "divider", borderRadius: "var(--b1-radius-control)", "&::before": { display: "none" } } }}>
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
      {modalField !== "" && <ContentPicker onClose={handleModalClose} onSelect={handleContentPicked} />}
    </PageContainer>
  );
};
