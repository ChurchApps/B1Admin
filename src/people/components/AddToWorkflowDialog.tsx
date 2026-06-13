import { Dialog, DialogTitle, DialogContent, DialogActions, Button, FormControl, InputLabel, Select, MenuItem, Box, Typography } from "@mui/material";
import React from "react";
import { ApiHelper, Locale, type PersonInterface } from "@churchapps/apphelper";
import { useQuery } from "@tanstack/react-query";
import { type WorkflowInterface } from "@churchapps/helpers";

interface Props {
  person: PersonInterface;
  onClose: () => void;
}

export const AddToWorkflowDialog: React.FC<Props> = (props) => {
  const [workflowId, setWorkflowId] = React.useState("");
  const [done, setDone] = React.useState(false);

  const workflows = useQuery<WorkflowInterface[]>({ queryKey: ["/workflows", "DoingApi"], placeholderData: [] });
  const activeWorkflows = (workflows.data || []).filter((w) => w.active !== false);

  const handleAdd = async () => {
    if (!workflowId) return;
    await ApiHelper.post("/tasks/addToWorkflow", { workflowId, associatedWith: { type: "person", id: props.person.id, label: props.person.name?.display } }, "DoingApi");
    setDone(true);
  };

  return (
    <Dialog open={true} onClose={props.onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle>{Locale.label("people.personBanner.addToWorkflow")}</DialogTitle>
      <DialogContent>
        {done ? (
          <Box sx={{ py: 2 }} data-testid="add-to-workflow-success"><Typography>{Locale.label("tasks.workflowsPage.added")}</Typography></Box>
        ) : (
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>{Locale.label("tasks.workflowsPage.title")}</InputLabel>
            <Select label={Locale.label("tasks.workflowsPage.title")} value={workflowId} data-testid="add-to-workflow-select" onChange={(e) => setWorkflowId(e.target.value)}>
              {activeWorkflows.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
            </Select>
          </FormControl>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button variant="outlined" onClick={props.onClose}>{Locale.label("common.close")}</Button>
        {!done && <Button variant="contained" disabled={!workflowId} data-testid="add-to-workflow-confirm" onClick={handleAdd}>{Locale.label("common.add")}</Button>}
      </DialogActions>
    </Dialog>
  );
};
