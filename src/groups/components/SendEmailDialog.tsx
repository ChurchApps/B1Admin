import React from "react";
import { FormControl, InputLabel, MenuItem, Select, Typography, Alert, TextField, Box, Chip, Stack, Tabs, Tab } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import { ApiHelper, Locale, UserHelper } from "@churchapps/apphelper";
import { HtmlEditor } from "@churchapps/apphelper/markdown";
import { useSendDialog } from "./useSendDialog";
import { SendDialogShell } from "./SendDialogShell";

const MERGE_FIELDS = [
  { key: "{{firstName}}", label: Locale.label("groups.sendEmailDialog.mergeFieldFirstName") },
  { key: "{{lastName}}", label: Locale.label("groups.sendEmailDialog.mergeFieldLastName") },
  { key: "{{displayName}}", label: Locale.label("groups.sendEmailDialog.mergeFieldDisplayName") },
  { key: "{{email}}", label: Locale.label("groups.sendEmailDialog.mergeFieldEmail") },
  { key: "{{churchName}}", label: Locale.label("groups.sendEmailDialog.mergeFieldChurchName") }
];

const BODY_MERGE_TARGET_SELECTOR = "p, div, li, h1, h2, h3, h4, h5, h6, blockquote, td, th";

const appendMergeFieldToHtml = (html: string, field: string) => {
  const currentHtml = html?.trim() || "";
  if (!currentHtml) return `<p>${field}</p>`;
  if (typeof DOMParser === "undefined") return `${currentHtml}${field}`;

  const doc = new DOMParser().parseFromString(currentHtml, "text/html");
  const targetElements = Array.from(doc.body.querySelectorAll(BODY_MERGE_TARGET_SELECTOR));
  const target = targetElements[targetElements.length - 1];

  if (target) {
    target.appendChild(doc.createTextNode(field));
    return doc.body.innerHTML;
  }

  const paragraph = doc.createElement("p");
  paragraph.innerHTML = doc.body.innerHTML;
  paragraph.appendChild(doc.createTextNode(field));
  doc.body.replaceChildren(paragraph);
  return doc.body.innerHTML;
};

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
  const [loadingTemplates, setLoadingTemplates] = React.useState(true);
  const [bodyEditorKey, setBodyEditorKey] = React.useState(0);
  const [showPreview, setShowPreview] = React.useState(false);

  const { sending, result, error, preview, loadingPreview, handleSend } = useSendDialog<PreviewData, SendResult>({
    previewUrl: props.groupId ? "/emailTemplates/preview/" + props.groupId : null,
    sendUrl: "/emailTemplates/send",
    buildPayload: () => {
      if (!subject.trim() || !htmlContent.trim()) return null;
      return { groupId: props.groupId, subject, htmlContent };
    },
    fallbackError: Locale.label("groups.sendEmailDialog.fallbackError"),
    buildError: (err: any) => {
      const status = err?.status || err?.response?.status;
      if (status === 401 || err?.message === "Unauthorized") return Locale.label("groups.sendEmailDialog.permissionError");
      return err?.message || Locale.label("groups.sendEmailDialog.fallbackError");
    }
  });

  const getPreviewHtml = () => {
    const churchName = UserHelper.currentUserChurch?.church?.name || Locale.label("settings.emailTemplateEdit.yourChurch");
    let previewHtml = htmlContent;
    previewHtml = previewHtml.replace(/\{\{firstName\}\}/g, "John");
    previewHtml = previewHtml.replace(/\{\{lastName\}\}/g, "Smith");
    previewHtml = previewHtml.replace(/\{\{displayName\}\}/g, "John Smith");
    previewHtml = previewHtml.replace(/\{\{email\}\}/g, "john@example.com");
    previewHtml = previewHtml.replace(/\{\{churchName\}\}/g, churchName);
    return previewHtml;
  };

  const getPreviewSubject = () => {
    const churchName = UserHelper.currentUserChurch?.church?.name || Locale.label("settings.emailTemplateEdit.yourChurch");
    let previewSubject = subject;
    previewSubject = previewSubject.replace(/\{\{firstName\}\}/g, "John");
    previewSubject = previewSubject.replace(/\{\{lastName\}\}/g, "Smith");
    previewSubject = previewSubject.replace(/\{\{displayName\}\}/g, "John Smith");
    previewSubject = previewSubject.replace(/\{\{email\}\}/g, "john@example.com");
    previewSubject = previewSubject.replace(/\{\{churchName\}\}/g, churchName);
    return previewSubject;
  };

  React.useEffect(() => {
    setLoadingTemplates(true);
    ApiHelper.get("/emailTemplates", "MessagingApi")
      .then((data: any) => setTemplates(data || []))
      .catch(() => { /* templates load failure is handled by empty list */ })
      .finally(() => setLoadingTemplates(false));
  }, []);

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
    <SendDialogShell
      onClose={props.onClose}
      maxWidth="md"
      title={Locale.label("groups.sendEmailDialog.emailGroupTitle").replace("{groupName}", props.groupName)}
      isComplete={!!result}
      resultContent={renderResult()}
      sending={sending}
      canSend={canSend}
      onSend={handleSend}
      closeLabel={Locale.label("common.close")}
      cancelLabel={Locale.label("common.cancel")}
      sendLabel={Locale.label("groups.sendEmailDialog.send")}
      sendingLabel={Locale.label("groups.sendEmailDialog.sending")}
    >
      {renderPreview()}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Tabs value={showPreview ? 1 : 0} onChange={(_, val) => setShowPreview(val === 1)} sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tab label="Edit" />
        <Tab label="Preview" disabled={!subject.trim() && !htmlContent.trim()} />
      </Tabs>

      {!showPreview ? (
        <>
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
              <a href="/settings/email-templates" style={{ whiteSpace: "nowrap" }}>{Locale.label("groups.sendEmailDialog.manageTemplates")}</a>
            </Box>
          )}

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

          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
              {Locale.label("groups.sendEmailDialog.bodyMergeFieldHint")}
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mb: 1 }}>
              {MERGE_FIELDS.map(f => (
                <Chip key={f.key} label={f.label} size="small" variant="outlined" onClick={() => {
                  setHtmlContent(prev => appendMergeFieldToHtml(prev, f.key));
                  setBodyEditorKey(k => k + 1);
                }} sx={{ cursor: "pointer" }} />
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
      ) : (
        <>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>{Locale.label("settings.emailTemplateEdit.previewSubject")}</Typography>
          <Typography variant="body1" sx={{ mb: 2, fontWeight: 600 }}>{getPreviewSubject()}</Typography>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>{Locale.label("settings.emailTemplateEdit.previewBody")}</Typography>
          <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2, backgroundColor: "var(--bg-sub)" }}>
            <iframe
              sandbox=""
              srcDoc={getPreviewHtml()}
              title="Email preview"
              style={{ width: "100%", minHeight: 300, border: "none" }}
            />
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
            {Locale.label("settings.emailTemplateEdit.previewSampleData")}
          </Typography>
        </>
      )}
    </SendDialogShell>
  );
};
