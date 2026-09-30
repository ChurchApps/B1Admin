import React, { useCallback, useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { type PersonInterface } from "@churchapps/helpers";
import { ApiHelper, Locale, PersonHelper } from "@churchapps/apphelper";
import { PersonAdd } from "./PersonAdd";

interface Props {
  formSubmissionId: string;
  onClose: () => void;
  onUpdated: () => void;
}

// Moves a form submission to another person, or unlinks it (Anonymous). Same pick-a-person
// plus Anonymous pattern as the donor switcher on DonationEdit. Only the link changes:
// the Api sends no emails or webhooks for this.
export const SubmissionPersonDialog: React.FC<Props> = ({ formSubmissionId, onClose, onUpdated }) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const setPerson = useCallback(async (personId: string | null) => {
    setSaving(true);
    setError("");
    try {
      const result = await ApiHelper.post(`/formsubmissions/${formSubmissionId}/person`, { personId }, "MembershipApi");
      if (!result?.id) throw new Error("not saved");
      onUpdated();
      onClose();
    } catch {
      setError(Locale.label("common.saveError"));
    } finally {
      setSaving(false);
    }
  }, [formSubmissionId, onUpdated, onClose]);

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{Locale.label("forms.formSubmissions.changePerson")}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <PersonAdd getPhotoUrl={PersonHelper.getPhotoUrl} addFunction={(p: PersonInterface) => { if (p?.id) void setPerson(p.id); }} actionLabel={Locale.label("forms.formSubmissions.moveTo")} />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setPerson(null)} disabled={saving} data-testid="submission-unlink-button">{Locale.label("forms.formSubmissions.unlink")}</Button>
        <Button onClick={onClose} disabled={saving}>{Locale.label("common.cancel")}</Button>
      </DialogActions>
    </Dialog>
  );
};
