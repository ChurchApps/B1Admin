import React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, FormControl, InputLabel, MenuItem, Select, Typography, CircularProgress, Alert, TextField, Box, Chip, Stack } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { HtmlEditor } from "@churchapps/apphelper/markdown";

const MERGE_FIELDS = [
  { key: "{{firstName}}", label: Locale.label("groups.sendEmailDialog.mergeFieldFirstName") },
  { key: "{{lastName}}", label: Locale.label("groups.sendEmailDialog.mergeFieldLastName") },
  { key: "{{displayName}}", label: Locale.label("groups.sendEmailDialog.mergeFieldDisplayName") },
  { key: "{{email}}", label: Locale.label("groups.sendEmailDialog.mergeFieldEmail") },
  { key: "{{churchName}}", label: Locale.label("groups.sendEmailDialog.mergeFieldChurchName") }
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
  const [bodyEditorKey, setBodyEditorKey] = React.useState(0);

  // Load templates on mount
  React.useEffect(() => {
    setLoadingTemplates(true);
    ApiHelper.get("/emailTemplates", "MessagingApi")
      .then((data: any) => setTemplates(data || []))
      .catch(() => { /* templates load failure is handled by empty list */ })
      .finally(() => setLoadingTemplates(false));
  }, []);

  // Load preview data for group
  React.useEffect(() => {
    if (!props.groupId) return;
    setLoadingPreview(true);
    ApiHelper.get("/emailTemplates/preview/" + props.groupId, "MessagingApi")
      .then((data: any) => setPreview(data))
      .catch(() => { /* preview is optional */ })
      .finally(() => setLoadingPreview(false));
  }, [props.groupId]);

  const handleTemplateSelect = async (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    try {
      const fullTemplate = await ApiHelper.get("/emailTemplates/" + templateId, "MessagingApi");
      setSubject(fullTemplate.subject || "");
      setHtmlContent(fullTemplate.htmlContent || "");
      setBodyEditorKey(k => k + 1);
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
      const resp = await ApiHelper.post("/emailTemplates/send", payload, "MessagingApi");
      if (resp.error) {
        setError(resp.error);
      } else {
        setResult(resp);
      }
    } catch (err: any) {
      const status = err?.status || err?.response?.status;
      if (status === 401 || err?.message === "Unauthorized") {
        setError(Locale.label("groups.sendEmailDialog.permissionError"));
      } else {
        setError(err?.message || Locale.label("groups.sendEmailDialog.fallbackError"));
      }
    } finally {
      setSending(false);
    }
  };

  const renderPreview = () => {
    if (loadingPreview) return <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>{Locale.label("groups.sendEmailDialog.loadingRecipients")}</Typography>;
    if (!preview) return <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>{Locale.label("groups.sendEmailDialog.sendDefault")}</Typography>;

    const eligibleSummary = preview.totalMembers !== 1
      ? Locale.label("groups.sendEmailDialog.eligibleSummary")
      : Locale.label("groups.sendEmailDialog.eligibleSummarySingular");
    const noEmailNotice = preview.noEmailCount !== 1
      ? Locale.label("groups.sendEmailDialog.noEmailNotice")
      : Locale.label("groups.sendEmailDialog.noEmailNoticeSingular");
    return (
      <Alert severity={preview.eligibleCount > 0 ? "info" : "warning"} sx={{ mb: 2 }}>
        {eligibleSummary.replace("{eligibleCount}", preview.eligibleCount.toString()).replace("{totalMembers}", preview.totalMembers.toString())}
        {preview.noEmailCount > 0 && <><br />{noEmailNotice.replace("{count}", preview.noEmailCount.toString())}</>}
      </Alert>
    );
  };

  const renderResult = () => {
    if (!result) return null;
    const sentSummary = result.recipientCount !== 1
      ? Locale.label("groups.sendEmailDialog.sentSummary")
      : Locale.label("groups.sendEmailDialog.sentSummarySingular");
    return (
      <>
        <Alert severity={result.failCount === 0 ? "success" : "warning"} sx={{ mt: 1 }}>
          {sentSummary.replace("{successCount}", result.successCount.toString()).replace("{recipientCount}", result.recipientCount.toString())}
          {result.failCount > 0 && <><br />{Locale.label("groups.sendEmailDialog.sendFailedDetail").replace("{count}", result.failCount.toString())}</>}
        </Alert>
        {result.noEmailCount > 0 && (
          <Alert severity="info" sx={{ mt: 1 }}>
            {Locale.label("groups.sendEmailDialog.noEmailSkipped").replace("{count}", result.noEmailCount.toString())}
          </Alert>
        )}
      </>
    );
  };

  const canSend = !sending && subject.trim().length > 0 && htmlContent.trim().length > 0 && (!preview || preview.eligibleCount > 0);

  return (
    <Dialog open={true} onClose={props.onClose} maxWidth="md" fullWidth>
      <DialogTitle>{Locale.label("groups.sendEmailDialog.emailGroupTitle").replace("{groupName}", props.groupName)}</DialogTitle>
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
                    <InputLabel>{Locale.label("groups.sendEmailDialog.loadTemplate")}</InputLabel>
                    <Select
                      label={Locale.label("groups.sendEmailDialog.loadTemplate")}
                      value={selectedTemplateId}
                      onChange={(e: SelectChangeEvent) => handleTemplateSelect(e.target.value)}
                      disabled={sending}
                    >
                      <MenuItem value=""><em>{Locale.label("groups.sendEmailDialog.none")}</em></MenuItem>
                      {templates.map((t) => (
                        <MenuItem key={t.id} value={t.id}>
                          {t.name} {t.category ? `(${t.category})` : ""}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
                <a href="/email-templates" style={{ whiteSpace: "nowrap" }}>{Locale.label("groups.sendEmailDialog.manageTemplates")}</a>
              </Box>
            )}

            {/* Subject with merge fields */}
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
                {Locale.label("groups.sendEmailDialog.subjectMergeFieldHint")}
              </Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mb: 1 }}>
                {MERGE_FIELDS.map(f => (
                  <Chip key={f.key} label={f.label} size="small" variant="outlined" onClick={() => setSubject(prev => prev + f.key)} sx={{ cursor: "pointer" }} />
                ))}
              </Stack>
            </Box>
            <TextField
              fullWidth
              label={Locale.label("groups.sendEmailDialog.subject")}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={sending}
              placeholder={Locale.label("groups.sendEmailDialog.subjectPlaceholder")}
              sx={{ mb: 2 }}
            />

            {/* Body with merge fields */}
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
                {Locale.label("groups.sendEmailDialog.bodyMergeFieldHint")}
              </Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mb: 1 }}>
                {MERGE_FIELDS.map(f => (
                  <Chip key={f.key} label={f.label} size="small" variant="outlined" onClick={() => setHtmlContent(prev => prev + f.key)} sx={{ cursor: "pointer" }} />
                ))}
              </Stack>
            </Box>
            <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1 }}>
              <HtmlEditor
                key={bodyEditorKey}
                value={htmlContent}
                onChange={(val) => setHtmlContent(val)}
                style={{ minHeight: 200 }}
                placeholder={Locale.label("groups.sendEmailDialog.composePlaceholder")}
              />
            </Box>
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
              {sending ? Locale.label("groups.sendEmailDialog.sending") : Locale.label("groups.sendEmailDialog.send")}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};
