import React, { useState } from "react";
import { Box, Table, TableHead, TableRow, TableCell, TableBody, Stack, Button, Typography, Chip } from "@mui/material";
import { Email as EmailIcon, Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from "@mui/icons-material";
import { ApiHelper, Loading, PageHeader, UserHelper, Locale } from "@churchapps/apphelper";
import { useQuery } from "@tanstack/react-query";
import { EmailTemplateEdit } from "./components/EmailTemplateEdit";
import { AppIconButton } from "../components/ui/AppIconButton";
import { EmptyState, HeaderPrimaryButton } from "../components/ui";
import { useConfirmDelete } from "../hooks";
import { formatDateSafe } from "../helpers/DateFormatHelper";

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
  const [editTemplate, setEditTemplate] = useState<EmailTemplateInterface | null>(null);
  const templatesQuery = useQuery<EmailTemplateInterface[]>({ queryKey: ["/emailTemplates", "MessagingApi"], placeholderData: [] });
  const templates = templatesQuery.data || [];
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  const handleDelete = async (template: EmailTemplateInterface) => {
    if (!(await confirm(Locale.label("settings.emailTemplatesPage.deleteConfirm").replace("{name}", template.name)))) return;
    await ApiHelper.delete("/emailTemplates/" + UserHelper.currentUserChurch.church.id + "/" + template.id, "MessagingApi");
    templatesQuery.refetch();
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
    templatesQuery.refetch();
  };

  if (templatesQuery.isLoading) return <Loading />;

  return (
    <>
      {ConfirmDialogElement}
      <PageHeader icon={<EmailIcon />} title={Locale.label("settings.emailTemplatesPage.title")} subtitle={Locale.label("settings.emailTemplatesPage.subtitle")}>
        <HeaderPrimaryButton startIcon={<AddIcon />} onClick={handleNew}>
          {Locale.label("settings.emailTemplatesPage.newTemplate")}
        </HeaderPrimaryButton>
      </PageHeader>

      <Box sx={{ p: 2 }}>
        {editTemplate !== null && (
          <Box sx={{ mb: 3 }}>
            <EmailTemplateEdit template={editTemplate} onSave={handleSaved} onCancel={() => setEditTemplate(null)} onDelete={editTemplate.id ? () => { handleDelete(editTemplate); setEditTemplate(null); } : undefined} />
          </Box>
        )}

        {templates.length === 0 ? (
          <EmptyState
            icon={<EmailIcon />}
            title={Locale.label("settings.emailTemplatesPage.emptyTitle")}
            description={Locale.label("settings.emailTemplatesPage.emptyDescription")}
            action={<Button variant="contained" startIcon={<AddIcon />} onClick={handleNew}>{Locale.label("settings.emailTemplatesPage.createTemplate")}</Button>} />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{Locale.label("settings.emailTemplatesPage.name")}</TableCell>
                <TableCell>{Locale.label("settings.emailTemplatesPage.subject")}</TableCell>
                <TableCell>{Locale.label("settings.emailTemplatesPage.category")}</TableCell>
                <TableCell>{Locale.label("settings.emailTemplatesPage.modified")}</TableCell>
                <TableCell align="right"></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {templates.map((t) => (
                <TableRow key={t.id} hover>
                  <TableCell><Typography fontWeight={600}>{t.name}</Typography></TableCell>
                  <TableCell>{t.subject}</TableCell>
                  <TableCell>{t.category && <Chip label={t.category} size="small" />}</TableCell>
                  <TableCell>{formatDateSafe(t.dateModified)}</TableCell>
                  <TableCell align="right" className="rowActions">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <AppIconButton label={Locale.label("common.edit")} icon={<EditIcon />} onClick={() => handleEdit(t)} />
                      <AppIconButton label={Locale.label("common.delete")} icon={<DeleteIcon />} intent="remove" onClick={() => handleDelete(t)} />
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Box>
    </>
  );
};

export default EmailTemplatesPage;
