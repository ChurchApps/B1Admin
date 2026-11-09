import React from "react";
import { Alert, Button, Snackbar, Stack, TextField, Typography } from "@mui/material";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { type PlanInterface } from "../../../helpers";
import { RecordHeading, Surface, TextAction } from "../../../components/ui";

interface Props {
  plan: PlanInterface;
  canEdit: boolean;
  onSaved: () => void;
}

export const PlanNotes = ({ plan, canEdit, onSaved }: Props) => {
  const [editing, setEditing] = React.useState(false);
  const [notes, setNotes] = React.useState(plan.notes || "");
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState(false);

  React.useEffect(() => { if (!editing) setNotes(plan.notes || ""); }, [plan.notes, editing]);

  const handleSave = async () => {
    try {
      await ApiHelper.post("/plans", [{ ...plan, notes }], "DoingApi");
      setEditing(false);
      setSaved(true);
      onSaved();
    } catch {
      setError(true);
    }
  };

  return (
    <Surface aria-labelledby="plan-notes-heading" data-testid="plan-notes">
      <RecordHeading id="plan-notes-heading" label={Locale.label("common.notes")}>
        {canEdit && !editing && <TextAction small onClick={() => setEditing(true)} data-testid="plan-notes-edit">{Locale.label("common.edit")}</TextAction>}
      </RecordHeading>
      {editing ? (
        <Stack spacing={1.5} alignItems="flex-start">
          <TextField
            fullWidth
            multiline
            minRows={4}
            autoFocus
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            data-testid="plan-notes-input"
            slotProps={{ htmlInput: { "aria-label": Locale.label("plans.assignment.planNotesAria") } }}
            placeholder={Locale.label("plans.assignment.notesPlaceholder")}
          />
          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={handleSave} data-testid="save-plan-notes-button">{Locale.label("plans.assignment.saveNotes")}</Button>
            <Button onClick={() => { setNotes(plan.notes || ""); setEditing(false); }}>{Locale.label("common.cancel")}</Button>
          </Stack>
        </Stack>
      ) : (
        <Typography variant="body2" color={plan.notes ? "text.primary" : "text.secondary"} sx={{ whiteSpace: "pre-line", overflowWrap: "anywhere" }} data-testid="plan-notes-text">
          {plan.notes || (canEdit ? Locale.label("plans.assignment.notesPlaceholder") : Locale.label("plans.assignment.notesPlaceholderReadOnly"))}
        </Typography>
      )}
      <Snackbar open={saved} autoHideDuration={3000} onClose={() => setSaved(false)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert onClose={() => setSaved(false)} severity="success" variant="filled">{Locale.label("plans.planPage.noteSave") || "Notes saved"}</Alert>
      </Snackbar>
      <Snackbar open={error} autoHideDuration={6000} onClose={() => setError(false)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert onClose={() => setError(false)} severity="error" variant="filled">{Locale.label("common.saveError")}</Alert>
      </Snackbar>
    </Surface>
  );
};
