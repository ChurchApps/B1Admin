import React, { useCallback, useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { type PersonInterface } from "@churchapps/helpers";
import { ApiHelper, Locale, PersonHelper } from "@churchapps/apphelper";
import { PersonAdd } from "../../components/PersonAdd";

interface Props {
  eventId: string;
  onClose: () => void;
  onUpdated: () => void;
}

// #1603: moves a request (the event and every room/resource booking on it) to the person it is for,
// e.g. when staff entered it for a member. Same people search as SubmissionPersonDialog; a request
// always has a requester, so there is no unlink.
export const RequesterDialog: React.FC<Props> = ({ eventId, onClose, onUpdated }) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const setRequester = useCallback(async (personId: string) => {
    setSaving(true);
    setError("");
    try {
      const result = await ApiHelper.post(`/events/${eventId}/requester`, { personId }, "ContentApi");
      if (!result?.event) throw new Error("not saved");
      onUpdated();
      onClose();
    } catch {
      setError(Locale.label("common.saveError"));
    } finally {
      setSaving(false);
    }
  }, [eventId, onUpdated, onClose]);

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" data-testid="requester-dialog">
      <DialogTitle>{Locale.label("calendars.approvals.changeRequester")}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <PersonAdd getPhotoUrl={PersonHelper.getPhotoUrl} addFunction={(p: PersonInterface) => { if (p?.id && !saving) void setRequester(p.id); }} actionLabel={Locale.label("forms.formSubmissions.moveTo")} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>{Locale.label("common.cancel")}</Button>
      </DialogActions>
    </Dialog>
  );
};
