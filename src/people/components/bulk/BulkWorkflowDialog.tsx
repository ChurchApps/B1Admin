import React from "react";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, FormControl, InputLabel, Select, MenuItem, Typography } from "@mui/material";
import { type BulkResult } from "./BulkFieldDialog";
import { type WorkflowInterface } from "@churchapps/helpers";
import { useBulkApplyDialog } from "./useBulkApplyDialog";

interface Props {
  open: boolean;
  personIds: string[];
  onClose: () => void;
  onComplete: (result: BulkResult) => void;
}

export const BulkWorkflowDialog: React.FC<Props> = (props) => {
  const [workflowId, setWorkflowId] = React.useState("");
  const count = props.personIds.length;

  const { options: workflows, isSubmitting, handleApply } = useBulkApplyDialog<WorkflowInterface>({
    open: props.open,
    onClose: props.onClose,
    onComplete: props.onComplete,
    onOpen: () => setWorkflowId(""),
    loadOptions: () => ApiHelper.get("/workflows", "DoingApi").then((data: WorkflowInterface[]) => (data || []).filter((w) => w.active !== false)),
    apply: async () => {
      const people = props.personIds.map((id) => ({ id }));
      await ApiHelper.post("/tasks/bulkAddToWorkflow", { workflowId, people }, "DoingApi");
      return { message: Locale.label("people.bulk.workflowSuccess").replace("{count}", count.toString()), severity: "success" };
    }
  });

  return (
    <Dialog open={props.open} onClose={() => !isSubmitting && props.onClose()} maxWidth="xs" fullWidth>
      <DialogTitle>{Locale.label("people.bulk.addToWorkflow")}</DialogTitle>
      <DialogContent>
        <Typography sx={{ mb: 2 }}>{Locale.label("people.bulk.addToWorkflowPrompt").replace("{count}", count.toString())}</Typography>
        <FormControl fullWidth>
          <InputLabel id="bulk-workflow-label">{Locale.label("tasks.workflowsPage.title")}</InputLabel>
          <Select labelId="bulk-workflow-label" label={Locale.label("tasks.workflowsPage.title")} value={workflowId} onChange={(e) => setWorkflowId(e.target.value)} data-testid="bulk-workflow-select">
            {workflows.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose} variant="outlined" disabled={isSubmitting}>{Locale.label("common.cancel")}</Button>
        <Button onClick={handleApply} variant="contained" disabled={isSubmitting || !workflowId} data-testid="bulk-workflow-apply">{Locale.label("people.bulk.apply")}</Button>
      </DialogActions>
    </Dialog>
  );
};
