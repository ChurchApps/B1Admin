import React, { useContext, useCallback } from "react";
import { Menu, MenuItem, Box, Stack, Button } from "@mui/material";
import { ApiHelper, type TaskInterface, Notes, DateHelper, type ConversationInterface, Locale, Loading, PageHeader } from "@churchapps/apphelper";
import { useParams } from "react-router-dom";
import { ContentPicker } from "./components/ContentPicker";
import UserContext from "../../UserContext";
import { RequestedChanges } from "./components/RequestedChanges";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Assignment as TaskIcon, Person as PersonIcon, Group as GroupIcon, CheckCircle as CompletedIcon, RadioButtonUnchecked as OpenIcon } from "@mui/icons-material";

export const TaskPage = () => {
  const params = useParams();
  const [modalField, setModalField] = React.useState("");
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
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
      t.dateClosed = status === "Open" ? null : new Date();
      updateTaskMutation.mutate(t);
    },
    [task.data, updateTaskMutation]
  );

  const handleModalClose = useCallback(() => {
    setModalField("");
  }, []);

  const closeStatusMenu = useCallback(() => {
    setAnchorEl(null);
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
  else {
    return (
      <>
        <PageHeader
          icon={<TaskIcon />}
          title={`#${task.data.taskNumber} - ${task.data?.title}`}
          subtitle={`${Locale.label("tasks.taskPage.created")} ${DateHelper.getDisplayDuration(DateHelper.toDate(task.data?.dateCreated))} ${Locale.label("tasks.taskPage.ago")} ${Locale.label("tasks.taskPage.by")} ${task.data.createdByLabel} • ${Locale.label("tasks.taskPage.associated")}: ${task.data.associatedWithLabel || Locale.label("tasks.taskPage.notSpec")} • ${Locale.label("tasks.taskPage.assigned")}: ${task.data.assignedToLabel || Locale.label("tasks.taskPage.unassigned")}`}>
          <Stack direction="row" spacing={1}>
            <Button
              variant={task.data.status === "Open" ? "contained" : "outlined"}
              startIcon={task.data.status === "Open" ? <OpenIcon /> : <CompletedIcon />}
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{
                color: task.data.status === "Open" ? "#FFF" : "#FFF",
                backgroundColor: task.data.status === "Open" ? "#f57c00" : "transparent",
                borderColor: task.data.status === "Open" ? "#f57c00" : "#4caf50",
                "&:hover": {
                  backgroundColor: task.data.status === "Open" ? "#ef6c00" : "rgba(76, 175, 80, 0.2)",
                  borderColor: task.data.status === "Open" ? "#ef6c00" : "#4caf50"
                },
                textTransform: "none",
                fontWeight: 600
              }}>
              {task.data.status}
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<PersonIcon />}
              onClick={() => setModalField("assignedTo")}
              sx={{
                color: "#FFF",
                borderColor: "rgba(255,255,255,0.5)",
                minWidth: "auto",
                "&:hover": {
                  borderColor: "#FFF",
                  backgroundColor: "rgba(255,255,255,0.1)"
                }
              }}
              title={Locale.label("tasks.taskPage.editAssigned")}>
              {Locale.label("tasks.taskPage.assign")}
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<GroupIcon />}
              onClick={() => setModalField("associatedWith")}
              sx={{
                color: "#FFF",
                borderColor: "rgba(255,255,255,0.5)",
                minWidth: "auto",
                "&:hover": {
                  borderColor: "#FFF",
                  backgroundColor: "rgba(255,255,255,0.1)"
                }
              }}
              title={Locale.label("tasks.taskPage.editAssoc")}>
              {Locale.label("tasks.taskPage.associate")}
            </Button>
          </Stack>
        </PageHeader>
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={closeStatusMenu}>
          <MenuItem
            onClick={() => {
              handleStatusChange("Open");
              closeStatusMenu();
            }}>
            <OpenIcon sx={{ mr: 1 }} /> {Locale.label("tasks.taskPage.open")}
          </MenuItem>
          <MenuItem
            onClick={() => {
              handleStatusChange("Closed");
              closeStatusMenu();
            }}>
            <CompletedIcon sx={{ mr: 1 }} /> {Locale.label("tasks.taskPage.closed")}
          </MenuItem>
        </Menu>

        {/* Task Content */}
        <Box sx={{ p: 3 }}>
          {task.data.taskType === "directoryUpdate" && <RequestedChanges task={task.data} />}
          <Notes context={context} conversationId={task.data?.conversationId} createConversation={handleCreateConversation} />
        </Box>

        {modalField !== "" && <ContentPicker onClose={handleModalClose} onSelect={handleContentPicked} />}
      </>
    );
  }
};
