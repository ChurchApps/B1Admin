import { Box, Typography, Card, CardContent, Stack, Button, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Chip } from "@mui/material";
import React from "react";
import { ApiHelper, Locale, Loading, PageHeader } from "@churchapps/apphelper";
import { EmptyState } from "../../../components/ui/EmptyState";
import { AppIconButton } from "../../../components/ui/AppIconButton";
import { TriggerEditDialog, type WorkflowTriggerInterface } from "./components/TriggerEditDialog";
import { type WorkflowInterface } from "@churchapps/helpers";
import { useQuery } from "@tanstack/react-query";
import { Bolt as TriggerIcon, Add as AddIcon, Delete as DeleteIcon, ArrowBack as BackIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { canViewWorkflows, canManageWorkflows } from "./permissions";

interface EventDef { eventType: string; label: string; recordType: string; fields: { key: string; label: string; type: string; options?: { value: string; label: string }[]; optionsSource?: string }[] }

export const TriggersPage = () => {
  const navigate = useNavigate();
  const [editing, setEditing] = React.useState<WorkflowTriggerInterface | null>(null);

  const canView = canViewWorkflows();
  const canManage = canManageWorkflows();

  const triggers = useQuery<WorkflowTriggerInterface[]>({ queryKey: ["/workflowTriggers", "DoingApi"], placeholderData: [], enabled: canView });
  const events = useQuery<EventDef[]>({ queryKey: ["/workflowTriggers/fields", "DoingApi"], placeholderData: [], enabled: canView });
  const workflows = useQuery<WorkflowInterface[]>({ queryKey: ["/workflows", "DoingApi"], placeholderData: [], enabled: canView });

  const eventLabel = (eventType?: string) => events.data?.find((e) => e.eventType === eventType)?.label || eventType;
  const workflowName = (id?: string) => workflows.data?.find((w) => w.id === id)?.name || id;

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

  const remove = async (e: React.MouseEvent, id?: string) => {
    e.stopPropagation();
    if (!id) return;
    await ApiHelper.delete("/workflowTriggers/" + id, "DoingApi");
    triggers.refetch();
  };

  const handleSaved = () => { setEditing(null); triggers.refetch(); };

  const getList = () => {
    if (triggers.isLoading) return <Loading />;
    if (!triggers.data || triggers.data.length === 0) {
      return <EmptyState icon={<TriggerIcon />} title={Locale.label("tasks.eventTriggers.noTriggers")} />;
    }
    return (
      <List sx={{ p: 0 }}>
        {triggers.data.map((t) => (
          <ListItem
            key={t.id}
            disablePadding
            secondaryAction={canManage ? <AppIconButton label={Locale.label("common.delete")} icon={<DeleteIcon />} intent="remove" edge="end" data-testid={"remove-event-trigger-" + t.id} onClick={(e) => remove(e, t.id)} /> : undefined}>
            <ListItemButton
              data-testid={"event-trigger-row-" + t.id}
              onClick={() => canManage && setEditing(t)}
              sx={{ borderRadius: 1, mb: 1, border: "1px solid", borderColor: "divider", "&:hover": { borderColor: "primary.main", backgroundColor: "action.hover" } }}>
              <ListItemIcon><TriggerIcon sx={{ color: t.active ? "primary.main" : "grey.400" }} /></ListItemIcon>
              <ListItemText
                primary={<Typography variant="h6" sx={{ fontWeight: 600, fontSize: "1rem" }}>{t.name}</Typography>}
                secondary={<Typography variant="body2" color="text.secondary">{eventLabel(t.eventType)} → {workflowName(t.workflowId)} · {conditionSummary(t.conditions)}</Typography>}
                slotProps={{ primary: { component: "div" }, secondary: { component: "div" } }}
              />
              {!t.active && <Chip size="small" label={Locale.label("tasks.workflowEdit.inactive")} sx={{ mr: 1 }} />}
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    );
  };

  if (!canView) return <Box sx={{ p: 4 }}><Typography>{Locale.label("common.noAccess")}</Typography></Box>;

  return (
    <>
      <PageHeader title={Locale.label("tasks.eventTriggers.title")} subtitle={Locale.label("tasks.eventTriggers.subtitle")}>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<BackIcon />} onClick={() => navigate("/serving/tasks/workflows")} sx={{ color: "#FFF", borderColor: "rgba(255,255,255,0.5)" }}>{Locale.label("tasks.workflowsPage.title")}</Button>
          {canManage && (
            <Button variant="outlined" startIcon={<AddIcon />} data-testid="add-event-trigger-button" onClick={() => setEditing({ active: true, oncePerSubject: true })} sx={{ color: "#FFF", borderColor: "rgba(255,255,255,0.5)", "&:hover": { borderColor: "#FFF", backgroundColor: "rgba(255,255,255,0.1)" } }}>
              {Locale.label("tasks.eventTriggers.addTrigger")}
            </Button>
          )}
        </Stack>
      </PageHeader>

      <Box sx={{ p: 3 }}>
        <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
              <TriggerIcon sx={{ color: "primary.main" }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>{Locale.label("tasks.eventTriggers.title")}</Typography>
            </Stack>
            {getList()}
          </CardContent>
        </Card>
      </Box>

      {editing && (
        <TriggerEditDialog trigger={editing} events={events.data || []} workflows={workflows.data || []} onClose={() => setEditing(null)} onSave={handleSaved} />
      )}
    </>
  );
};
