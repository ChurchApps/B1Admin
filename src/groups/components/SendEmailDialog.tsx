import React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, FormControl, InputLabel, MenuItem, Select, Typography, CircularProgress, Alert, TextField, Box, Chip, Stack } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import { ApiHelper } from "@churchapps/apphelper";
import { HtmlEditor } from "@churchapps/apphelper-markdown";

const MERGE_FIELDS = [
  { key: "{{firstName}}", label: "First Name" },
  { key: "{{lastName}}", label: "Last Name" },
  { key: "{{displayName}}", label: "Display Name" },
  { key: "{{email}}", label: "Email" },
  { key: "{{churchName}}", label: "Church Name" },
];

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
  const [subject, setSubject] = React.useState("");
  const [htmlContent, setHtmlContent] = React.useState("");
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

  const handleTemplateSelect = async (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    try {
      const fullTemplate = await ApiHelper.get("/messaging/emailTemplates/" + templateId, "MessagingApi");
      setSubject(fullTemplate.subject || "");
      setHtmlContent(fullTemplate.htmlContent || "");
    } catch {
      const t = templates.find(t => t.id === templateId);
      if (t) setSubject(t.subject || "");
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !htmlContent.trim()) return;
    setSending(true);
    setError("");
    try {
      const payload: any = { groupId: props.groupId, subject, htmlContent };
      const resp = await ApiHelper.post("/messaging/emailTemplates/send", payload, "MessagingApi");
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

  const canSend = !sending && subject.trim().length > 0 && htmlContent.trim().length > 0 && (!preview || preview.eligibleCount > 0);

  return (
    <Dialog open={true} onClose={props.onClose} maxWidth="md" fullWidth>
      <DialogTitle>Email Group: {props.groupName}</DialogTitle>
      <DialogContent>
        {result ? renderResult() : (
          <>
            {renderPreview()}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {/* Optional template selector + manage link */}
            {!loadingTemplates && (
              <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                {templates.length > 0 && (
                  <FormControl sx={{ flex: 1 }}>
                    <InputLabel>Load Template (optional)</InputLabel>
                    <Select
                      label="Load Template (optional)"
                      value={selectedTemplateId}
                      onChange={(e: SelectChangeEvent) => handleTemplateSelect(e.target.value)}
                      disabled={sending}
                    >
                      <MenuItem value=""><em>None</em></MenuItem>
                      {templates.map((t) => (
                        <MenuItem key={t.id} value={t.id}>
                          {t.name} {t.category ? `(${t.category})` : ""}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
                <a href="/email-templates" style={{ whiteSpace: "nowrap" }}>Manage Templates</a>
              </Box>
            )}

            {/* Subject with merge fields */}
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
                Insert merge field into subject:
              </Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mb: 1 }}>
                {MERGE_FIELDS.map(f => (
                  <Chip key={f.key} label={f.label} size="small" variant="outlined" onClick={() => setSubject(prev => prev + f.key)} sx={{ cursor: "pointer" }} />
                ))}
              </Stack>
            </Box>
            <TextField
              fullWidth
              label="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={sending}
              placeholder="e.g. Hello {{firstName}}, update from {{churchName}}"
              sx={{ mb: 2 }}
            />

            {/* Body with merge fields */}
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
                Insert merge field into body:
              </Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mb: 1 }}>
                {MERGE_FIELDS.map(f => (
                  <Chip key={f.key} label={f.label} size="small" variant="outlined" onClick={() => setHtmlContent(prev => prev + f.key)} sx={{ cursor: "pointer" }} />
                ))}
              </Stack>
            </Box>
            <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1 }}>
              <HtmlEditor
                value={htmlContent}
                onChange={(val) => setHtmlContent(val)}
                style={{ minHeight: 200 }}
                placeholder="Compose your email here..."
              />
            </Box>
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
