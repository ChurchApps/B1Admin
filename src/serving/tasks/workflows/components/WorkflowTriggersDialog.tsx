import React from "react";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, FormControl, InputLabel, Select, MenuItem, List, ListItem, ListItemText, IconButton, Typography, Stack } from "@mui/material";
import { Delete as DeleteIcon, Add as AddIcon } from "@mui/icons-material";
import { type FormWorkflowTriggerInterface } from "@churchapps/helpers";

interface FormInterface { id?: string; name?: string }

interface Props {
  workflowId: string;
  onClose: () => void;
}

export const WorkflowTriggersDialog: React.FC<Props> = (props) => {
  const [forms, setForms] = React.useState<FormInterface[]>([]);
  const [triggers, setTriggers] = React.useState<FormWorkflowTriggerInterface[]>([]);
  const [formId, setFormId] = React.useState("");

  const load = async () => {
    const [f, t] = await Promise.all([
      ApiHelper.get("/forms", "MembershipApi"),
      ApiHelper.get("/formWorkflowTriggers/workflow/" + props.workflowId, "DoingApi")
    ]);
    setForms(f || []);
    setTriggers(t || []);
  };

  React.useEffect(() => { load(); }, [props.workflowId]);

  const addTrigger = async () => {
    if (!formId) return;
    await ApiHelper.post("/formWorkflowTriggers", [{ formId, workflowId: props.workflowId, active: true }], "DoingApi");
    setFormId("");
    load();
  };

  const removeTrigger = async (id?: string) => {
    if (!id) return;
    await ApiHelper.delete("/formWorkflowTriggers/" + id, "DoingApi");
    load();
  };

  const formName = (id?: string) => forms.find((f) => f.id === id)?.name || id;

  return (
    <Dialog open={true} onClose={props.onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{Locale.label("tasks.workflowTriggers.title")}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{Locale.label("tasks.workflowTriggers.subtitle")}</Typography>
        <List dense>
          {triggers.map((t) => (
            <ListItem key={t.id} secondaryAction={<IconButton edge="end" onClick={() => removeTrigger(t.id)} data-testid={"remove-trigger-" + t.id}><DeleteIcon /></IconButton>}>
              <ListItemText primary={formName(t.formId)} secondary={Locale.label("tasks.workflowTriggers.formTrigger")} />
            </ListItem>
          ))}
          {triggers.length === 0 && <Typography variant="body2" color="text.secondary">{Locale.label("tasks.workflowTriggers.noTriggers")}</Typography>}
        </List>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel>{Locale.label("tasks.workflowTriggers.selectForm")}</InputLabel>
            <Select label={Locale.label("tasks.workflowTriggers.selectForm")} value={formId} data-testid="trigger-form-select" onChange={(e) => setFormId(e.target.value)}>
              {forms.map((f) => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
            </Select>
          </FormControl>
          <Button variant="contained" startIcon={<AddIcon />} disabled={!formId} data-testid="add-trigger-button" onClick={addTrigger}>{Locale.label("tasks.workflowTriggers.addTrigger")}</Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={props.onClose}>{Locale.label("common.close")}</Button>
      </DialogActions>
    </Dialog>
  );
};
