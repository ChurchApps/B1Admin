import React from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from "@mui/material";
import type { DialogProps } from "@mui/material";
import { Locale } from "@churchapps/apphelper";

interface Props {
  open: boolean;
  title: React.ReactNode;
  onClose: () => void;
  /** Throw (or reject) to keep the sheet open with a save error; the caller's field state is untouched. */
  onSubmit: () => void | Promise<unknown>;
  children: React.ReactNode;
  saveLabel?: string;
  saveDisabled?: boolean;
  /** Caller-owned error (e.g. from a rollback path); shown above the fields. */
  error?: string;
  maxWidth?: DialogProps["maxWidth"];
  "data-testid"?: string;
  saveTestId?: string;
}

// Short inline edit in a dialog: title, fields, Cancel + Save. Blocks close and double submit while saving.
export const Sheet: React.FC<Props> = ({ open, title, onClose, onSubmit, children, saveLabel, saveDisabled, error, maxWidth = "xs", saveTestId, ...rest }) => {
  const titleId = React.useId();
  const [saving, setSaving] = React.useState(false);
  const [submitError, setSubmitError] = React.useState("");
  const busy = React.useRef(false);

  React.useEffect(() => { if (open) setSubmitError(""); }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setSubmitError("");
    try {
      await onSubmit();
    } catch {
      setSubmitError(Locale.label("common.saveError"));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  const shownError = error || submitError;

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth={maxWidth} aria-labelledby={titleId}>
      <form onSubmit={handleSubmit} noValidate data-testid={rest["data-testid"]} aria-busy={saving || undefined}>
        <DialogTitle id={titleId}>{title}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {shownError && <Alert severity="error">{shownError}</Alert>}
            {children}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button variant="outlined" onClick={onClose} disabled={saving}>{Locale.label("common.cancel")}</Button>
          <Button variant="contained" type="submit" disabled={saving || saveDisabled} data-testid={saveTestId}>
            {saving ? Locale.label("common.saving") : saveLabel || Locale.label("common.save")}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
