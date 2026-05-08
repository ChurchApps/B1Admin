import React, { useState } from "react";
import { useForm, Controller, useFormState } from "react-hook-form";
import { TextField, FormControl, InputLabel, MenuItem, Select, Box, Chip, Stack, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import { ApiHelper, InputBox, ErrorMessages, UserHelper, Locale } from "@churchapps/apphelper";
import { HtmlEditor } from "@churchapps/apphelper/markdown";
import type { EmailTemplateInterface } from "../EmailTemplatesPage";

// EmailTemplateInterface fields; RHF requires looser typing for nested paths
type AnyRecord = Record<string, any>;

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
  const [showPreview, setShowPreview] = useState(false);

  const { control, register, handleSubmit, getValues, setValue } = useForm<AnyRecord>({
    defaultValues: {
      name: template.name || "",
      subject: template.subject || "",
      htmlContent: template.htmlContent || "",
      category: template.category || "General"
    }
  });

  const { errors } = useFormState({ control });
  const e = errors as any;

  const summaryErrors = React.useMemo(() => {
    const errs: string[] = [];
    if (e.name?.message) errs.push(e.name.message);
    if (e.subject?.message) errs.push(e.subject.message);
    if (e.htmlContent?.message) errs.push(e.htmlContent.message);
    return errs;
  }, [errors]);

  const onValid = async (values: AnyRecord) => {
    const t: EmailTemplateInterface = {
      ...template,
      name: values.name,
      subject: values.subject,
      htmlContent: values.htmlContent,
      category: values.category,
      churchId: UserHelper.currentUserChurch.church.id
    };
    await ApiHelper.post("/messaging/emailTemplates", [t], "MessagingApi");
    onSave();
  };

  const insertMergeField = (field: string) => {
    setValue("subject", getValues("subject") + field);
  };

  const insertMergeFieldInBody = (field: string) => {
    setValue("htmlContent", getValues("htmlContent") + field);
  };

  const getPreviewHtml = () => {
    const churchName = UserHelper.currentUserChurch?.church?.name || Locale.label("settings.emailTemplateEdit.yourChurch");
    let preview = getValues("htmlContent");
    preview = preview.replace(/\{\{firstName\}\}/g, "John");
    preview = preview.replace(/\{\{lastName\}\}/g, "Smith");
    preview = preview.replace(/\{\{displayName\}\}/g, "John Smith");
    preview = preview.replace(/\{\{email\}\}/g, "john@example.com");
    preview = preview.replace(/\{\{churchName\}\}/g, churchName);
    return preview;
  };

  const getPreviewSubject = () => {
    const churchName = UserHelper.currentUserChurch?.church?.name || Locale.label("settings.emailTemplateEdit.yourChurch");
    let preview = getValues("subject");
    preview = preview.replace(/\{\{firstName\}\}/g, "John");
    preview = preview.replace(/\{\{lastName\}\}/g, "Smith");
    preview = preview.replace(/\{\{displayName\}\}/g, "John Smith");
    preview = preview.replace(/\{\{email\}\}/g, "john@example.com");
    preview = preview.replace(/\{\{churchName\}\}/g, churchName);
    return preview;
  };

  return (
    <>
      <InputBox headerIcon="email" headerText={template.id ? Locale.label("settings.emailTemplateEdit.editTemplate") : Locale.label("settings.emailTemplateEdit.newTemplate")} saveFunction={handleSubmit(onValid)} cancelFunction={onCancel} deleteFunction={onDelete}>
        <ErrorMessages errors={summaryErrors} />
        <TextField fullWidth label={Locale.label("settings.emailTemplateEdit.templateName")} placeholder={Locale.label("settings.emailTemplateEdit.templateNamePlaceholder")} error={!!e.name} helperText={e.name?.message} {...register("name", { required: Locale.label("settings.emailTemplateEdit.nameRequired") })} />
        <FormControl fullWidth>
          <InputLabel>{Locale.label("settings.emailTemplateEdit.category")}</InputLabel>
          <Controller name="category" control={control} render={({ field }) => (
            <Select {...field} label={Locale.label("settings.emailTemplateEdit.category")} onChange={(ev: SelectChangeEvent) => field.onChange(ev.target.value)}>
              {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          )} />
        </FormControl>

        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>{Locale.label("settings.emailTemplateEdit.insertMergeSubject")}</Typography>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mb: 1 }}>
            {getMergeFields().map(f => (
              <Chip key={f.key} label={f.label} size="small" variant="outlined" onClick={() => insertMergeField(f.key)} sx={{ cursor: "pointer" }} />
            ))}
          </Stack>
        </Box>

        <TextField fullWidth label={Locale.label("settings.emailTemplateEdit.subject")} placeholder={Locale.label("settings.emailTemplateEdit.subjectPlaceholder")} error={!!e.subject} helperText={e.subject?.message} {...register("subject", { required: Locale.label("settings.emailTemplateEdit.subjectRequired") })} />

        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>{Locale.label("settings.emailTemplateEdit.insertMergeBody")}</Typography>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mb: 1 }}>
            {getMergeFields().map(f => (
              <Chip key={f.key} label={f.label} size="small" variant="outlined" onClick={() => insertMergeFieldInBody(f.key)} sx={{ cursor: "pointer" }} />
            ))}
          </Stack>
        </Box>

        <Box sx={{ mt: 1, border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1 }}>
          <Controller name="htmlContent" control={control} rules={{ required: Locale.label("settings.emailTemplateEdit.bodyRequired") }} render={({ field }) => (
            <HtmlEditor value={field.value} onChange={(val) => field.onChange(val)} style={{ minHeight: 200 }} placeholder={Locale.label("settings.emailTemplateEdit.composePlaceholder")} />
          )} />
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
