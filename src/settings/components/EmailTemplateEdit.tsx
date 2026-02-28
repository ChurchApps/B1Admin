import React, { useState } from "react";
import { TextField, FormControl, InputLabel, MenuItem, Select, Box, Chip, Stack, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import { ApiHelper, InputBox, ErrorMessages, UserHelper } from "@churchapps/apphelper";
import { HtmlEditor } from "@churchapps/apphelper-markdown";
import type { EmailTemplateInterface } from "../EmailTemplatesPage";

const MERGE_FIELDS = [
  { key: "{{firstName}}", label: "First Name" },
  { key: "{{lastName}}", label: "Last Name" },
  { key: "{{displayName}}", label: "Display Name" },
  { key: "{{email}}", label: "Email" },
  { key: "{{churchName}}", label: "Church Name" },
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
    if (!name.trim()) errs.push("Name is required.");
    if (!subject.trim()) errs.push("Subject is required.");
    if (!htmlContent.trim()) errs.push("Body content is required.");
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
    const churchName = UserHelper.currentUserChurch?.church?.name || "Your Church";
    let preview = htmlContent;
    preview = preview.replace(/\{\{firstName\}\}/g, "John");
    preview = preview.replace(/\{\{lastName\}\}/g, "Smith");
    preview = preview.replace(/\{\{displayName\}\}/g, "John Smith");
    preview = preview.replace(/\{\{email\}\}/g, "john@example.com");
    preview = preview.replace(/\{\{churchName\}\}/g, churchName);
    return preview;
  };

  const getPreviewSubject = () => {
    const churchName = UserHelper.currentUserChurch?.church?.name || "Your Church";
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
      <InputBox headerIcon="email" headerText={template.id ? "Edit Template" : "New Template"} saveFunction={handleSave} cancelFunction={onCancel} deleteFunction={onDelete}>
        <ErrorMessages errors={errors} />
        <TextField fullWidth label="Template Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Welcome Email, Event Reminder" />
        <FormControl fullWidth>
          <InputLabel>Category</InputLabel>
          <Select label="Category" value={category} onChange={(e: SelectChangeEvent) => setCategory(e.target.value)}>
            {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </Select>
        </FormControl>

        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>Insert merge field into subject:</Typography>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mb: 1 }}>
            {MERGE_FIELDS.map(f => (
              <Chip key={f.key} label={f.label} size="small" variant="outlined" onClick={() => insertMergeField(f.key)} sx={{ cursor: "pointer" }} />
            ))}
          </Stack>
        </Box>

        <TextField fullWidth label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Hello {{firstName}}, welcome to {{churchName}}" />

        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>Insert merge field into body:</Typography>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mb: 1 }}>
            {MERGE_FIELDS.map(f => (
              <Chip key={f.key} label={f.label} size="small" variant="outlined" onClick={() => insertMergeFieldInBody(f.key)} sx={{ cursor: "pointer" }} />
            ))}
          </Stack>
        </Box>

        <Box sx={{ mt: 1, border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1 }}>
          <HtmlEditor
            value={htmlContent}
            onChange={(val) => setHtmlContent(val)}
            style={{ minHeight: 200 }}
            placeholder="Compose your email template here..."
          />
        </Box>

        <Box sx={{ mt: 2, textAlign: "right" }}>
          <Button variant="outlined" size="small" onClick={() => setShowPreview(true)}>Preview</Button>
        </Box>
      </InputBox>

      <Dialog open={showPreview} onClose={() => setShowPreview(false)} maxWidth="md" fullWidth>
        <DialogTitle>Email Preview</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Subject:</Typography>
          <Typography variant="body1" sx={{ mb: 2, fontWeight: 600 }}>{getPreviewSubject()}</Typography>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Body:</Typography>
          <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2, backgroundColor: "#fafafa" }}>
            <div dangerouslySetInnerHTML={{ __html: getPreviewHtml() }} />
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
            Sample data shown: John Smith, john@example.com
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPreview(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
