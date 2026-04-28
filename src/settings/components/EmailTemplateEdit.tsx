import React, { useState } from "react";
import { TextField, FormControl, InputLabel, MenuItem, Select, Box, Chip, Stack, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import { ApiHelper, InputBox, ErrorMessages, UserHelper, Locale } from "@churchapps/apphelper";
import { HtmlEditor } from "@churchapps/apphelper/markdown";
import type { EmailTemplateInterface } from "../EmailTemplatesPage";

const getMergeFields = () => [
  { key: "{{firstName}}", label: Locale.label("settings.emailTemplateEdit.mergeFirstName") },
  { key: "{{lastName}}", label: Locale.label("settings.emailTemplateEdit.mergeLastName") },
  { key: "{{displayName}}", label: Locale.label("settings.emailTemplateEdit.mergeDisplayName") },
  { key: "{{email}}", label: Locale.label("settings.emailTemplateEdit.mergeEmail") },
  { key: "{{churchName}}", label: Locale.label("settings.emailTemplateEdit.mergeChurchName") }
];

const CATEGORIES = ["General", "Events", "Groups", "Giving", "Welcome"];

interface Props {
  template: EmailTemplateInterface;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export const EmailTemplateEdit: React.FC<Props> = ({ template, onSave, onCancel, onDelete }) => {
  const [name, setName] = useState(template.name || "");
  const [subject, setSubject] = useState(template.subject || "");
  const [htmlContent, setHtmlContent] = useState(template.htmlContent || "");
  const [category, setCategory] = useState(template.category || "General");
  const [errors, setErrors] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const validate = () => {
    const errs: string[] = [];
    if (!name.trim()) errs.push(Locale.label("settings.emailTemplateEdit.nameRequired"));
    if (!subject.trim()) errs.push(Locale.label("settings.emailTemplateEdit.subjectRequired"));
    if (!htmlContent.trim()) errs.push(Locale.label("settings.emailTemplateEdit.bodyRequired"));
    setErrors(errs);
    return errs.length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const t: EmailTemplateInterface = {
      ...template,
      name,
      subject,
      htmlContent,
      category,
      churchId: UserHelper.currentUserChurch.church.id
    };
    await ApiHelper.post("/messaging/emailTemplates", [t], "MessagingApi");
    onSave();
  };

  const insertMergeField = (field: string) => {
    // Append to subject field (user can position it themselves)
    setSubject(prev => prev + field);
  };

  const insertMergeFieldInBody = (field: string) => {
    // Append to body. The HtmlEditor doesn't expose cursor position easily,
    // so we append to the HTML content.
    setHtmlContent(prev => prev + field);
  };

  const getPreviewHtml = () => {
    const churchName = UserHelper.currentUserChurch?.church?.name || Locale.label("settings.emailTemplateEdit.yourChurch");
    let preview = htmlContent;
    preview = preview.replace(/\{\{firstName\}\}/g, "John");
    preview = preview.replace(/\{\{lastName\}\}/g, "Smith");
    preview = preview.replace(/\{\{displayName\}\}/g, "John Smith");
    preview = preview.replace(/\{\{email\}\}/g, "john@example.com");
    preview = preview.replace(/\{\{churchName\}\}/g, churchName);
    return preview;
  };

  const getPreviewSubject = () => {
    const churchName = UserHelper.currentUserChurch?.church?.name || Locale.label("settings.emailTemplateEdit.yourChurch");
    let preview = subject;
    preview = preview.replace(/\{\{firstName\}\}/g, "John");
    preview = preview.replace(/\{\{lastName\}\}/g, "Smith");
    preview = preview.replace(/\{\{displayName\}\}/g, "John Smith");
    preview = preview.replace(/\{\{email\}\}/g, "john@example.com");
    preview = preview.replace(/\{\{churchName\}\}/g, churchName);
    return preview;
  };

  return (
    <>
      <InputBox headerIcon="email" headerText={template.id ? Locale.label("settings.emailTemplateEdit.editTemplate") : Locale.label("settings.emailTemplateEdit.newTemplate")} saveFunction={handleSave} cancelFunction={onCancel} deleteFunction={onDelete}>
        <ErrorMessages errors={errors} />
        <TextField fullWidth label={Locale.label("settings.emailTemplateEdit.templateName")} value={name} onChange={(e) => setName(e.target.value)} placeholder={Locale.label("settings.emailTemplateEdit.templateNamePlaceholder")} />
        <FormControl fullWidth>
          <InputLabel>{Locale.label("settings.emailTemplateEdit.category")}</InputLabel>
          <Select label={Locale.label("settings.emailTemplateEdit.category")} value={category} onChange={(e: SelectChangeEvent) => setCategory(e.target.value)}>
            {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </Select>
        </FormControl>

        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>{Locale.label("settings.emailTemplateEdit.insertMergeSubject")}</Typography>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mb: 1 }}>
            {getMergeFields().map(f => (
              <Chip key={f.key} label={f.label} size="small" variant="outlined" onClick={() => insertMergeField(f.key)} sx={{ cursor: "pointer" }} />
            ))}
          </Stack>
        </Box>

        <TextField fullWidth label={Locale.label("settings.emailTemplateEdit.subject")} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={Locale.label("settings.emailTemplateEdit.subjectPlaceholder")} />

        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>{Locale.label("settings.emailTemplateEdit.insertMergeBody")}</Typography>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mb: 1 }}>
            {getMergeFields().map(f => (
              <Chip key={f.key} label={f.label} size="small" variant="outlined" onClick={() => insertMergeFieldInBody(f.key)} sx={{ cursor: "pointer" }} />
            ))}
          </Stack>
        </Box>

        <Box sx={{ mt: 1, border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1 }}>
          <HtmlEditor
            value={htmlContent}
            onChange={(val) => setHtmlContent(val)}
            style={{ minHeight: 200 }}
            placeholder={Locale.label("settings.emailTemplateEdit.composePlaceholder")}
          />
        </Box>

        <Box sx={{ mt: 2, textAlign: "right" }}>
          <Button variant="outlined" size="small" onClick={() => setShowPreview(true)}>{Locale.label("settings.emailTemplateEdit.preview")}</Button>
        </Box>
      </InputBox>

      <Dialog open={showPreview} onClose={() => setShowPreview(false)} maxWidth="md" fullWidth>
        <DialogTitle>{Locale.label("settings.emailTemplateEdit.emailPreview")}</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>{Locale.label("settings.emailTemplateEdit.previewSubject")}</Typography>
          <Typography variant="body1" sx={{ mb: 2, fontWeight: 600 }}>{getPreviewSubject()}</Typography>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>{Locale.label("settings.emailTemplateEdit.previewBody")}</Typography>
          <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2, backgroundColor: "#fafafa" }}>
            <div dangerouslySetInnerHTML={{ __html: getPreviewHtml() }} />
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
            {Locale.label("settings.emailTemplateEdit.previewSampleData")}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPreview(false)}>{Locale.label("settings.emailTemplateEdit.close")}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
