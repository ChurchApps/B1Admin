import React, { useState, useEffect, useCallback } from "react";
import { Box, Table, TableHead, TableRow, TableCell, TableBody, Stack, Button, Typography, Chip } from "@mui/material";
import { Email as EmailIcon, Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from "@mui/icons-material";
import { ApiHelper, Loading, PageHeader, UserHelper, Locale } from "@churchapps/apphelper";
import { EmailTemplateEdit } from "./components/EmailTemplateEdit";
import { AppIconButton } from "../components/ui/AppIconButton";

export interface EmailTemplateInterface {
  id?: string;
  churchId?: string;
  name?: string;
  subject?: string;
  htmlContent?: string;
  category?: string;
  dateCreated?: Date;
  dateModified?: Date;
}

export const EmailTemplatesPage: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplateInterface[]>([]);
  const [editTemplate, setEditTemplate] = useState<EmailTemplateInterface | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(() => {
    setLoading(true);
    ApiHelper.get("/emailTemplates", "MessagingApi")
      .then((data: EmailTemplateInterface[]) => setTemplates(data || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = async (template: EmailTemplateInterface) => {
    if (!window.confirm(Locale.label("settings.emailTemplatesPage.deleteConfirm").replace("{name}", template.name))) return;
    await ApiHelper.delete("/emailTemplates/" + UserHelper.currentUserChurch.church.id + "/" + template.id, "MessagingApi");
    loadData();
  };

  const handleEdit = (template: EmailTemplateInterface) => {
    // Load full template (list view doesn't include htmlContent)
    ApiHelper.get("/emailTemplates/" + template.id, "MessagingApi").then((data: EmailTemplateInterface) => {
      setEditTemplate(data);
    });
  };

  const handleNew = () => {
    setEditTemplate({ name: "", subject: "", htmlContent: "", category: "General" });
  };

  const handleSaved = () => {
    setEditTemplate(null);
    loadData();
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString();
  };

  if (loading) return <Loading />;

  return (
    <>
      <PageHeader title={Locale.label("settings.emailTemplatesPage.title")} subtitle={Locale.label("settings.emailTemplatesPage.subtitle")}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleNew} sx={{ color: "#FFF", backgroundColor: "rgba(255,255,255,0.2)", borderColor: "#FFF", "&:hover": { backgroundColor: "rgba(255,255,255,0.3)" } }}>
          {Locale.label("settings.emailTemplatesPage.newTemplate")}
        </Button>
      </PageHeader>

      <Box sx={{ p: 2 }}>
        {editTemplate !== null ? (
          <EmailTemplateEdit template={editTemplate} onSave={handleSaved} onCancel={() => setEditTemplate(null)} onDelete={editTemplate.id ? () => { handleDelete(editTemplate); setEditTemplate(null); } : undefined} />
        ) : (
          <>
            {templates.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 6 }}>
                <EmailIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
                <Typography variant="h6" color="text.secondary">{Locale.label("settings.emailTemplatesPage.emptyTitle")}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{Locale.label("settings.emailTemplatesPage.emptyDescription")}</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleNew}>{Locale.label("settings.emailTemplatesPage.createTemplate")}</Button>
              </Box>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{Locale.label("settings.emailTemplatesPage.name")}</TableCell>
                    <TableCell>{Locale.label("settings.emailTemplatesPage.subject")}</TableCell>
                    <TableCell>{Locale.label("settings.emailTemplatesPage.category")}</TableCell>
                    <TableCell>{Locale.label("settings.emailTemplatesPage.modified")}</TableCell>
                    <TableCell align="right">{Locale.label("settings.emailTemplatesPage.actions")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {templates.map((t) => (
                    <TableRow key={t.id} hover sx={{ cursor: "pointer" }} onClick={() => handleEdit(t)}>
                      <TableCell><Typography fontWeight={600}>{t.name}</Typography></TableCell>
                      <TableCell>{t.subject}</TableCell>
                      <TableCell>{t.category && <Chip label={t.category} size="small" />}</TableCell>
                      <TableCell>{formatDate(t.dateModified)}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <AppIconButton label={Locale.label("common.edit")} icon={<EditIcon />} onClick={(e) => { e.stopPropagation(); handleEdit(t); }} />
                          <AppIconButton label={Locale.label("common.delete")} icon={<DeleteIcon />} intent="remove" onClick={(e) => { e.stopPropagation(); handleDelete(t); }} />
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </>
        )}
      </Box>
    </>
  );
};

export default EmailTemplatesPage;
