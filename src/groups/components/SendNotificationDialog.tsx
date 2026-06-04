import React from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { NotificationsActive as NotificationsActiveIcon } from "@mui/icons-material";
import { ApiHelper } from "@churchapps/apphelper";

interface PreviewData {
  totalMembers: number;
  eligibleCount: number;
  noDeviceCount: number;
  pushDisabledCount: number;
  excludedSenderCount: number;
  webPushDeviceCount: number;
}

interface SendResult extends PreviewData {
  recipientCount: number;
  successCount: number;
  skippedCount: number;
}

interface Props {
  groupId: string;
  groupName: string;
  onClose: () => void;
}

const isOptionalUrlValid = (value: string) => {
  const trimmed = value.trim();
  return !trimmed || /^https?:\/\//i.test(trimmed) || trimmed.startsWith("/");
};

const isOptionalImageUrlValid = (value: string) => {
  const trimmed = value.trim();
  return !trimmed || /^https?:\/\//i.test(trimmed);
};

export const SendNotificationDialog: React.FC<Props> = (props) => {
  const [title, setTitle] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [link, setLink] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [result, setResult] = React.useState<SendResult | null>(null);
  const [error, setError] = React.useState("");
  const [preview, setPreview] = React.useState<PreviewData | null>(null);
  const [loadingPreview, setLoadingPreview] = React.useState(false);

  React.useEffect(() => {
    if (!props.groupId) return;
    setLoadingPreview(true);
    ApiHelper.get("/notifications/groupPreview/" + props.groupId, "MessagingApi")
      .then((data: any) => setPreview(data))
      .catch(() => setPreview(null))
      .finally(() => setLoadingPreview(false));
  }, [props.groupId]);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) return;
    setSending(true);
    setError("");
    try {
      const resp = await ApiHelper.post("/notifications/group/send", {
        groupId: props.groupId,
        title: title.trim(),
        message: message.trim(),
        link: link.trim(),
        imageUrl: imageUrl.trim()
      }, "MessagingApi");
      if (resp.error) setError(resp.error);
      else setResult(resp);
    } catch (err: any) {
      setError(err?.message || "Unable to send the push notification.");
    } finally {
      setSending(false);
    }
  };

  const renderPreview = () => {
    if (loadingPreview) return <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Loading recipients...</Typography>;
    if (!preview) return <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Push recipients will be checked before sending.</Typography>;

    return (
      <Alert severity={preview.eligibleCount > 0 ? "info" : "warning"} sx={{ mb: 2 }}>
        {preview.eligibleCount} of {preview.totalMembers} members have B1App PWA push enabled.
        {preview.excludedSenderCount > 0 && <><br />The sender is excluded.</>}
        {preview.noDeviceCount > 0 && <><br />{preview.noDeviceCount} members do not have a registered PWA push device.</>}
        {preview.pushDisabledCount > 0 && <><br />{preview.pushDisabledCount} members have push disabled.</>}
      </Alert>
    );
  };

  const renderResult = () => {
    if (!result) return null;
    return (
      <>
        <Alert severity={result.successCount > 0 ? "success" : "warning"} sx={{ mt: 1 }}>
          {result.successCount} of {result.recipientCount} push notifications were queued.
          {result.skippedCount > 0 && <><br />{result.skippedCount} recipients were skipped.</>}
        </Alert>
        {(result.noDeviceCount > 0 || result.pushDisabledCount > 0) && (
          <Alert severity="info" sx={{ mt: 1 }}>
            {result.noDeviceCount > 0 && <>{result.noDeviceCount} members had no registered PWA push device.<br /></>}
            {result.pushDisabledCount > 0 && <>{result.pushDisabledCount} members had push disabled.</>}
          </Alert>
        )}
      </>
    );
  };

  const titleCount = title.length;
  const messageCount = message.length;
  const linkValid = isOptionalUrlValid(link);
  const imageUrlValid = isOptionalImageUrlValid(imageUrl);
  const canSend = !sending && title.trim().length > 0 && message.trim().length > 0 && linkValid && imageUrlValid && (!preview || preview.eligibleCount > 0);

  return (
    <Dialog open={true} onClose={props.onClose} maxWidth="md" fullWidth>
      <DialogTitle>Push Notification: {props.groupName}</DialogTitle>
      <DialogContent>
        {result ? renderResult() : (
          <>
            {renderPreview()}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Stack spacing={2}>
              <TextField
                fullWidth
                label="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={sending}
                placeholder="Reminder"
                inputProps={{ maxLength: 80 }}
                helperText={`${titleCount} / 80`}
              />
              <TextField
                fullWidth
                multiline
                minRows={4}
                maxRows={8}
                label="Message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={sending}
                placeholder="Compose your notification..."
                inputProps={{ maxLength: 240 }}
                helperText={`${messageCount} / 240`}
              />
              <TextField
                fullWidth
                label="Open link or flyer URL"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                disabled={sending}
                placeholder="/mobile/groups or https://..."
                error={!linkValid}
                helperText={!linkValid ? "Use an https URL or a relative app path." : " "}
              />
              <TextField
                fullWidth
                label="Image URL"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                disabled={sending}
                placeholder="https://..."
                error={!imageUrlValid}
                helperText={!imageUrlValid ? "Use an https URL or leave this blank." : " "}
              />
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, bgcolor: "grey.50" }}>
                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                  <NotificationsActiveIcon sx={{ color: "primary.main", mt: 0.25 }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, wordBreak: "break-word" }}>
                      {title.trim() || "Notification title"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                      {message.trim() || "Notification message"}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </Stack>
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
              {sending ? "Sending..." : "Send Notification"}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};
