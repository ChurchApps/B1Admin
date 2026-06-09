import React from "react";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { Box, Button, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography, Chip } from "@mui/material";
import { Bolt as TriggerIcon, Schedule as ScheduleIcon, Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { AppIconButton } from "../../../../components/ui/AppIconButton";
import { TriggerEditDialog, type WorkflowTriggerInterface } from "./TriggerEditDialog";

interface EventDef { eventType: string; label: string; recordType: string; fields: { key: string; label: string; type: string; options?: { value: string; label: string }[]; optionsSource?: string }[] }

interface Props {
  workflowId: string;
  canManage?: boolean;
}

// Triggers are managed per-workflow: a trigger always adds people to this one workflow,
// so its editor lives here (the workflow is implied — no picker). Rendered inline in the
// board's Triggers tab. Supports both event-driven and scheduled (recurring) rules.
export const WorkflowTriggersManager: React.FC<Props> = (props) => {
  const [triggers, setTriggers] = React.useState<WorkflowTriggerInterface[]>([]);
  const [events, setEvents] = React.useState<EventDef[]>([]);
  const [editing, setEditing] = React.useState<WorkflowTriggerInterface | null>(null);

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

  const remove = async (e: React.MouseEvent, id?: string) => {
    e.stopPropagation();
    if (!id) return;
    await ApiHelper.delete("/workflowTriggers/" + id, "DoingApi");
    load();
  };

  // Close on save; to add conditions to a brand-new schedule rule, reopen it (now it
  // has an id + a server-created root conjunction) — mirrors the "save step first" flow.
  const handleSaved = () => { setEditing(null); load(); };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{Locale.label("tasks.eventTriggers.subtitle")}</Typography>
      <List dense>
        {triggers.map((t) => (
          <ListItem
            key={t.id}
            disablePadding
            secondaryAction={props.canManage ? <AppIconButton label={Locale.label("common.delete")} icon={<DeleteIcon />} intent="remove" edge="end" data-testid={"remove-event-trigger-" + t.id} onClick={(e) => remove(e, t.id)} /> : undefined}>
            <ListItemButton data-testid={"event-trigger-row-" + t.id} onClick={() => props.canManage && setEditing(t)} sx={{ borderRadius: 1, mb: 0.5, border: "1px solid", borderColor: "divider" }}>
              <ListItemIcon>{isSchedule(t) ? <ScheduleIcon sx={{ color: t.active ? "primary.main" : "grey.400" }} /> : <TriggerIcon sx={{ color: t.active ? "primary.main" : "grey.400" }} />}</ListItemIcon>
              <ListItemText primary={t.name} secondary={descriptor(t)} />
              {!t.active && <Chip size="small" label={Locale.label("tasks.workflowEdit.inactive")} />}
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

      {editing && (
        <TriggerEditDialog trigger={editing} workflowId={props.workflowId} events={events} onClose={() => setEditing(null)} onSave={handleSaved} />
      )}
    </Box>
  );
};
