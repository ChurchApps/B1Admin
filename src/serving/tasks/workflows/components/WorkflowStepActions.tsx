import { Box, Button, IconButton, MenuItem, Select, Stack, TextField, Typography, Paper } from "@mui/material";
import React from "react";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { Add as AddIcon, Delete as DeleteIcon, Save as SaveIcon } from "@mui/icons-material";
import { type WorkflowInterface } from "@churchapps/helpers";
import { ContentPicker } from "../../components/ContentPicker";
import { ACTION_TYPES, SETTABLE_PERSON_FIELDS, type WorkflowStepActionInterface } from "../types";

interface EmailTemplateInterface { id?: string; name?: string }

interface Props {
  stepId: string;
  workflows: WorkflowInterface[];
}

// Editor for the ordered list of automated actions on an action step. Each action
// persists on its own Save; config is stored as a JSON string on the action.
export const WorkflowStepActions = (props: Props) => {
  const [actions, setActions] = React.useState<WorkflowStepActionInterface[]>([]);
  const [templates, setTemplates] = React.useState<EmailTemplateInterface[]>([]);
  const [pickerIndex, setPickerIndex] = React.useState<number | null>(null);

  const load = React.useCallback(async () => {
    const data = await ApiHelper.get("/workflowStepActions/step/" + props.stepId, "DoingApi");
    setActions(data || []);
  }, [props.stepId]);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => {
    ApiHelper.get("/emailTemplates", "MessagingApi").then((d: EmailTemplateInterface[]) => setTemplates(d || [])).catch(() => setTemplates([]));
  }, []);

  const config = (a: WorkflowStepActionInterface): any => {
    if (!a.config) return {};
    try { return JSON.parse(a.config); } catch { return {}; }
  };
  const setConfig = (index: number, patch: any) => {
    setActions((prev) => prev.map((a, i) => (i === index ? { ...a, config: JSON.stringify({ ...config(a), ...patch }) } : a)));
  };
  const setType = (index: number, actionType: string) => {
    setActions((prev) => prev.map((a, i) => (i === index ? { ...a, actionType, config: "{}" } : a)));
  };

  const addAction = () => {
    setActions((prev) => [...prev, { stepId: props.stepId, sort: prev.length + 1, actionType: "delay", config: "{}" }]);
  };

  const saveAction = async (index: number) => {
    const action = { ...actions[index], stepId: props.stepId };
    await ApiHelper.post("/workflowStepActions", [action], "DoingApi");
    load();
  };

  const deleteAction = async (index: number) => {
    const action = actions[index];
    if (action.id) await ApiHelper.delete("/workflowStepActions/" + action.id, "DoingApi");
    setActions((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePick = (contentType: string, contentId: string, label: string) => {
    if (pickerIndex !== null) {
      const target = actions[pickerIndex];
      if (target?.actionType === "createTask") setConfig(pickerIndex, { assignedToType: contentType, assignedToId: contentId, assignedToLabel: label });
      else if (contentType === "group") setConfig(pickerIndex, { groupId: contentId, groupLabel: label });
    }
    setPickerIndex(null);
  };

  const renderConfig = (a: WorkflowStepActionInterface, index: number) => {
    const c = config(a);
    switch (a.actionType) {
      case "delay":
        return <TextField type="number" size="small" label={Locale.label("tasks.workflowActions.days")} value={c.days ?? ""} data-testid={"action-days-" + index} onChange={(e) => setConfig(index, { days: e.target.value === "" ? undefined : Number(e.target.value) })} />;
      case "sendEmail":
        return (
          <Stack spacing={1}>
            <Select size="small" displayEmpty value={c.templateId || ""} data-testid={"action-template-" + index} onChange={(e) => setConfig(index, { templateId: e.target.value })}>
              <MenuItem value="" disabled>{Locale.label("tasks.workflowActions.selectTemplate")}</MenuItem>
              {templates.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
            </Select>
            <TextField size="small" label={Locale.label("tasks.workflowActions.subjectOverride")} value={c.subject || ""} onChange={(e) => setConfig(index, { subject: e.target.value })} />
          </Stack>
        );
      case "addToGroup":
      case "removeFromGroup":
        return (
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" color="text.secondary">{c.groupLabel || Locale.label("tasks.workflowActions.noGroup")}</Typography>
            <Button size="small" data-testid={"action-group-pick-" + index} onClick={() => setPickerIndex(index)}>{Locale.label("tasks.workflowActions.pickGroup")}</Button>
          </Stack>
        );
      case "createTask":
        return (
          <Stack spacing={1}>
            <TextField size="small" fullWidth label={Locale.label("tasks.workflowActions.taskTitle")} value={c.title || ""} data-testid={"action-task-title-" + index} onChange={(e) => setConfig(index, { title: e.target.value })} />
            <TextField size="small" fullWidth label={Locale.label("tasks.workflowActions.taskDescription")} value={c.description || ""} onChange={(e) => setConfig(index, { description: e.target.value })} />
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" color="text.secondary">{c.assignedToLabel || Locale.label("tasks.workflowActions.noAssignee")}</Typography>
              <Button size="small" data-testid={"action-assignee-pick-" + index} onClick={() => setPickerIndex(index)}>{Locale.label("tasks.workflowActions.pickAssignee")}</Button>
            </Stack>
          </Stack>
        );
      case "addToWorkflow":
        return (
          <Select size="small" displayEmpty value={c.workflowId || ""} data-testid={"action-workflow-" + index} onChange={(e) => setConfig(index, { workflowId: e.target.value, workflowLabel: props.workflows.find((w) => w.id === e.target.value)?.name })}>
            <MenuItem value="" disabled>{Locale.label("tasks.workflowActions.selectWorkflow")}</MenuItem>
            {props.workflows.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
          </Select>
        );
      case "addNote":
        return <TextField size="small" fullWidth multiline label={Locale.label("tasks.workflowActions.note")} value={c.note || ""} data-testid={"action-note-" + index} onChange={(e) => setConfig(index, { note: e.target.value })} />;
      case "setField":
        return (
          <Stack direction="row" spacing={1}>
            <Select size="small" displayEmpty value={c.field || ""} data-testid={"action-field-" + index} onChange={(e) => setConfig(index, { field: e.target.value })} sx={{ minWidth: 140 }}>
              <MenuItem value="" disabled>{Locale.label("tasks.workflowActions.selectField")}</MenuItem>
              {SETTABLE_PERSON_FIELDS.map((f) => <MenuItem key={f} value={f}>{f}</MenuItem>)}
            </Select>
            <TextField size="small" label={Locale.label("tasks.workflowActions.value")} value={c.value || ""} onChange={(e) => setConfig(index, { value: e.target.value })} />
          </Stack>
        );
      case "webhook":
        return <TextField size="small" fullWidth label={Locale.label("tasks.workflowActions.webhookUrl")} value={c.url || ""} data-testid={"action-url-" + index} onChange={(e) => setConfig(index, { url: e.target.value })} />;
      default:
        return null;
    }
  };

  return (
    <Box data-testid="workflow-step-actions">
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>{Locale.label("tasks.workflowActions.title")}</Typography>
      <Stack spacing={1.5}>
        {actions.map((a, index) => (
          <Paper key={a.id || index} variant="outlined" sx={{ p: 1.5 }} data-testid={"action-row-" + index}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Select size="small" value={a.actionType || "delay"} data-testid={"action-type-" + index} onChange={(e) => setType(index, e.target.value)} sx={{ minWidth: 150 }}>
                  {ACTION_TYPES.map((t) => <MenuItem key={t} value={t}>{Locale.label("tasks.workflowActions.type." + t)}</MenuItem>)}
                </Select>
                <Box sx={{ flexGrow: 1 }} />
                <IconButton size="small" color="primary" data-testid={"action-save-" + index} onClick={() => saveAction(index)}><SaveIcon fontSize="small" /></IconButton>
                <IconButton size="small" data-testid={"action-delete-" + index} onClick={() => deleteAction(index)}><DeleteIcon fontSize="small" /></IconButton>
              </Stack>
              {renderConfig(a, index)}
            </Stack>
          </Paper>
        ))}
        <Button size="small" startIcon={<AddIcon />} data-testid="add-action-button" onClick={addAction}>{Locale.label("tasks.workflowActions.add")}</Button>
      </Stack>
      {pickerIndex !== null && <ContentPicker onClose={() => setPickerIndex(null)} onSelect={handlePick} />}
    </Box>
  );
};
