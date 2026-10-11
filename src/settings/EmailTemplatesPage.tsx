import React, { useState } from "react";
import { Box, Button, Table, TableHead, TableRow, TableCell, TableBody, Typography } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { ApiHelper, Loading, UserHelper, Locale } from "@churchapps/apphelper";
import { useQuery } from "@tanstack/react-query";
import { EmailTemplateEdit } from "./components/EmailTemplateEdit";
import { PageContainer, Surface, StatusBadge, TextAction, VerbRow, tableScrollSx } from "../components/ui";
import { useConfirmDelete } from "../hooks";
import { SettingsHeader } from "./components/SettingsHeader";
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
    if (!(await confirm(Locale.label("settings.emailTemplatesPage.deleteConfirm").replace("{name}", template.name || "")))) return false;
    await ApiHelper.delete("/emailTemplates/" + UserHelper.currentUserChurch.church.id + "/" + template.id, "MessagingApi");
    templatesQuery.refetch();
    return true;
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
      <SettingsHeader title={Locale.label("settings.emailTemplatesPage.title")} subtitle={Locale.label("settings.emailTemplatesPage.subtitle")}>
        {editTemplate === null && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleNew} data-testid="new-email-template-button">{Locale.label("settings.emailTemplatesPage.newTemplate")}</Button>
        )}
      </SettingsHeader>

      <PageContainer py={3}>
        {editTemplate !== null && (
          <Box sx={{ mb: 3 }}>
            <EmailTemplateEdit template={editTemplate} onSave={handleSaved} onCancel={() => setEditTemplate(null)} onDelete={editTemplate.id ? async () => { if (await handleDelete(editTemplate)) setEditTemplate(null); } : undefined} />
          </Box>
        )}

        {templates.length === 0 ? (
          <Box>
            <Typography color="text.secondary">{Locale.label("settings.emailTemplatesPage.emptyTitle")}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{Locale.label("settings.emailTemplatesPage.emptyDescription")}</Typography>
          </Box>
        ) : (
          <Surface disablePadding>
            <Box sx={tableScrollSx} role="region" aria-label={Locale.label("settings.emailTemplatesPage.title")} tabIndex={0}>
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
                    <TableRow key={t.id}>
                      <TableCell><Typography variant="body1" fontWeight={600}>{t.name}</Typography></TableCell>
                      <TableCell>{t.subject}</TableCell>
                      <TableCell>{t.category && <StatusBadge>{t.category}</StatusBadge>}</TableCell>
                      <TableCell>{formatDateSafe(t.dateModified)}</TableCell>
                      <TableCell align="right">
                        <VerbRow sx={{ justifyContent: "flex-end", flexWrap: "nowrap" }}>
                          <TextAction small onClick={() => handleEdit(t)} aria-label={Locale.label("common.edit")}>{Locale.label("common.edit")}</TextAction>
                          <TextAction small onClick={() => handleDelete(t)} aria-label={Locale.label("common.delete")}>{Locale.label("common.delete")}</TextAction>
                        </VerbRow>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Surface>
        )}
      </PageContainer>
    </>
  );
};

export default EmailTemplatesPage;
