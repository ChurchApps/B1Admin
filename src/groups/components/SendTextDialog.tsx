import React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography, CircularProgress, Alert } from "@mui/material";
import { ApiHelper } from "@churchapps/apphelper";

interface Props {
  // Group mode
  groupId?: string;
  groupName?: string;
  // Person mode
  personId?: string;
  personName?: string;
  phoneNumber?: string;
  // Common
  onClose: () => void;
}

interface PreviewData {
  totalMembers: number;
  eligibleCount: number;
  optedOutCount: number;
  noPhoneCount: number;
}

interface SendResult {
  totalMembers: number;
  recipientCount: number;
  successCount: number;
  failCount: number;
  optedOutCount: number;
  noPhoneCount: number;
}

export const SendTextDialog: React.FC<Props> = (props) => {
  const [message, setMessage] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [result, setResult] = React.useState<SendResult | null>(null);
  const [error, setError] = React.useState("");
  const [preview, setPreview] = React.useState<PreviewData | null>(null);
  const [loadingPreview, setLoadingPreview] = React.useState(false);

  const isGroupMode = !!props.groupId;
  const charCount = message.length;
  const segmentCount = charCount <= 160 ? 1 : Math.ceil(charCount / 153);

  React.useEffect(() => {
    if (!isGroupMode || !props.groupId) return;
    setLoadingPreview(true);
    ApiHelper.get("/texting/preview/" + props.groupId, "MessagingApi")
      .then((data) => { setPreview(data); })
      .catch(() => { /* preview is optional — allow send even if it fails */ })
      .finally(() => { setLoadingPreview(false); });
  }, [isGroupMode, props.groupId]);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    setError("");
    try {
      let resp;
      if (isGroupMode) {
        resp = await ApiHelper.post("/texting/send", { groupId: props.groupId, message }, "MessagingApi");
      } else {
        resp = await ApiHelper.post("/texting/sendPerson", { personId: props.personId, phoneNumber: props.phoneNumber, message }, "MessagingApi");
      }
      if (resp.error) {
        setError(resp.error);
      } else {
        setResult(resp);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to send text message.");
    } finally {
      setSending(false);
    }
  };

  const getTitle = () => {
    if (isGroupMode) return `Text Group: ${props.groupName || ""}`;
    return `Text: ${props.personName || ""}`;
  };

  const renderPreview = () => {
    if (!isGroupMode) return <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>Sending to {props.phoneNumber || "phone on file"}.</Typography>;
    if (loadingPreview) return <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>Loading recipients...</Typography>;
    if (!preview) return <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>This will send an SMS to eligible group members.</Typography>;

    return (
      <Alert severity={preview.eligibleCount > 0 ? "info" : "warning"} sx={{ mb: 2 }}>
        <strong>{preview.eligibleCount}</strong> of {preview.totalMembers} member{preview.totalMembers !== 1 ? "s" : ""} will receive this text.
        {preview.optedOutCount > 0 && <><br />{preview.optedOutCount} opted out.</>}
        {preview.noPhoneCount > 0 && <><br />{preview.noPhoneCount} ha{preview.noPhoneCount !== 1 ? "ve" : "s"} no phone number on file.</>}
      </Alert>
    );
  };

  const renderResult = () => {
    if (!result) return null;
    const isGroup = result.totalMembers !== undefined && result.totalMembers > 1;
    return (
      <>
        <Alert severity={result.failCount === 0 ? "success" : "warning"} sx={{ mt: 1 }}>
          Sent to {result.successCount} of {result.recipientCount} eligible recipient{result.recipientCount !== 1 ? "s" : ""}.
          {result.failCount > 0 && <><br />{result.failCount} failed to send.</>}
        </Alert>
        {isGroup && (result.optedOutCount > 0 || result.noPhoneCount > 0) && (
          <Alert severity="info" sx={{ mt: 1 }}>
            {result.optedOutCount > 0 && <>{result.optedOutCount} skipped (opted out).<br /></>}
            {result.noPhoneCount > 0 && <>{result.noPhoneCount} skipped (no phone number).</>}
          </Alert>
        )}
      </>
    );
  };

  const canSend = !sending && message.trim().length > 0 && (!isGroupMode || !preview || preview.eligibleCount > 0);

  return (
    <Dialog open={true} onClose={props.onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{getTitle()}</DialogTitle>
      <DialogContent>
        {result ? renderResult() : (
          <>
            {renderPreview()}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <TextField
              fullWidth
              multiline
              minRows={3}
              maxRows={6}
              label="Message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={sending}
              inputProps={{ maxLength: 1600 }}
            />
            <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: "block" }}>
              {charCount} character{charCount !== 1 ? "s" : ""} ({segmentCount} SMS segment{segmentCount !== 1 ? "s" : ""})
            </Typography>
          </>
        )}
      </DialogContent>
      <DialogActions>
        {result ? (
          <Button onClick={props.onClose}>Close</Button>
        ) : (
          <>
            <Button onClick={props.onClose} disabled={sending}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleSend}
              disabled={!canSend}
              startIcon={sending ? <CircularProgress size={16} /> : null}
            >
              {sending ? "Sending..." : "Send"}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};
