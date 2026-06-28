import React, { useState } from "react";
import { useForm, Controller, useFormState } from "react-hook-form";
import { TextField, FormControl, Grid, InputLabel, MenuItem, Select, Box, Chip, Stack, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import { ApiHelper, ErrorMessages, UserHelper, Locale } from "@churchapps/apphelper";
import { FormCard } from "../../components/ui";
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

interface Props {
  template: EmailTemplateInterface;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export const EmailTemplateEdit: React.FC<Props> = ({ template, onSave, onCancel, onDelete }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [bodyEditorKey, setBodyEditorKey] = useState(0);
  const subjectInputRef = React.useRef<HTMLInputElement | null>(null);

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
    await ApiHelper.post("/emailTemplates", [t], "MessagingApi");
    onSave();
  };

  const insertMergeField = (field: string) => {
    const nextSubject = `${getValues("subject") || ""}${field}`;
    setValue("subject", nextSubject, { shouldDirty: true, shouldValidate: true, shouldTouch: true });
    requestAnimationFrame(() => {
      subjectInputRef.current?.focus();
      subjectInputRef.current?.setSelectionRange(nextSubject.length, nextSubject.length);
    });
  };

  const insertMergeFieldInBody = (field: string) => {
    const nextHtml = appendMergeFieldToHtml(getValues("htmlContent") || "", field);
    setValue("htmlContent", nextHtml, { shouldDirty: true, shouldValidate: true });
    setBodyEditorKey(key => key + 1);
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
      <FormCard icon="email" title={template.id ? Locale.label("settings.emailTemplateEdit.editTemplate") : Locale.label("settings.emailTemplateEdit.newTemplate")} onSave={handleSubmit(onValid)} onCancel={onCancel} onDelete={onDelete}>
        <ErrorMessages errors={summaryErrors} />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label={Locale.label("settings.emailTemplateEdit.templateName")} placeholder={Locale.label("settings.emailTemplateEdit.templateNamePlaceholder")} error={!!e.name} helperText={e.name?.message} {...register("name", { required: Locale.label("settings.emailTemplateEdit.nameRequired") })} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>{Locale.label("settings.emailTemplateEdit.category")}</InputLabel>
              <Controller name="category" control={control} render={({ field }) => (
                <Select {...field} label={Locale.label("settings.emailTemplateEdit.category")} onChange={(ev: SelectChangeEvent) => field.onChange(ev.target.value)}>
                  {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              )} />
            </FormControl>
          </Grid>
        </Grid>

        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>{Locale.label("settings.emailTemplateEdit.insertMergeSubject")}</Typography>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mb: 1 }}>
            {getMergeFields().map(f => (
              <Chip key={f.key} label={f.label} size="small" variant="outlined" onClick={() => insertMergeField(f.key)} sx={{ cursor: "pointer" }} />
            ))}
          </Stack>
        </Box>

        <Controller name="subject" control={control} rules={{ required: Locale.label("settings.emailTemplateEdit.subjectRequired") }} render={({ field }) => (
          <TextField
            fullWidth
            label={Locale.label("settings.emailTemplateEdit.subject")}
            placeholder={Locale.label("settings.emailTemplateEdit.subjectPlaceholder")}
            error={!!e.subject}
            helperText={e.subject?.message}
            name={field.name}
            value={field.value || ""}
            onChange={field.onChange}
            onBlur={field.onBlur}
            inputRef={(element) => {
              field.ref(element);
              subjectInputRef.current = element;
            }}
          />
        )} />

        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>{Locale.label("settings.emailTemplateEdit.insertMergeBody")}</Typography>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mb: 1 }}>
            {getMergeFields().map(f => (
              <Chip key={f.key} label={f.label} size="small" variant="outlined" onClick={() => insertMergeFieldInBody(f.key)} sx={{ cursor: "pointer" }} />
            ))}
          </Stack>
        </Box>

        <Box sx={{
          mt: 1,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          p: 1,
          overflow: "hidden",
          "& .editor-container": { overflow: "hidden" },
          "& .editor-inner": {
            height: 200,
            minHeight: 200,
            overflow: "hidden"
          },
          "& .editor-scroller": {
            height: 200,
            minHeight: 200,
            maxHeight: 200,
            overflowY: "auto"
          },
          "& .editor-input": {
            boxSizing: "border-box",
            minHeight: 200
          },
          "& .editor-inner > .MuiBox-root": { overflow: "hidden" },
          "& .editor-inner .MuiTextField-root": { height: "100%" },
          "& .editor-inner .MuiInputBase-root": {
            boxSizing: "border-box",
            height: "100%",
            overflow: "hidden"
          },
          "& .editor-inner textarea.MuiInputBase-input": {
            boxSizing: "border-box",
            height: "100% !important",
            minHeight: "0 !important",
            overflow: "auto"
          }
        }}>
          <Controller name="htmlContent" control={control} rules={{ required: Locale.label("settings.emailTemplateEdit.bodyRequired") }} render={({ field }) => (
            <HtmlEditor key={bodyEditorKey} value={field.value || ""} onChange={(val) => field.onChange(val)} style={{ minHeight: 200 }} placeholder={Locale.label("settings.emailTemplateEdit.composePlaceholder")} />
          )} />
        </Box>

        <Box sx={{ mt: 2, textAlign: "right" }}>
          <Button variant="outlined" size="small" onClick={() => setShowPreview(true)}>{Locale.label("settings.emailTemplateEdit.preview")}</Button>
        </Box>
      </FormCard>

      <Dialog open={showPreview} onClose={() => setShowPreview(false)} maxWidth="md" fullWidth>
        <DialogTitle>{Locale.label("settings.emailTemplateEdit.emailPreview")}</DialogTitle>
        <DialogContent>
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPreview(false)}>{Locale.label("settings.emailTemplateEdit.close")}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
