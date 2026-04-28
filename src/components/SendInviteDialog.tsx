import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, CircularProgress, Alert } from "@mui/material";
import { ApiHelper, UserHelper, Locale } from "@churchapps/apphelper";

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
      setError(err?.message || Locale.label("components.sendInviteDialog.errorFailed"));
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (!sending) props.onClose();
  };

  return (
    <Dialog open={props.open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>{Locale.label("components.sendInviteDialog.ariaTitle")}</DialogTitle>
      <DialogContent>
        {sent ? (
          <Alert severity="success">{Locale.label("components.sendInviteDialog.sentMessage").replace("{personEmail}", props.personEmail)}</Alert>
        ) : (
          <>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Typography>
              {Locale.label("components.sendInviteDialog.addedMessage")
                .replace("{personName}", props.personName)
                .replace("{contextName}", props.contextName)
                .replace("{personEmail}", props.personEmail)}
            </Typography>
          </>
        )}
      </DialogContent>
      {!sent && (
        <DialogActions>
          <Button onClick={handleClose} disabled={sending}>{Locale.label("components.sendInviteDialog.noThanks")}</Button>
          <Button variant="contained" onClick={handleSend} disabled={sending} startIcon={sending ? <CircularProgress size={16} /> : null}>
            {Locale.label("components.sendInviteDialog.sendInvite")}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};
