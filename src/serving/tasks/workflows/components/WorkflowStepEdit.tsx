import { Card, CardContent, Typography, Stack, Box, Button, TextField, Divider } from "@mui/material";
import React from "react";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { Save as SaveIcon, Cancel as CancelIcon, Delete as DeleteIcon, Person as PersonIcon } from "@mui/icons-material";
import { ContentPicker } from "../../components/ContentPicker";
import { WorkflowStepRouting } from "./WorkflowStepRouting";
import { WorkflowStepActions } from "./WorkflowStepActions";
import { useConfirmDelete } from "../../../../hooks";
import { type WorkflowStepInterface, type WorkflowInterface } from "@churchapps/helpers";
import "../types";

interface Props {
  step: WorkflowStepInterface;
  steps?: WorkflowStepInterface[];
  workflows?: WorkflowInterface[];
  onCancel: () => void;
  onSave: (keepOpen?: boolean) => void;
  onDelete?: () => void;
}

export const WorkflowStepEdit = (props: Props) => {
  const [step, setStep] = React.useState<WorkflowStepInterface>(props.step);
  const [showPicker, setShowPicker] = React.useState(false);
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  React.useEffect(() => { setStep(props.step); }, [props.step]);

  const handleSave = async () => {
    const isNew = !step.id;
    const result = await ApiHelper.post("/workflowSteps", [step], "DoingApi");
    // A brand-new step needs an id before its actions editor can appear; keep the
    // editor open on the now-saved record instead of forcing a save/close/reopen.
    if (isNew && result?.[0]?.id) {
      setStep(result[0]);
      props.onSave(true);
    } else {
      props.onSave();
    }
  };

  const handleDelete = async () => {
    if (!(await confirm(Locale.label("tasks.workflowStepEdit.confirmDelete") || "Are you sure you want to delete this step?"))) return;
    await ApiHelper.delete("/workflowSteps/" + step.id, "DoingApi");
    props.onDelete?.();
  };

  const handleNumber = (name: "expectedResponseDays", value: string) => {
    setStep({ ...step, [name]: value === "" ? undefined : Number(value) });
  };

  const handleAssign = (contentType: string, contentId: string, label: string) => {
    setStep({ ...step, defaultAssignToType: contentType, defaultAssignToId: contentId, defaultAssignToLabel: label });
    setShowPicker(false);
  };

  return (
    <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "grey.200" }}>
      {ConfirmDialogElement}
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>{Locale.label("tasks.workflowStepEdit.editStep")}</Typography>
          <TextField fullWidth label={Locale.label("tasks.workflowStepEdit.stepName")} value={step?.name || ""} data-testid="step-name-input" onChange={(e) => setStep({ ...step, name: e.target.value })} />

          <TextField fullWidth type="number" label={Locale.label("tasks.workflowStepEdit.dueDays")} value={step?.expectedResponseDays ?? ""} data-testid="step-due-days-input" onChange={(e) => handleNumber("expectedResponseDays", e.target.value)} helperText={Locale.label("tasks.workflowStepEdit.dueDaysHelp")} />
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="body2" color="text.secondary">{Locale.label("tasks.workflowStepEdit.defaultAssignee")}: {step?.defaultAssignToLabel || Locale.label("tasks.workflowBoard.unassigned")}</Typography>
            <Button size="small" startIcon={<PersonIcon />} onClick={() => setShowPicker(true)}>{Locale.label("tasks.workflowCard.assign")}</Button>
          </Box>

          <Divider />
          {step?.id
            ? <WorkflowStepActions stepId={step.id} workflows={props.workflows || []} />
            : <Typography variant="body2" color="text.secondary">{Locale.label("tasks.workflowActions.saveFirst")}</Typography>}

          <Divider />
          <WorkflowStepRouting step={step} steps={props.steps || []} workflows={props.workflows || []} />

          <Stack direction="row" spacing={2} justifyContent="flex-end">
            {step?.id && <Button variant="outlined" startIcon={<DeleteIcon />} data-testid="step-delete-button" onClick={handleDelete}>{Locale.label("common.delete")}</Button>}
            <Button variant="outlined" startIcon={<CancelIcon />} onClick={props.onCancel}>{Locale.label("common.cancel")}</Button>
            <Button variant="contained" startIcon={<SaveIcon />} data-testid="step-save-button" onClick={handleSave}>{Locale.label("common.save")}</Button>
          </Stack>
        </Stack>
      </CardContent>
      {showPicker && <ContentPicker onClose={() => setShowPicker(false)} onSelect={handleAssign} />}
    </Card>
  );
};
