import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, CircularProgress, Alert } from "@mui/material";
import { ApiHelper, UserHelper } from "@churchapps/apphelper";

interface Props {
  open: boolean;
  personName: string;
  personEmail: string;
  contextName: string;
  onClose: () => void;
}

export const SendInviteDialog: React.FC<Props> = (props) => {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSend = async () => {
    setSending(true);
    setError("");
    try {
      await ApiHelper.post("/users/sendInviteEmail", {
        email: props.personEmail,
        personName: props.personName,
        contextName: props.contextName,
        churchName: UserHelper.currentUserChurch?.church?.name || ""
      }, "MembershipApi");
      setSent(true);
      setTimeout(() => props.onClose(), 1500);
    } catch (err: any) {
      setError(err?.message || "Failed to send invite email.");
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (!sending) props.onClose();
  };

  return (
    <Dialog open={props.open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Send Invite Email?</DialogTitle>
      <DialogContent>
        {sent ? (
          <Alert severity="success">Invite email sent to {props.personEmail}.</Alert>
        ) : (
          <>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Typography>
              <strong>{props.personName}</strong> has been added to <strong>{props.contextName}</strong>.
              Would you like to send them an email invitation at <strong>{props.personEmail}</strong>?
            </Typography>
          </>
        )}
      </DialogContent>
      {!sent && (
        <DialogActions>
          <Button onClick={handleClose} disabled={sending}>No Thanks</Button>
          <Button variant="contained" onClick={handleSend} disabled={sending} startIcon={sending ? <CircularProgress size={16} /> : null}>
            Send Invite
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};
