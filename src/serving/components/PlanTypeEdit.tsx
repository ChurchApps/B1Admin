import React from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import { useForm } from "react-hook-form";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { FormCard } from "../../components/ui";
import { type PlanTypeInterface } from "../../helpers";

interface Props {
  planType: PlanTypeInterface | null;
  onClose: () => void;
}

type AnyRecord = Record<string, any>;

export const PlanTypeEdit: React.FC<Props> = ({ planType, onClose }) => {
  const [loading, setLoading] = React.useState(false);

  const { register, handleSubmit, setError, formState } = useForm<AnyRecord>({ defaultValues: { name: planType?.name || "", reminderOffsets: planType?.reminderOffsets ?? "2", reminderMessage: planType?.reminderMessage ?? "" } });
  const e = formState.errors as any;
  const summaryErrors: string[] = [];
  if (e.name?.message) summaryErrors.push(e.name.message);

  const onValid = async (values: AnyRecord) => {
    setLoading(true);
    try {
      await ApiHelper.post("/planTypes", [{ ...planType, ...values }], "DoingApi");
      onClose();
    } catch (error: any) {
      setError("name", { message: error.message || Locale.label("plans.planTypeEdit.errorSaving") });
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!window.confirm(Locale.label("plans.planTypeEdit.confirmDelete") || "Are you sure you want to delete this plan type?")) return;
    setLoading(true);
    try {
      await ApiHelper.delete("/planTypes/" + planType?.id, "DoingApi");
      onClose();
    } catch (error: any) {
      setError("name", { message: error.message || Locale.label("plans.planTypeEdit.errorDeleting") });
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{planType?.id ? Locale.label("plans.planTypeEdit.edit") : Locale.label("plans.planTypeEdit.add")} {Locale.label("plans.planTypeEdit.planType")}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          {summaryErrors.length > 0 && <Alert severity="error" sx={{ mb: 2 }}>{summaryErrors.map((msg) => <div key={msg}>{msg}</div>)}</Alert>}
          <FormCard icon="assignment" title={Locale.label("plans.planType.details")}>
            <TextField fullWidth label={Locale.label("plans.planTypeEdit.planTypeName")} required margin="normal" placeholder={Locale.label("placeholders.planType.name")} error={!!e.name} helperText={e.name?.message} {...register("name", { required: Locale.label("plans.planTypeEdit.nameRequired") })} />
          </FormCard>
          <FormCard icon="notifications" title={Locale.label("plans.planTypeEdit.reminders") || "Reminders"}>
            <TextField fullWidth label={Locale.label("plans.planTypeEdit.reminderOffsets") || "Reminder days before service"} margin="normal" placeholder="7,1,0" helperText={Locale.label("plans.planTypeEdit.reminderOffsetsHelp") || "Comma-separated days before the service to send reminders (0 = day of). Leave blank to turn reminders off."} {...register("reminderOffsets")} />
            <TextField fullWidth multiline minRows={2} label={Locale.label("plans.planTypeEdit.reminderMessage") || "Custom reminder message (optional)"} margin="normal" helperText={Locale.label("plans.planTypeEdit.reminderMessageHelp") || "Added to the reminder email/notification for this plan type."} {...register("reminderMessage")} />
          </FormCard>
        </Box>
      </DialogContent>
      <DialogActions>
        {planType?.id && (
          <Button onClick={handleDelete} disabled={loading} sx={{ mr: "auto" }}>
            {Locale.label("common.delete")}
          </Button>
        )}
        <Button onClick={onClose} disabled={loading}>
          {Locale.label("common.cancel")}
        </Button>
        <Button onClick={handleSubmit(onValid)} variant="contained" disabled={loading}>
          {Locale.label("common.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
