import React, { useState, useEffect, useCallback } from "react";
import { Box, Table, TableHead, TableRow, TableCell, TableBody, IconButton, Tooltip, Stack, Button, Typography, Chip } from "@mui/material";
import { Email as EmailIcon, Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from "@mui/icons-material";
import { ApiHelper, Locale, Loading, PageHeader, UserHelper, Permissions } from "@churchapps/apphelper";
import { EmailTemplateEdit } from "./components/EmailTemplateEdit";

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
    ApiHelper.get("/messaging/emailTemplates", "MessagingApi")
      .then((data: EmailTemplateInterface[]) => setTemplates(data || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = async (template: EmailTemplateInterface) => {
    if (!window.confirm(`Delete template "${template.name}"?`)) return;
    await ApiHelper.delete("/messaging/emailTemplates/" + UserHelper.currentUserChurch.church.id + "/" + template.id, "MessagingApi");
    loadData();
  };

  const handleEdit = (template: EmailTemplateInterface) => {
    // Load full template (list view doesn't include htmlContent)
    ApiHelper.get("/messaging/emailTemplates/" + template.id, "MessagingApi").then((data: EmailTemplateInterface) => {
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
      <PageHeader icon={<EmailIcon />} title="Email Templates" subtitle="Create and manage reusable email templates">
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleNew} sx={{ color: "#FFF", backgroundColor: "rgba(255,255,255,0.2)", borderColor: "#FFF", "&:hover": { backgroundColor: "rgba(255,255,255,0.3)" } }}>
          New Template
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
                <Typography variant="h6" color="text.secondary">No email templates yet</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Create a template to get started with bulk email.</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleNew}>Create Template</Button>
              </Box>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Subject</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Modified</TableCell>
                    <TableCell align="right">Actions</TableCell>
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
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleEdit(t); }}><EditIcon fontSize="small" /></IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDelete(t); }}><DeleteIcon fontSize="small" /></IconButton>
                          </Tooltip>
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
