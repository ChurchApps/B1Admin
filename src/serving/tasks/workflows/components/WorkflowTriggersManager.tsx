import React from "react";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { Alert, Box, Button, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Stack, Typography, Chip } from "@mui/material";
import { Bolt as TriggerIcon, Schedule as ScheduleIcon, Add as AddIcon, Delete as DeleteIcon, Pause as PauseIcon, PlayArrow as ResumeIcon, PlaylistPlay as RunNowIcon } from "@mui/icons-material";
import { AppIconButton } from "../../../../components/ui/AppIconButton";
import { TriggerEditDialog, type WorkflowTriggerInterface } from "./TriggerEditDialog";
import { TriggerExecutionsPanel } from "./TriggerExecutionsPanel";

interface EventDef { eventType: string; label: string; recordType: string; fields: { key: string; label: string; type: string; options?: { value: string; label: string }[]; optionsSource?: string }[] }

interface Props {
  workflowId: string;
  canManage?: boolean;
}

// Run-now only works where a "current set" exists to apply against (mirrors the API).
const RUN_NOW_EVENT_TYPES = ["person.created", "person.updated", "group.member.added", "list.member.added"];

export const WorkflowTriggersManager: React.FC<Props> = (props) => {
  const [triggers, setTriggers] = React.useState<WorkflowTriggerInterface[]>([]);
  const [events, setEvents] = React.useState<EventDef[]>([]);
  const [editing, setEditing] = React.useState<WorkflowTriggerInterface | null>(null);
  const [runMessage, setRunMessage] = React.useState<string | null>(null);
  const [executionsKey, setExecutionsKey] = React.useState(0);

  const load = async () => {
    const [t, e] = await Promise.all([
      ApiHelper.get("/workflowTriggers/workflow/" + props.workflowId, "DoingApi"),
      ApiHelper.get("/workflowTriggers/fields", "DoingApi")
    ]);
    setTriggers(t || []);
    setEvents(e || []);
  };

  React.useEffect(() => { load(); }, [props.workflowId]);

  const eventLabel = (eventType?: string) => events.find((e) => e.eventType === eventType)?.label || eventType;

  const conditionSummary = (json?: string) => {
    if (!json) return Locale.label("tasks.eventTriggers.noConditions");
    try {
      const node = JSON.parse(json);
      const count = (node?.children || []).length;
      if (count === 0) return Locale.label("tasks.eventTriggers.noConditions");
      const join = node.conjunction === "OR" ? Locale.label("tasks.eventTriggers.matchAny") : Locale.label("tasks.eventTriggers.matchAll");
      return `${join} (${count})`;
    } catch { return ""; }
  };

  const isSchedule = (t: WorkflowTriggerInterface) => t.triggerKind === "schedule";
  const descriptor = (t: WorkflowTriggerInterface) => isSchedule(t)
    ? `${Locale.label("tasks.eventTriggers.kindSchedule")} · ${Locale.label("tasks.eventTriggers.recur_" + (t.recurs || "yearly"))}`
    : `${eventLabel(t.eventType)} · ${conditionSummary(t.conditions)}`;

  const canRunNow = (t: WorkflowTriggerInterface) => isSchedule(t) || RUN_NOW_EVENT_TYPES.includes(t.eventType || "");

  const remove = async (e: React.MouseEvent, id?: string) => {
    e.stopPropagation();
    if (!id) return;
    await ApiHelper.delete("/workflowTriggers/" + id, "DoingApi");
    load();
  };

  const togglePaused = async (e: React.MouseEvent, t: WorkflowTriggerInterface) => {
    e.stopPropagation();
    if (!t.id) return;
    await ApiHelper.post("/workflowTriggers/" + t.id + "/" + (t.active ? "pauseAll" : "resumeAll"), [], "DoingApi");
    load();
    setExecutionsKey((k) => k + 1);
  };

  const runNow = async (e: React.MouseEvent, t: WorkflowTriggerInterface) => {
    e.stopPropagation();
    if (!t.id) return;
    setRunMessage(null);
    try {
      const result = await ApiHelper.post("/workflowTriggers/" + t.id + "/runNow", [], "DoingApi");
      if (result?.error) setRunMessage(result.error);
      else setRunMessage(Locale.label("tasks.eventTriggers.runNowResult").replace("{created}", String(result?.created ?? 0)).replace("{skipped}", String(result?.skipped ?? 0)));
    } catch {
      setRunMessage(Locale.label("tasks.eventTriggers.runNowFailed"));
    }
    setExecutionsKey((k) => k + 1);
  };

  const handleSaved = () => { setEditing(null); load(); };

  const rowActions = (t: WorkflowTriggerInterface) => {
    if (!props.canManage) return undefined;
    return (
      <Stack direction="row" spacing={0.5}>
        {canRunNow(t) && <AppIconButton label={Locale.label("tasks.eventTriggers.runNow")} icon={<RunNowIcon />} data-testid={"run-now-trigger-" + t.id} onClick={(e) => runNow(e, t)} />}
        <AppIconButton
          label={t.active ? Locale.label("tasks.eventTriggers.pauseAll") : Locale.label("tasks.eventTriggers.resumeAll")}
          icon={t.active ? <PauseIcon /> : <ResumeIcon />}
          data-testid={"pause-trigger-" + t.id}
          onClick={(e) => togglePaused(e, t)} />
        <AppIconButton label={Locale.label("common.delete")} icon={<DeleteIcon />} intent="remove" edge="end" data-testid={"remove-event-trigger-" + t.id} onClick={(e) => remove(e, t.id)} />
      </Stack>
    );
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{Locale.label("tasks.eventTriggers.subtitle")}</Typography>
      {runMessage && <Alert severity="info" sx={{ mb: 1 }} data-testid="run-now-result" onClose={() => setRunMessage(null)}>{runMessage}</Alert>}
      <List dense>
        {triggers.map((t) => (
          <ListItem key={t.id} disablePadding secondaryAction={rowActions(t)}>
            <ListItemButton data-testid={"event-trigger-row-" + t.id} onClick={() => props.canManage && setEditing(t)} sx={{ borderRadius: 1, mb: 0.5, border: "1px solid", borderColor: "divider" }}>
              <ListItemIcon>{isSchedule(t) ? <ScheduleIcon sx={{ color: t.active ? "primary.main" : "grey.400" }} /> : <TriggerIcon sx={{ color: t.active ? "primary.main" : "grey.400" }} />}</ListItemIcon>
              <ListItemText primary={t.name} secondary={descriptor(t)} />
              {!t.active && <Chip size="small" label={Locale.label("tasks.eventTriggers.paused")} />}
            </ListItemButton>
          </ListItem>
        ))}
        {triggers.length === 0 && <Typography variant="body2" color="text.secondary">{Locale.label("tasks.eventTriggers.noTriggers")}</Typography>}
      </List>
      {props.canManage && (
        <Button variant="contained" startIcon={<AddIcon />} data-testid="add-event-trigger-button" onClick={() => setEditing({ active: true, oncePerSubject: true, triggerKind: "event" })} sx={{ mt: 1 }}>
          {Locale.label("tasks.eventTriggers.addTrigger")}
        </Button>
      )}

      <TriggerExecutionsPanel workflowId={props.workflowId} triggers={triggers} canManage={props.canManage} refreshKey={executionsKey} />

      {editing && (
        <TriggerEditDialog trigger={editing} workflowId={props.workflowId} events={events} onClose={() => setEditing(null)} onSave={handleSaved} />
      )}
    </Box>
  );
};
