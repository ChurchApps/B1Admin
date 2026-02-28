import React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, FormControl, InputLabel, MenuItem, Select, Typography, CircularProgress, Alert } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import { ApiHelper } from "@churchapps/apphelper";

interface EmailTemplateOption {
  id: string;
  name: string;
  subject: string;
  category: string;
}

interface PreviewData {
  totalMembers: number;
  eligibleCount: number;
  noEmailCount: number;
}

interface SendResult {
  totalMembers: number;
  recipientCount: number;
  successCount: number;
  failCount: number;
  noEmailCount: number;
}

interface Props {
  groupId: string;
  groupName: string;
  onClose: () => void;
}

export const SendEmailDialog: React.FC<Props> = (props) => {
  const [templates, setTemplates] = React.useState<EmailTemplateOption[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [result, setResult] = React.useState<SendResult | null>(null);
  const [error, setError] = React.useState("");
  const [preview, setPreview] = React.useState<PreviewData | null>(null);
  const [loadingPreview, setLoadingPreview] = React.useState(false);
  const [loadingTemplates, setLoadingTemplates] = React.useState(true);

  // Load templates on mount
  React.useEffect(() => {
    setLoadingTemplates(true);
    ApiHelper.get("/messaging/emailTemplates", "MessagingApi")
      .then((data) => setTemplates(data || []))
      .catch(() => { /* templates load failure is handled by empty list */ })
      .finally(() => setLoadingTemplates(false));
  }, []);

  // Load preview data for group
  React.useEffect(() => {
    if (!props.groupId) return;
    setLoadingPreview(true);
    ApiHelper.get("/messaging/emailTemplates/preview/" + props.groupId, "MessagingApi")
      .then((data) => setPreview(data))
      .catch(() => { /* preview is optional */ })
      .finally(() => setLoadingPreview(false));
  }, [props.groupId]);

  const handleSend = async () => {
    if (!selectedTemplateId) return;
    setSending(true);
    setError("");
    try {
      const resp = await ApiHelper.post("/messaging/emailTemplates/send", { templateId: selectedTemplateId, groupId: props.groupId }, "MessagingApi");
      if (resp.error) {
        setError(resp.error);
      } else {
        setResult(resp);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to send email.");
    } finally {
      setSending(false);
    }
  };

  const renderPreview = () => {
    if (loadingPreview) return <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>Loading recipients...</Typography>;
    if (!preview) return <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>This will send an email to eligible group members.</Typography>;

    return (
      <Alert severity={preview.eligibleCount > 0 ? "info" : "warning"} sx={{ mb: 2 }}>
        <strong>{preview.eligibleCount}</strong> of {preview.totalMembers} member{preview.totalMembers !== 1 ? "s" : ""} will receive this email.
        {preview.noEmailCount > 0 && <><br />{preview.noEmailCount} ha{preview.noEmailCount !== 1 ? "ve" : "s"} no email address on file.</>}
      </Alert>
    );
  };

  const renderResult = () => {
    if (!result) return null;
    return (
      <>
        <Alert severity={result.failCount === 0 ? "success" : "warning"} sx={{ mt: 1 }}>
          Sent to {result.successCount} of {result.recipientCount} eligible recipient{result.recipientCount !== 1 ? "s" : ""}.
          {result.failCount > 0 && <><br />{result.failCount} failed to send.</>}
        </Alert>
        {result.noEmailCount > 0 && (
          <Alert severity="info" sx={{ mt: 1 }}>
            {result.noEmailCount} skipped (no email address on file).
          </Alert>
        )}
      </>
    );
  };

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
  const canSend = !sending && !!selectedTemplateId && (!preview || preview.eligibleCount > 0);

  return (
    <Dialog open={true} onClose={props.onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Email Group: {props.groupName}</DialogTitle>
      <DialogContent>
        {result ? renderResult() : (
          <>
            {renderPreview()}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loadingTemplates ? (
              <Typography variant="body2" color="textSecondary">Loading templates...</Typography>
            ) : templates.length === 0 ? (
              <Alert severity="warning">
                No email templates found. <a href="/email-templates">Create one first</a>.
              </Alert>
            ) : (
              <>
                <FormControl fullWidth sx={{ mt: 1 }}>
                  <InputLabel>Email Template</InputLabel>
                  <Select
                    label="Email Template"
                    value={selectedTemplateId}
                    onChange={(e: SelectChangeEvent) => setSelectedTemplateId(e.target.value)}
                    disabled={sending}
                  >
                    {templates.map((t) => (
                      <MenuItem key={t.id} value={t.id}>
                        {t.name} {t.category ? `(${t.category})` : ""}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {selectedTemplate && (
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: "block" }}>
                    Subject: {selectedTemplate.subject}
                  </Typography>
                )}
              </>
            )}
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
              {sending ? "Sending..." : "Send Email"}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};
