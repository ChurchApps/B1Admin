import { Box, Button, Chip, IconButton, ListSubheader, MenuItem, Select, Stack, TextField, Typography, Paper } from "@mui/material";
import React from "react";
import { flushSync } from "react-dom";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { type WorkflowInterface } from "@churchapps/helpers";
import { ContentPicker } from "../../components/ContentPicker";
import { MERGE_FIELD_KEYS, keepFocus } from "../../../../groups/components/SendTextDialog";
import { type PersonFieldInterface } from "../../../../helpers/Interfaces";
import { parseFieldChoices } from "../../../../helpers/PersonFieldHelper";
import { ACTION_TYPES, CUSTOM_FIELD_PREFIX, SETTABLE_PERSON_FIELDS, type WorkflowStepActionInterface } from "../types";

// Gift fields fill in only when a Donation trigger started the workflow, so group texting does not offer them.
const WORKFLOW_TEXT_MERGE_FIELDS = [
  ...MERGE_FIELD_KEYS,
  { key: "{{donorNumber}}", label: "tasks.workflowActions.mergeDonorNumber" },
  { key: "{{amount}}", label: "tasks.workflowActions.mergeAmount" },
  { key: "{{giftDate}}", label: "tasks.workflowActions.mergeGiftDate" },
  { key: "{{fund}}", label: "tasks.workflowActions.mergeFund" },
  { key: "{{receipt}}", label: "tasks.workflowActions.mergeReceipt" }
];

interface EmailTemplateInterface { id?: string; name?: string; category?: string }
interface EmailSendStatus { approved?: boolean; paused?: boolean }

interface Props {
  stepId: string;
  workflows: WorkflowInterface[];
  assignmentConfirmation?: boolean;
  // The step editor's Save calls this so every action row is written along with the step.
  saveRef?: React.Ref<() => Promise<void>>;
}

/** The JSON stored in a step action's `config`; which keys apply depends on the action type. */
interface WorkflowActionConfig {
  channel?: string;
  message?: string;
  days?: number;
  templateId?: string;
  subject?: string;
  groupId?: string;
  groupLabel?: string;
  title?: string;
  dueDays?: number;
  description?: string;
  assignedToType?: string;
  assignedToId?: string;
  assignedToLabel?: string;
  personId?: string;
  personLabel?: string;
  workflowId?: string;
  workflowLabel?: string;
  note?: string;
  field?: string;
  // The custom field's name when field is CUSTOM_FIELD_PREFIX + its id; the Api shows it in the card history.
  fieldLabel?: string;
  value?: string;
  url?: string;
}

export const WorkflowStepActions = (props: Props) => {
  const [actions, setActions] = React.useState<WorkflowStepActionInterface[]>([]);
  const [templates, setTemplates] = React.useState<EmailTemplateInterface[]>([]);
  const [textingProviders, setTextingProviders] = React.useState<unknown[] | null>(null);
  const [emailStatus, setEmailStatus] = React.useState<EmailSendStatus | null>(null);
  // null until loaded, so an action's custom field is not reported as deleted while the list is on its way.
  const [customFields, setCustomFields] = React.useState<PersonFieldInterface[] | null>(null);
  const [pickerIndex, setPickerIndex] = React.useState<number | null>(null);
  const textRefs = React.useRef<Record<number, HTMLTextAreaElement | null>>({});

  const load = React.useCallback(async () => {
    const data = await ApiHelper.get("/workflowStepActions/step/" + props.stepId, "DoingApi");
    setActions(data || []);
  }, [props.stepId]);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => {
    ApiHelper.get("/emailTemplates", "MessagingApi").then((d: EmailTemplateInterface[]) => setTemplates(d || [])).catch(() => setTemplates([]));
    ApiHelper.get("/texting/providers", "MessagingApi").then((d: unknown[]) => setTextingProviders(d || [])).catch(() => setTextingProviders([]));
    ApiHelper.get("/emailTemplates/sendStatus", "MessagingApi").then((d: EmailSendStatus) => setEmailStatus(d || null)).catch(() => setEmailStatus(null));
    ApiHelper.get("/personfields", "MembershipApi").then((d: PersonFieldInterface[]) => setCustomFields(Array.isArray(d) ? d.filter((f) => f.id) : [])).catch(() => { });
  }, []);

  const emailTemplates = templates.filter(t => t.category !== "Text");
  const textTemplates = templates.filter(t => t.category === "Text");

  const config = (a: WorkflowStepActionInterface): WorkflowActionConfig => {
    if (!a.config) return {};
    try { return JSON.parse(a.config); } catch { return {}; }
  };
  const setConfig = (index: number, patch: WorkflowActionConfig) => {
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

  // Inserts a merge field at the Send Text cursor, same as the group Send Text window.
  const insertMergeField = (index: number, field: string) => {
    const message: string = config(actions[index]).message || "";
    const input = textRefs.current[index];
    const start = input?.selectionStart ?? message.length;
    const end = input?.selectionEnd ?? message.length;
    const next = message.slice(0, start) + field + message.slice(end);
    if (next.length > 1600) return;
    const caret = start + field.length;
    // Commit now and place the caret in the same tick; a deferred caret lands after the next keystroke.
    flushSync(() => setConfig(index, { message: next }));
    textRefs.current[index]?.focus();
    textRefs.current[index]?.setSelectionRange(caret, caret);
  };

  // Fills the Send Text message from a text template, same as the Mass Texting window. The message stays editable.
  const applyTextTemplate = async (index: number, templateId: string) => {
    if (!templateId) return;
    try {
      const full = await ApiHelper.get("/emailTemplates/" + templateId, "MessagingApi");
      setConfig(index, { message: (full?.htmlContent || "").slice(0, 1600) });
    } catch { /* keep the current message */ }
  };

  const handlePick = (contentType: string, contentId: string, label: string) => {
    if (pickerIndex !== null) {
      const target = actions[pickerIndex];
      if (target?.actionType === "createTask") setConfig(pickerIndex, { assignedToType: contentType, assignedToId: contentId, assignedToLabel: label });
      else if (target?.actionType === "notifyPerson") setConfig(pickerIndex, contentType === "person" ? { personId: contentId, personLabel: label } : {});
      else if (contentType === "group") setConfig(pickerIndex, { groupId: contentId, groupLabel: label });
    }
    setPickerIndex(null);
  };

  // The value is kept when switching between built-in fields, as before. A custom field's value only
  // fits its own type, so it is cleared when either side of the switch is a custom field.
  const setField = (index: number, previous: WorkflowActionConfig, field: string) => {
    const isCustom = field.startsWith(CUSTOM_FIELD_PREFIX);
    const fieldLabel = isCustom ? customFields?.find((f) => CUSTOM_FIELD_PREFIX + f.id === field)?.name : undefined;
    const keepValue = !isCustom && !previous.field?.startsWith(CUSTOM_FIELD_PREFIX);
    setConfig(index, { field, fieldLabel, value: keepValue ? previous.value : "" });
  };

  // The input for a Set Field value. A custom field gets the input for its type, storing the same strings
  // the person edit form stores: the choice value, True/False, yyyy-mm-dd, or the number as typed.
  const renderFieldValue = (c: WorkflowActionConfig, index: number, customField?: PersonFieldInterface) => {
    const label = Locale.label("tasks.workflowActions.value");
    const testId = "action-value-" + index;
    const value = c.value || "";
    const onChange = (e: { target: { value: string } }) => setConfig(index, { value: e.target.value });
    switch (customField?.fieldType) {
      case "Multiple Choice": {
        const choices = parseFieldChoices(customField.choices) || [];
        return (
          <Select size="small" displayEmpty value={value} data-testid={testId} onChange={onChange} sx={{ minWidth: 140 }}>
            <MenuItem value="" disabled>{label}</MenuItem>
            {choices.map((choice) => <MenuItem key={choice.value} value={choice.value}>{choice.text}</MenuItem>)}
            {!!value && !choices.some((choice) => choice.value === value) && <MenuItem value={value} disabled>{value}</MenuItem>}
          </Select>
        );
      }
      case "Yes/No":
        return (
          <Select size="small" displayEmpty value={value} data-testid={testId} onChange={onChange} sx={{ minWidth: 140 }}>
            <MenuItem value="" disabled>{label}</MenuItem>
            <MenuItem value="True">{Locale.label("common.yes")}</MenuItem>
            <MenuItem value="False">{Locale.label("common.no")}</MenuItem>
          </Select>
        );
      case "Date":
        return <TextField size="small" type="date" label={label} value={value} data-testid={testId} onChange={onChange} slotProps={{ inputLabel: { shrink: true } }} />;
      case "Whole Number":
      case "Decimal":
        return <TextField size="small" type="number" label={label} value={value} data-testid={testId} onChange={onChange} />;
      default:
        return <TextField size="small" label={label} value={value} data-testid={testId} onChange={onChange} />;
    }
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
              {emailTemplates.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
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
            {textTemplates.length > 0 && (
              <Select size="small" displayEmpty value="" data-testid={"action-text-template-" + index} onChange={(e) => applyTextTemplate(index, e.target.value as string)}>
                <MenuItem value="" disabled>{Locale.label("tasks.workflowActions.textTemplate")}</MenuItem>
                {textTemplates.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
              </Select>
            )}
            <TextField size="small" fullWidth multiline minRows={3} label={Locale.label("tasks.workflowActions.textMessage")} value={message} data-testid={"action-text-message-" + index} inputRef={(el: HTMLTextAreaElement | null) => { textRefs.current[index] = el; }} inputProps={{ maxLength: 1600 }} helperText={Locale.label("tasks.workflowActions.textMergeHint") + " " + message.length + "/1600"} onChange={(e) => setConfig(index, { message: e.target.value })} />
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap data-testid={"action-text-merge-fields-" + index}>
              {WORKFLOW_TEXT_MERGE_FIELDS.map((f) => (
                <Chip key={f.key} label={Locale.label(f.label)} size="small" variant="outlined" onMouseDown={keepFocus} onClick={() => insertMergeField(index, f.key)} sx={{ cursor: "pointer" }} />
              ))}
            </Stack>
            <Typography variant="caption" color="text.secondary" data-testid={"action-text-gift-hint-" + index}>{Locale.label("tasks.workflowActions.giftMergeHint")}</Typography>
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
      case "recordAttendance":
        return (
          <Stack spacing={1}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" color="text.secondary">{c.groupLabel || Locale.label("tasks.workflowActions.noGroup")}</Typography>
              <Button size="small" data-testid={"action-group-pick-" + index} onClick={() => setPickerIndex(index)}>{Locale.label("tasks.workflowActions.pickGroup")}</Button>
            </Stack>
            <Typography variant="caption">{Locale.label("tasks.workflowActions.recordAttendanceHint")}</Typography>
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
      case "notifyPerson":
        return (
          <Stack spacing={1}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" color="text.secondary" data-testid={"action-notify-person-" + index}>{c.personLabel || Locale.label("tasks.workflowActions.noPerson")}</Typography>
              <Button size="small" data-testid={"action-notify-pick-" + index} onClick={() => setPickerIndex(index)}>{Locale.label("tasks.workflowActions.pickPerson")}</Button>
            </Stack>
            <TextField size="small" fullWidth multiline minRows={2} label={Locale.label("tasks.workflowActions.notifyMessage")} value={c.message || ""} data-testid={"action-notify-message-" + index} onChange={(e) => setConfig(index, { message: e.target.value })} />
            <Typography variant="caption">{Locale.label("tasks.workflowActions.notifyHint")}</Typography>
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
      case "setField": {
        const usesCustomField = !!c.field?.startsWith(CUSTOM_FIELD_PREFIX);
        const customField = usesCustomField ? customFields?.find((f) => CUSTOM_FIELD_PREFIX + f.id === c.field) : undefined;
        const fieldDeleted = usesCustomField && !!customFields && !customField;
        return (
          <Stack spacing={1}>
            <Stack direction="row" spacing={1}>
              <Select size="small" displayEmpty value={c.field || ""} data-testid={"action-field-" + index} onChange={(e) => setField(index, c, e.target.value)} sx={{ minWidth: 140 }}>
                <MenuItem value="" disabled>{Locale.label("tasks.workflowActions.selectField")}</MenuItem>
                {!!customFields?.length && <ListSubheader>{Locale.label("tasks.workflowActions.builtInFields")}</ListSubheader>}
                {SETTABLE_PERSON_FIELDS.map((f) => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                {!!customFields?.length && <ListSubheader>{Locale.label("tasks.workflowActions.customFields")}</ListSubheader>}
                {customFields?.map((f) => <MenuItem key={f.id} value={CUSTOM_FIELD_PREFIX + f.id}>{f.name}</MenuItem>)}
                {/* Stands in for a custom field that is still loading or has been deleted, so the picker is never blank. */}
                {usesCustomField && !customField && <MenuItem value={c.field} disabled>{c.fieldLabel || (fieldDeleted ? Locale.label("tasks.workflowActions.deletedField") : "")}</MenuItem>}
              </Select>
              {renderFieldValue(c, index, customField)}
            </Stack>
            {fieldDeleted && <Typography variant="body2" color="warning.main" data-testid={"action-field-deleted-" + index}>{Locale.label("tasks.workflowActions.fieldDeleted")}</Typography>}
          </Stack>
        );
      }
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
                  {ACTION_TYPES.filter((t) => props.assignmentConfirmation ? !["sendEmail", "sendText", "addToWorkflow"].includes(t) : t !== "sendAssignmentRequest").map((t) => <MenuItem key={t} value={t}>{Locale.label("tasks.workflowActions.type." + t)}</MenuItem>)}
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
