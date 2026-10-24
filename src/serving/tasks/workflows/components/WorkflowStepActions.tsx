import { Box, Button, IconButton, MenuItem, Select, Stack, TextField, Typography, Paper } from "@mui/material";
import React from "react";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { type WorkflowInterface } from "@churchapps/helpers";
import { ContentPicker } from "../../components/ContentPicker";
import { ACTION_TYPES, SETTABLE_PERSON_FIELDS, type WorkflowStepActionInterface } from "../types";

interface EmailTemplateInterface { id?: string; name?: string }
interface EmailSendStatus { approved?: boolean; paused?: boolean }

interface Props {
  stepId: string;
  workflows: WorkflowInterface[];
  assignmentConfirmation?: boolean;
  // The step editor's Save calls this so every action row is written along with the step.
  saveRef?: React.Ref<() => Promise<void>>;
}

export const WorkflowStepActions = (props: Props) => {
  const [actions, setActions] = React.useState<WorkflowStepActionInterface[]>([]);
  const [templates, setTemplates] = React.useState<EmailTemplateInterface[]>([]);
  const [textingProviders, setTextingProviders] = React.useState<any[] | null>(null);
  const [emailStatus, setEmailStatus] = React.useState<EmailSendStatus | null>(null);
  const [pickerIndex, setPickerIndex] = React.useState<number | null>(null);

  const load = React.useCallback(async () => {
    const data = await ApiHelper.get("/workflowStepActions/step/" + props.stepId, "DoingApi");
    setActions(data || []);
  }, [props.stepId]);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => {
    ApiHelper.get("/emailTemplates", "MessagingApi").then((d: EmailTemplateInterface[]) => setTemplates(d || [])).catch(() => setTemplates([]));
    ApiHelper.get("/texting/providers", "MessagingApi").then((d: any[]) => setTextingProviders(d || [])).catch(() => setTextingProviders([]));
    ApiHelper.get("/emailTemplates/sendStatus", "MessagingApi").then((d: EmailSendStatus) => setEmailStatus(d || null)).catch(() => setEmailStatus(null));
  }, []);

  const config = (a: WorkflowStepActionInterface): any => {
    if (!a.config) return {};
    try { return JSON.parse(a.config); } catch { return {}; }
  };
  const setConfig = (index: number, patch: any) => {
    setActions((prev) => prev.map((a, i) => (i === index ? { ...a, config: JSON.stringify({ ...config(a), ...patch }) } : a)));
  };
  const setType = (index: number, actionType: string) => {
    setActions((prev) => prev.map((a, i) => (i === index ? { ...a, actionType, config: actionType === "sendAssignmentRequest" ? JSON.stringify({ channel: "email" }) : "{}" } : a)));
  };

  const addAction = () => {
    setActions((prev) => [...prev, { stepId: props.stepId, sort: prev.length + 1, actionType: "delay", config: "{}" }]);
  };

  const saveAll = async () => {
    if (actions.length === 0) return;
    await ApiHelper.post("/workflowStepActions", actions.map((a, i) => ({ ...a, stepId: props.stepId, sort: i + 1 })), "DoingApi");
  };

  React.useImperativeHandle(props.saveRef, () => saveAll);

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
      case "sendAssignmentRequest":
        return (
          <Stack spacing={1}>
            <Select size="small" value={c.channel || "email"} data-testid={"action-serving-channel-" + index} onChange={(e) => setConfig(index, { channel: e.target.value })}>
              <MenuItem value="email">{Locale.label("plans.confirmation.email", "Email")}</MenuItem>
              <MenuItem value="sms">{Locale.label("plans.confirmation.text", "Text message")}</MenuItem>
            </Select>
            <TextField size="small" fullWidth multiline minRows={2} label={Locale.label("plans.confirmation.message", "Request message")} value={c.message || ""} data-testid={"action-serving-message-" + index} onChange={(e) => setConfig(index, { message: e.target.value })}
              helperText={Locale.label("plans.confirmation.messageHelp", "Includes the role, plan, service date and a response link. Use {{planName}}, {{positionName}} and {{serviceDate}} in your message. Empty uses the default request.")} />
            {c.channel === "sms" && textingProviders?.length === 0 && <Typography color="warning.main" variant="body2">{Locale.label("tasks.workflowActions.noTextingProvider")}</Typography>}
            <Typography variant="caption">{Locale.label("plans.confirmation.preferences", "Member preferences, SMS opt-in, provider configuration, and church email approval apply. Skipped or blocked attempts are recorded on the card.")}</Typography>
          </Stack>
        );
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
            {emailStatus?.approved === false && <Typography variant="body2" color="warning.main" data-testid={"action-email-not-approved-" + index}>{Locale.label("tasks.workflowActions.emailNotApproved")}</Typography>}
            {emailStatus?.paused && <Typography variant="body2" color="warning.main" data-testid={"action-email-paused-" + index}>{Locale.label("tasks.workflowActions.emailPaused")}</Typography>}
          </Stack>
        );
      case "sendText": {
        const message: string = c.message || "";
        return (
          <Stack spacing={1}>
            <TextField size="small" fullWidth multiline minRows={3} label={Locale.label("tasks.workflowActions.textMessage")} value={message} data-testid={"action-text-message-" + index} inputProps={{ maxLength: 1600 }} helperText={Locale.label("tasks.workflowActions.textMergeHint") + " " + message.length + "/1600"} onChange={(e) => setConfig(index, { message: e.target.value })} />
            {textingProviders?.length === 0 && <Typography variant="body2" color="warning.main" data-testid={"action-text-no-provider-" + index}>{Locale.label("tasks.workflowActions.noTextingProvider")}</Typography>}
          </Stack>
        );
      }
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
            <TextField size="small" type="number" label={Locale.label("plans.confirmation.dueDays", "Task due in days")} value={c.dueDays ?? ""} onChange={(e) => setConfig(index, { dueDays: e.target.value ? Number(e.target.value) : undefined })} />
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
                  {ACTION_TYPES.filter((t) => props.assignmentConfirmation ? !["sendEmail", "sendText", "addToWorkflow"].includes(t) : t !== "sendAssignmentRequest").map((t) => <MenuItem key={t} value={t}>{t === "sendAssignmentRequest" ? Locale.label("plans.confirmation.sendRequest", "Send serving request") : Locale.label("tasks.workflowActions.type." + t)}</MenuItem>)}
                </Select>
                <Box sx={{ flexGrow: 1 }} />
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
