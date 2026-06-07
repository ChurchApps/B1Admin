import React from "react";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, FormControl, InputLabel, Select, MenuItem, TextField, Stack, Typography, FormControlLabel, Switch, IconButton, Box, ToggleButtonGroup, ToggleButton } from "@mui/material";
import { Delete as DeleteIcon, Add as AddIcon } from "@mui/icons-material";

interface FieldDef { key: string; label: string; type: string; options?: { value: string; label: string }[]; optionsSource?: string }
interface EventDef { eventType: string; label: string; recordType: string; fields: FieldDef[] }
interface ConditionRow { field: string; operator: string; value: string }
export interface WorkflowTriggerInterface { id?: string; name?: string; eventType?: string; workflowId?: string; stepId?: string; conditions?: string; oncePerSubject?: boolean; active?: boolean }
interface StepInterface { id?: string; name?: string }

interface Props {
  trigger: WorkflowTriggerInterface;
  workflowId: string; // the trigger always targets this one workflow (board context)
  events: EventDef[];
  onClose: () => void;
  onSave: () => void;
}

const OPERATOR_LABELS: Record<string, string> = { "=": "is", "!=": "is not", ">": "greater than", "<": "less than", ">=": "at least", "<=": "at most", contains: "contains", in: "is one of", notIn: "is not one of" };

const operatorsFor = (type?: string): string[] => {
  switch (type) {
    case "number": return ["=", "!=", ">", "<", ">=", "<="];
    case "select": return ["=", "!=", "in", "notIn"];
    case "string": return ["=", "!=", "contains", "in", "notIn"];
    default: return ["=", "!="];
  }
};

export const TriggerEditDialog: React.FC<Props> = (props) => {
  const [name, setName] = React.useState(props.trigger.name || "");
  const [eventType, setEventType] = React.useState(props.trigger.eventType || "");
  const workflowId = props.workflowId;
  const [stepId, setStepId] = React.useState(props.trigger.stepId || "");
  const [oncePerSubject, setOncePerSubject] = React.useState(props.trigger.oncePerSubject ?? true);
  const [active, setActive] = React.useState(props.trigger.active ?? true);
  const [conjunction, setConjunction] = React.useState<"AND" | "OR">("AND");
  const [rows, setRows] = React.useState<ConditionRow[]>([]);
  const [steps, setSteps] = React.useState<StepInterface[]>([]);
  const [dynamicOptions, setDynamicOptions] = React.useState<Record<string, { value: string; label: string }[]>>({});

  // Parse the stored condition tree (one root group + flat condition rows) once.
  React.useEffect(() => {
    try {
      const parsed = props.trigger.conditions ? JSON.parse(props.trigger.conditions) : null;
      if (parsed?.type === "group") {
        setConjunction(parsed.conjunction === "OR" ? "OR" : "AND");
        setRows((parsed.children || []).filter((c: any) => c.type === "condition").map((c: any) => ({ field: c.field, operator: c.operator, value: c.value })));
      }
    } catch { /* ignore malformed */ }
  }, [props.trigger.conditions]);

  const eventDef = props.events.find((e) => e.eventType === eventType);

  React.useEffect(() => {
    if (!workflowId) { setSteps([]); return; }
    ApiHelper.get("/workflowSteps/workflow/" + workflowId, "DoingApi").then((s: StepInterface[]) => setSteps(s || []));
  }, [workflowId]);

  // Load dynamic option lists (funds, groups) referenced by the current event's fields.
  React.useEffect(() => {
    const sources = new Set((eventDef?.fields || []).map((f) => f.optionsSource).filter(Boolean) as string[]);
    sources.forEach((src) => {
      if (dynamicOptions[src]) return;
      if (src === "funds") ApiHelper.get("/funds", "GivingApi").then((f: any[]) => setDynamicOptions((p) => ({ ...p, funds: (f || []).map((x) => ({ value: x.id, label: x.name })) })));
      else if (src === "groups") ApiHelper.get("/groups", "MembershipApi").then((g: any[]) => setDynamicOptions((p) => ({ ...p, groups: (g || []).map((x) => ({ value: x.id, label: x.name })) })));
      else if (src === "forms") ApiHelper.get("/forms", "MembershipApi").then((f: any[]) => setDynamicOptions((p) => ({ ...p, forms: (f || []).map((x) => ({ value: x.id, label: x.name })) })));
    });
  }, [eventType]);

  const fieldDef = (key: string) => eventDef?.fields.find((f) => f.key === key);
  const optionsForField = (f?: FieldDef) => f?.options || (f?.optionsSource ? dynamicOptions[f.optionsSource] : undefined) || [];

  const addRow = () => {
    const first = eventDef?.fields[0];
    if (!first) return;
    setRows([...rows, { field: first.key, operator: operatorsFor(first.type)[0], value: "" }]);
  };

  const updateRow = (i: number, patch: Partial<ConditionRow>) => {
    setRows(rows.map((r, idx) => {
      if (idx !== i) return r;
      const next = { ...r, ...patch };
      if (patch.field) next.operator = operatorsFor(fieldDef(patch.field)?.type)[0]; // reset op when field changes
      if (patch.field) next.value = "";
      return next;
    }));
  };

  const removeRow = (i: number) => setRows(rows.filter((_, idx) => idx !== i));

  const canSave = !!name && !!eventType && !!workflowId && rows.every((r) => r.field && r.operator && (r.value !== "" || r.operator === "!=" || r.operator === "notIn"));

  const save = async () => {
    const conditions = rows.length > 0
      ? JSON.stringify({ type: "group", conjunction, children: rows.map((r) => ({ type: "condition", field: r.field, operator: r.operator, value: r.value })) })
      : null;
    await ApiHelper.post("/workflowTriggers", [{ id: props.trigger.id, name, eventType, workflowId, stepId: stepId || null, conditions, oncePerSubject, active }], "DoingApi");
    props.onSave();
  };

  const renderValueInput = (row: ConditionRow, i: number) => {
    const f = fieldDef(row.field);
    const opts = optionsForField(f);
    const useSelect = opts.length > 0 && (row.operator === "=" || row.operator === "!=");
    if (useSelect) {
      return (
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>{Locale.label("tasks.eventTriggers.value")}</InputLabel>
          <Select label={Locale.label("tasks.eventTriggers.value")} value={row.value} data-testid={"condition-value-" + i} onChange={(e) => updateRow(i, { value: e.target.value })}>
            {opts.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </Select>
        </FormControl>
      );
    }
    return (
      <TextField size="small" label={Locale.label("tasks.eventTriggers.value")} type={f?.type === "number" ? "number" : "text"} value={row.value} data-testid={"condition-value-" + i} onChange={(e) => updateRow(i, { value: e.target.value })} sx={{ minWidth: 140 }} />
    );
  };

  return (
    <Dialog open={true} onClose={props.onClose} maxWidth="md" fullWidth>
      <DialogTitle>{props.trigger.id ? Locale.label("tasks.eventTriggers.editTrigger") : Locale.label("tasks.eventTriggers.addTrigger")}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField fullWidth size="small" label={Locale.label("tasks.eventTriggers.name")} value={name} data-testid="trigger-name" onChange={(e) => setName(e.target.value)} />

          <FormControl fullWidth size="small">
            <InputLabel>{Locale.label("tasks.eventTriggers.event")}</InputLabel>
            <Select label={Locale.label("tasks.eventTriggers.event")} value={eventType} data-testid="trigger-event-select" onChange={(e) => { setEventType(e.target.value); setRows([]); }}>
              {props.events.map((ev) => <MenuItem key={ev.eventType} value={ev.eventType}>{ev.label}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel shrink>{Locale.label("tasks.eventTriggers.step")}</InputLabel>
            <Select displayEmpty label={Locale.label("tasks.eventTriggers.step")} value={stepId} data-testid="trigger-step-select" onChange={(e) => setStepId(e.target.value)}>
              <MenuItem value="">{Locale.label("tasks.eventTriggers.firstStep")}</MenuItem>
              {steps.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
            </Select>
          </FormControl>

          <Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="subtitle2">{Locale.label("tasks.eventTriggers.conditions")}</Typography>
              <ToggleButtonGroup size="small" exclusive value={conjunction} onChange={(_e, v) => v && setConjunction(v)} data-testid="condition-conjunction">
                <ToggleButton value="AND">{Locale.label("tasks.eventTriggers.matchAll")}</ToggleButton>
                <ToggleButton value="OR">{Locale.label("tasks.eventTriggers.matchAny")}</ToggleButton>
              </ToggleButtonGroup>
            </Stack>

            {rows.length === 0 && <Typography variant="body2" color="text.secondary">{Locale.label("tasks.eventTriggers.noConditions")}</Typography>}

            <Stack spacing={1}>
              {rows.map((row, i) => (
                <Stack key={i} direction="row" spacing={1} alignItems="center">
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>{Locale.label("tasks.eventTriggers.field")}</InputLabel>
                    <Select label={Locale.label("tasks.eventTriggers.field")} value={row.field} data-testid={"condition-field-" + i} onChange={(e) => updateRow(i, { field: e.target.value })}>
                      {(eventDef?.fields || []).map((f) => <MenuItem key={f.key} value={f.key}>{f.label}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 130 }}>
                    <InputLabel>{Locale.label("tasks.eventTriggers.operator")}</InputLabel>
                    <Select label={Locale.label("tasks.eventTriggers.operator")} value={row.operator} data-testid={"condition-operator-" + i} onChange={(e) => updateRow(i, { operator: e.target.value })}>
                      {operatorsFor(fieldDef(row.field)?.type).map((op) => <MenuItem key={op} value={op}>{OPERATOR_LABELS[op] || op}</MenuItem>)}
                    </Select>
                  </FormControl>
                  {renderValueInput(row, i)}
                  <IconButton size="small" onClick={() => removeRow(i)} data-testid={"remove-condition-" + i}><DeleteIcon fontSize="small" /></IconButton>
                </Stack>
              ))}
            </Stack>

            <Button size="small" startIcon={<AddIcon />} disabled={!eventDef} onClick={addRow} data-testid="add-condition-button" sx={{ mt: 1 }}>{Locale.label("tasks.eventTriggers.addCondition")}</Button>
          </Box>

          <Stack direction="row" spacing={3}>
            <FormControlLabel control={<Switch checked={oncePerSubject} data-testid="trigger-once" onChange={(e) => setOncePerSubject(e.target.checked)} />} label={Locale.label("tasks.eventTriggers.oncePerSubject")} />
            <FormControlLabel control={<Switch checked={active} data-testid="trigger-active" onChange={(e) => setActive(e.target.checked)} />} label={Locale.label("tasks.eventTriggers.active")} />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={props.onClose}>{Locale.label("common.cancel")}</Button>
        <Button variant="contained" disabled={!canSave} data-testid="save-trigger-button" onClick={save}>{Locale.label("common.save")}</Button>
      </DialogActions>
    </Dialog>
  );
};
