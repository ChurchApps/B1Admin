import React, { useContext, useCallback } from "react";
import { Box } from "@mui/material";
import { ApiHelper, Notes, DateHelper, type ConversationInterface, Locale, Loading } from "@churchapps/apphelper";
import { type TaskInterface, type UserContextInterface } from "@churchapps/helpers";
import { useParams } from "react-router-dom";
import { ContentPicker } from "./components/ContentPicker";
import UserContext from "../../UserContext";
import { RequestedChanges } from "./components/RequestedChanges";
import { TaskReminderEdit } from "./components/TaskReminderEdit";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dl, Eyebrow, Facts, PlatedRecord, RecordTitle, SectionLabel, Verb, Verbs, platedColor } from "../plated";

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

  return (
    <>
      <PlatedRecord
        who={(
          <>
            <Eyebrow>#{task.data.taskNumber}</Eyebrow>
            <RecordTitle>{task.data.title}</RecordTitle>
            <Facts>
              <span style={{ color: open ? platedColor.first : platedColor.here, fontWeight: 600 }}>{task.data.status}</span>
              {" · "}
              {Locale.label("tasks.taskPage.created")} {DateHelper.getDisplayDuration(DateHelper.toDate(task.data?.dateCreated))} {Locale.label("tasks.taskPage.ago")} {Locale.label("tasks.taskPage.by")} {task.data.createdByLabel}
            </Facts>
            <Verbs>
              <Verb onClick={() => handleStatusChange(open ? "Closed" : "Open")}>
                {open ? Locale.label("tasks.taskPage.closed") : Locale.label("tasks.taskPage.open")}
              </Verb>
              <Verb onClick={() => setModalField("associatedWith")}>{Locale.label("tasks.taskPage.associate")}</Verb>
              <Verb onClick={() => setModalField("assignedTo")}>{Locale.label("tasks.taskPage.assign")}</Verb>
              <Verb to="/serving/tasks">{Locale.label("tasks.myWork.title")}</Verb>
            </Verbs>
            <Dl>
              <dt>{Locale.label("tasks.taskPage.associated")}</dt>
              <dd>{task.data.associatedWithLabel || Locale.label("tasks.taskPage.notSpec")}</dd>
              <dt>{Locale.label("tasks.taskPage.assigned")}</dt>
              <dd>{task.data.assignedToLabel || Locale.label("tasks.taskPage.unassigned")}</dd>
            </Dl>
            <Box sx={{ mt: 2 }}>
              <TaskReminderEdit taskId={task.data.id || ""} dueDate={task.data.dueDate} />
            </Box>
          </>
        )}
        rest={(
          <>
            {task.data.taskType === "directoryUpdate" && <RequestedChanges task={task.data} />}
            <SectionLabel sx={{ mt: 0 }}>{Locale.label("common.notes") || "Notes"}</SectionLabel>
            <Notes context={context as UserContextInterface} conversationId={task.data?.conversationId || ""} createConversation={handleCreateConversation as () => Promise<string>} />
          </>
        )}
      />
      {modalField !== "" && <ContentPicker onClose={handleModalClose} onSelect={handleContentPicked} />}
    </>
  );
};
