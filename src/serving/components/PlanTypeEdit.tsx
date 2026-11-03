import React from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from "@mui/material";
import { useForm } from "react-hook-form";
import { ApiHelper, DateHelper, Locale } from "@churchapps/apphelper";
import { FormCard, TextAction } from "../../components/ui";
import { useConfirmDelete, useErrorSummary } from "../../hooks";
import { type PlanTypeInterface } from "../../helpers";
import { PlanTypeReminderEdit } from "./PlanTypeReminderEdit";
import { fillLabel } from "./LessonTrimConfirm";

interface Props {
  planType: PlanTypeInterface | null;
  onClose: () => void;
}

type AnyRecord = Record<string, any>;

export const PlanTypeEdit: React.FC<Props> = ({ planType, onClose }) => {
  const [loading, setLoading] = React.useState(false);
  const { confirm, ConfirmDialogElement } = useConfirmDelete();
  const [lessonTrim, setLessonTrim] = React.useState<{ keep?: unknown[]; savedFromName?: string; savedFromDate?: string } | null>(() => {
    try { return planType?.lessonTrim ? JSON.parse(planType.lessonTrim) : null; } catch { return null; }
  });

  const clearLessonTrim = async () => {
    await ApiHelper.delete(`/planTypes/${planType?.id}/lessonTrim`, "DoingApi");
    setLessonTrim(null);
  };

  const { register, handleSubmit, setError, formState } = useForm<AnyRecord>({ defaultValues: { name: planType?.name || "" } });
  const e = formState.errors as any;
  const summaryErrors = useErrorSummary(formState.errors, ["name"]);

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
    if (!(await confirm(Locale.label("plans.planTypeEdit.confirmDelete") || "Are you sure you want to delete this plan type?"))) return;
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
    <>
      {ConfirmDialogElement}
      <Dialog open={true} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>{planType?.id ? Locale.label("plans.planTypeEdit.edit") : Locale.label("plans.planTypeEdit.add")} {Locale.label("plans.planTypeEdit.planType")}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {summaryErrors.length > 0 && <Alert severity="error" sx={{ mb: 2 }}>{summaryErrors.map((msg) => <div key={msg}>{msg}</div>)}</Alert>}
            <FormCard icon="assignment" title={Locale.label("plans.planType.details")}>
              <TextField fullWidth label={Locale.label("plans.planTypeEdit.planTypeName")} required margin="normal" placeholder={Locale.label("placeholders.planType.name")} error={!!e.name} helperText={e.name?.message} {...register("name", { required: Locale.label("plans.planTypeEdit.nameRequired") })} />
              {lessonTrim && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }} data-testid="lesson-trim-status">
                  <Typography variant="body2" color="text.secondary">
                    {fillLabel(Locale.label("plans.lessonTrim.status"), lessonTrim.keep?.length || 0, lessonTrim.savedFromName || "", lessonTrim.savedFromDate ? DateHelper.prettyDate(DateHelper.toDate(lessonTrim.savedFromDate)) : "")}
                  </Typography>
                  <TextAction small onClick={clearLessonTrim}>{Locale.label("plans.lessonTrim.clear")}</TextAction>
                </Box>
              )}
            </FormCard>
            {planType?.id && <PlanTypeReminderEdit planTypeId={planType.id} />}
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
    </>
  );
};
