import { Grid, TextField, Typography, Stack, Button, InputAdornment, Box, Chip, FormHelperText } from "@mui/material";
import { Surface } from "../../../components/ui";
import React from "react";
import { ApiHelper, type ConversationInterface, DateHelper, ErrorMessages, Locale, type MessageInterface, UserHelper } from "@churchapps/apphelper";
import { type GroupInterface, type GroupMemberInterface, type TaskInterface } from "@churchapps/helpers";
import { ContentPicker } from "./ContentPicker";
import { notifyAssignee } from "./taskNotifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Search as SearchIcon, Cancel as CancelIcon, Save as SaveIcon } from "@mui/icons-material";

interface Assignee {
  contentType: string;
  contentId: string;
  label: string;
}

interface Props {
  onCancel: () => void;
  onSave: () => void;
  compact?: boolean;
}

export const NewTask = (props: Props) => {
  const queryClient = useQueryClient();
  const initialData = {
    status: "Open",
    createdByType: "person",
    createdById: UserHelper.person?.id,
    createdByLabel: UserHelper.person?.name?.display,
    dateCreated: new Date()
  };
  const [task, setTask] = React.useState<TaskInterface>(initialData);
  const [message, setMessage] = React.useState<MessageInterface>({});
  const [assignees, setAssignees] = React.useState<Assignee[]>([]);
  const [associated, setAssociated] = React.useState<Assignee[]>([]);
  const [modalField, setModalField] = React.useState("");
  const [errors, setErrors] = React.useState<string[]>([]);

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: { task: TaskInterface; assignees: Assignee[]; associated: Assignee[]; message?: MessageInterface }) => {
      // One task per assignee for each associated person, so each person closes their own.
      const about: (Assignee | undefined)[] = taskData.associated.length > 0 ? taskData.associated : [undefined];
      const newTasks = taskData.assignees.flatMap((a) => about.map((w) => ({
        ...taskData.task,
        assignedToType: a.contentType,
        assignedToId: a.contentId,
        assignedToLabel: a.label,
        associatedWithType: w?.contentType,
        associatedWithId: w?.contentId,
        associatedWithLabel: w?.label
      })));
      const createdTasks: TaskInterface[] = await ApiHelper.post("/tasks", newTasks, "DoingApi");

      await Promise.all(createdTasks.map(async (createdTask) => {
        if (taskData.message?.content && taskData.message.content.trim() !== "") {
          const conv: ConversationInterface = {
            allowAnonymousPosts: false,
            contentType: "task",
            contentId: createdTask.id,
            title: "Task #" + createdTask.id + " Notes",
            visibility: "hidden"
          };
          const result: ConversationInterface[] = await ApiHelper.post("/conversations", [conv], "MessagingApi");

          const updatedTask = { ...createdTask };
          updatedTask.conversationId = result[0].id;
          await ApiHelper.post("/tasks", [updatedTask], "DoingApi");

          const taskMessage = { ...taskData.message };
          taskMessage.conversationId = updatedTask.conversationId;
          taskMessage.displayName = UserHelper.person?.name?.display || "";
          await ApiHelper.post("/messages", [taskMessage], "MessagingApi");
        }

        await notifyAssignee(createdTask, `${Locale.label("tasks.newTask.newAssign")}: ${createdTask.title}`);
      }));
      return createdTasks;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/tasks", "DoingApi"] });
      queryClient.invalidateQueries({ queryKey: ["/tasks/closed", "DoingApi"] });
      queryClient.invalidateQueries({ queryKey: ["/tasks/loadForGroups", "DoingApi"] });
      props.onSave();
    }
  });

  const validate = () => {
    const result = [];
    if (assignees.length === 0) result.push(Locale.label("tasks.newTask.assignPers"));
    if (!task.title?.trim()) result.push(Locale.label("tasks.newTask.titleTask"));
    setErrors(result);
    return result.length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      createTaskMutation.mutate({ task, assignees, associated, message });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const val = e.target.value;

    switch (e.target.name) {
      case "title":
        const t = { ...task };
        t.title = val;
        setTask(t);
        break;
      case "dueDate":
        setTask({ ...task, dueDate: val ? new Date(val + "T12:00") : undefined });
        break;
      case "note":
        const m = { ...message };
        m.content = val;
        setMessage(m);
        break;
    }
  };

  const listFor = (field: string) => (field === "associatedWith" ? associated : assignees);
  const setListFor = (field: string, list: Assignee[]) => (field === "associatedWith" ? setAssociated(list) : setAssignees(list));

  const handleContentPicked = (contentType: string, contentId: string, label: string) => {
    // Empty values mean "no person or group": a plain to-do.
    if (!contentId) {
      setListFor(modalField, []);
      setModalField("");
      return;
    }
    // People add up and the picker stays open for more; a group is one shared task.
    if (contentType === "person") {
      const people = listFor(modalField).filter((a) => a.contentType === "person");
      if (!people.some((a) => a.contentId === contentId)) setListFor(modalField, [...people, { contentType, contentId, label }]);
      return;
    }
    setListFor(modalField, [{ contentType, contentId, label }]);
    setModalField("");
  };

  const handleExpandGroup = async (group: GroupInterface) => {
    const field = modalField;
    const members: GroupMemberInterface[] = await ApiHelper.get("/groupmembers?groupId=" + group.id, "MembershipApi");
    const result = listFor(field).filter((a) => a.contentType === "person");
    members.forEach((m) => {
      if (m.personId && !result.some((a) => a.contentId === m.personId)) {
        result.push({ contentType: "person", contentId: m.personId, label: m.person?.name?.display || Locale.label("person.unknown") });
      }
    });
    setListFor(field, result);
    setModalField("");
  };

  const handleRemoveAssignee = (contentId: string) => {
    setAssignees(assignees.filter((a) => a.contentId !== contentId));
  };

  const handleRemoveAssociated = (contentId: string) => {
    setAssociated(associated.filter((a) => a.contentId !== contentId));
  };

  const countLabel = (list: Assignee[]) => (list.length > 1
    ? Locale.label("tasks.newTask.assignCount", "{{count}} people").replace("{{count}}", list.length.toString())
    : list[0]?.label || "");
  const assignLabel = countLabel(assignees);
  const assocLabel = countLabel(associated);

  const handleModalClose = () => {
    setModalField("");
  };

  return (
    <Surface>
      <Stack spacing={3}>
        <Typography variant="h3" component="h2">
          {Locale.label("tasks.newTask.taskNew")}
        </Typography>

        {errors.length > 0 && <ErrorMessages errors={errors} />}

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: props.compact ? 6 : 4 }}>
            <TextField
              fullWidth
              label={Locale.label("tasks.newTask.associateW")}
              value={assocLabel}
              helperText={associated.length > 1 ? undefined : Locale.label("tasks.newTask.associateHint", "Optional. Leave blank for a to-do that is not about anyone.")}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <SearchIcon sx={{ color: "action.active" }} />
                  </InputAdornment>
                ),
                sx: { "& .MuiInputBase-input": { cursor: "pointer" } }
              }}
              onFocus={(e) => {
                e.target.blur();
                setModalField("associatedWith");
              }}
              data-testid="associate-with-input"
              aria-label={Locale.label("tasks.newTask.associateWithAria")}
              variant="outlined"
            />
            {associated.length > 1 && (
              <>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1 }} data-testid="associated-chips">
                  {associated.map((a) => (
                    <Chip key={a.contentId} size="small" label={a.label} onDelete={() => handleRemoveAssociated(a.contentId)} />
                  ))}
                </Box>
                <FormHelperText data-testid="associate-per-person-hint">
                  {Locale.label("tasks.newTask.perPersonHint", "One task will be created for each person.")}
                </FormHelperText>
              </>
            )}
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: props.compact ? 6 : 4 }}>
            <TextField
              fullWidth
              label={Locale.label("tasks.newTask.assignTo")}
              value={assignLabel}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <SearchIcon sx={{ color: "action.active" }} />
                  </InputAdornment>
                ),
                sx: { "& .MuiInputBase-input": { cursor: "pointer" } }
              }}
              onFocus={(e) => {
                e.target.blur();
                setModalField("assignedTo");
              }}
              data-testid="assign-to-input"
              aria-label={Locale.label("tasks.newTask.assignToAria")}
              variant="outlined"
            />
            {assignees.length > 1 && (
              <>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1 }} data-testid="assignee-chips">
                  {assignees.map((a) => (
                    <Chip key={a.contentId} size="small" label={a.label} onDelete={() => handleRemoveAssignee(a.contentId)} />
                  ))}
                </Box>
                <FormHelperText data-testid="assign-per-person-hint">
                  {Locale.label("tasks.newTask.perPersonHint", "One task will be created for each person.")}
                </FormHelperText>
                {associated.length > 1 && (
                  <FormHelperText data-testid="task-total-hint">
                    {Locale.label("tasks.newTask.totalHint", "{{count}} tasks will be created.").replace("{{count}}", (assignees.length * associated.length).toString())}
                  </FormHelperText>
                )}
              </>
            )}
          </Grid>
          <Grid size={{ xs: 12, md: props.compact ? 12 : 4 }}>
            <TextField
              fullWidth
              label={Locale.label("common.title")}
              value={task.title || ""}
              name="title"
              onChange={handleChange}
              placeholder={Locale.label("placeholders.task.title")}
              data-testid="task-title-input"
              aria-label={Locale.label("tasks.newTask.taskTitleAria")}
              variant="outlined"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: props.compact ? 6 : 4 }}>
            <TextField
              fullWidth
              type="date"
              label={Locale.label("tasks.newTask.dueDate")}
              value={DateHelper.formatHtml5Date(task.dueDate)}
              name="dueDate"
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              data-testid="task-due-date-input"
              variant="outlined"
            />
          </Grid>
        </Grid>

        <TextField
          fullWidth
          label={Locale.label("common.notes")}
          value={message.content}
          name="note"
          onChange={handleChange}
          multiline
          rows={4}
          placeholder={Locale.label("placeholders.task.notes")}
          data-testid="task-notes-input"
          aria-label={Locale.label("tasks.newTask.taskNotesAria")}
          variant="outlined"
        />

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button
            variant="outlined"
            startIcon={<CancelIcon />}
            onClick={props.onCancel}>
            {Locale.label("common.cancel")}
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={createTaskMutation.isPending}>
            {createTaskMutation.isPending ? Locale.label("tasks.newTask.saving") : Locale.label("common.save")}
          </Button>
        </Stack>
      </Stack>

      {modalField !== "" && (
        <ContentPicker
          onClose={handleModalClose}
          onSelect={handleContentPicked}
          allowNone={modalField === "associatedWith"}
          multiple
          selected={listFor(modalField).filter((a) => a.contentType === "person")}
          onRemove={modalField === "associatedWith" ? handleRemoveAssociated : handleRemoveAssignee}
          onExpandGroup={handleExpandGroup}
        />
      )}
    </Surface>
  );
};
