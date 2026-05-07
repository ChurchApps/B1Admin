import React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography, CircularProgress, Alert } from "@mui/material";
import { ApiHelper, Locale } from "@churchapps/apphelper";

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
      setError(err?.message || Locale.label("groups.sendTextDialog.fallbackError"));
    } finally {
      setSending(false);
    }
  };

  const getTitle = () => {
    if (isGroupMode) return Locale.label("groups.sendTextDialog.textGroupTitle").replace("{groupName}", props.groupName || "");
    return Locale.label("groups.sendTextDialog.textPersonTitle").replace("{personName}", props.personName || "");
  };

  const renderPreview = () => {
    if (!isGroupMode) return <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>{Locale.label("groups.sendTextDialog.sendingTo").replace("{phoneNumber}", props.phoneNumber || Locale.label("groups.sendTextDialog.phoneOnFile"))}</Typography>;
    if (loadingPreview) return <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>{Locale.label("groups.sendTextDialog.loadingRecipients")}</Typography>;
    if (!preview) return <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>{Locale.label("groups.sendTextDialog.sendDefault")}</Typography>;

    const eligibleSummary = preview.totalMembers !== 1
      ? Locale.label("groups.sendTextDialog.eligibleSummary")
      : Locale.label("groups.sendTextDialog.eligibleSummarySingular");
    const noPhoneNotice = preview.noPhoneCount !== 1
      ? Locale.label("groups.sendTextDialog.noPhoneNotice")
      : Locale.label("groups.sendTextDialog.noPhoneNoticeSingular");
    return (
      <Alert severity={preview.eligibleCount > 0 ? "info" : "warning"} sx={{ mb: 2 }}>
        {eligibleSummary.replace("{eligibleCount}", preview.eligibleCount.toString()).replace("{totalMembers}", preview.totalMembers.toString())}
        {preview.optedOutCount > 0 && <><br />{Locale.label("groups.sendTextDialog.optedOutNotice").replace("{count}", preview.optedOutCount.toString())}</>}
        {preview.noPhoneCount > 0 && <><br />{noPhoneNotice.replace("{count}", preview.noPhoneCount.toString())}</>}
      </Alert>
    );
  };

  const renderResult = () => {
    if (!result) return null;
    const isGroup = result.totalMembers !== undefined && result.totalMembers > 1;
    const sentSummary = result.recipientCount !== 1
      ? Locale.label("groups.sendTextDialog.sentSummary")
      : Locale.label("groups.sendTextDialog.sentSummarySingular");
    return (
      <>
        <Alert severity={result.failCount === 0 ? "success" : "warning"} sx={{ mt: 1 }}>
          {sentSummary.replace("{successCount}", result.successCount.toString()).replace("{recipientCount}", result.recipientCount.toString())}
          {result.failCount > 0 && <><br />{Locale.label("groups.sendTextDialog.sendFailedDetail").replace("{count}", result.failCount.toString())}</>}
        </Alert>
        {isGroup && (result.optedOutCount > 0 || result.noPhoneCount > 0) && (
          <Alert severity="info" sx={{ mt: 1 }}>
            {result.optedOutCount > 0 && <>{Locale.label("groups.sendTextDialog.optedOutSkipped").replace("{count}", result.optedOutCount.toString())}<br /></>}
            {result.noPhoneCount > 0 && <>{Locale.label("groups.sendTextDialog.noPhoneSkipped").replace("{count}", result.noPhoneCount.toString())}</>}
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
              label={Locale.label("groups.sendTextDialog.messageLabel")}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={sending}
              inputProps={{ maxLength: 1600 }}
            />
            <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: "block" }}>
              {(charCount !== 1
                ? Locale.label("groups.sendTextDialog.characterCount")
                : Locale.label("groups.sendTextDialog.characterCountSingular")
              ).replace("{count}", charCount.toString()).replace("{segments}", segmentCount.toString())}
            </Typography>
          </>
        )}
      </DialogContent>
      <DialogActions>
        {result ? (
          <Button onClick={props.onClose}>{Locale.label("common.close")}</Button>
        ) : (
          <>
            <Button onClick={props.onClose} disabled={sending}>{Locale.label("common.cancel")}</Button>
            <Button
              variant="contained"
              onClick={handleSend}
              disabled={!canSend}
              startIcon={sending ? <CircularProgress size={16} /> : null}
            >
              {sending ? Locale.label("groups.sendTextDialog.sending") : Locale.label("groups.sendTextDialog.send")}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};
