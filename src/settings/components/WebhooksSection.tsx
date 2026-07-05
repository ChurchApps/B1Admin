import React, { useState } from "react";
import { Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Stack, Typography, Chip } from "@mui/material";
import { Webhook as WebhookIcon, Edit as EditIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { useQuery } from "@tanstack/react-query";
import { WebhookEdit } from "./WebhookEdit";
import { SectionListCard } from "../../components/ui";
import { AppIconButton } from "../../components/ui/AppIconButton";
import { useConfirmDelete } from "../../hooks";

export interface WebhookInterface {
  id?: string;
  churchId?: string;
  name?: string;
  url?: string;
  secret?: string;
  events?: string[];
  active?: boolean;
  connectorType?: string;
  consecutiveFailures?: number;
  dateCreated?: Date;
  dateModified?: Date;
}

export interface WebhookDeliveryInterface {
  id?: string;
  webhookId?: string;
  event?: string;
  payload?: string;
  status?: string;
  attemptCount?: number;
  responseStatus?: number;
  responseBody?: string;
  nextAttemptAt?: Date;
  dateCompleted?: Date;
  dateCreated?: Date;
}

const blankWebhook = (): WebhookInterface => ({ name: "", url: "", events: [], active: true, connectorType: "standard" });

export const WebhooksSection: React.FC = () => {
  const [editWebhook, setEditWebhook] = useState<WebhookInterface | null>(null);
  const webhooksQuery = useQuery<WebhookInterface[]>({ queryKey: ["/webhooks", "MembershipApi"], placeholderData: [] });
  const webhooks = webhooksQuery.data || [];
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  const handleDelete = async (webhook: WebhookInterface) => {
    if (!(await confirm(Locale.label("settings.webhooksPage.deleteConfirm").replace("{name}", webhook.name || "")))) return;
    await ApiHelper.delete("/webhooks/" + webhook.id, "MembershipApi");
    webhooksQuery.refetch();
  };

  const handleSaved = () => { setEditWebhook(null); webhooksQuery.refetch(); };

  if (editWebhook !== null) {
    return <WebhookEdit webhook={editWebhook} onSave={handleSaved} onCancel={() => setEditWebhook(null)} onDelete={editWebhook.id ? () => { handleDelete(editWebhook); setEditWebhook(null); } : undefined} />;
  }

  return (
    <>
      {ConfirmDialogElement}
      <SectionListCard
        icon={<WebhookIcon />}
        title={Locale.label("settings.webhooksPage.title")}
        count={webhooks.length}
        onAdd={() => setEditWebhook(blankWebhook())}
        addLabel={Locale.label("settings.webhooksPage.newWebhook")}
        loading={webhooksQuery.isLoading}
        empty={{
          icon: <WebhookIcon />,
          title: Locale.label("settings.webhooksPage.emptyTitle"),
          description: Locale.label("settings.webhooksPage.emptyDescription")
        }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{Locale.label("settings.webhooksPage.name")}</TableCell>
                <TableCell>{Locale.label("settings.webhooksPage.url")}</TableCell>
                <TableCell align="right">{Locale.label("settings.webhooksPage.events")}</TableCell>
                <TableCell>{Locale.label("settings.webhooksPage.status")}</TableCell>
                <TableCell align="right"></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {webhooks.map((w) => (
                <TableRow key={w.id} hover sx={{ cursor: "pointer" }} onClick={() => setEditWebhook(w)}>
                  <TableCell><Typography fontWeight={600}>{w.name}</Typography></TableCell>
                  <TableCell><Typography variant="body2" sx={{ maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.url}</Typography></TableCell>
                  <TableCell align="right">{w.events?.length || 0}</TableCell>
                  <TableCell><Chip size="small" color={w.active ? "success" : "default"} label={w.active ? Locale.label("settings.webhooksPage.active") : Locale.label("settings.webhooksPage.disabled")} /></TableCell>
                  <TableCell align="right" className="rowActions">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <AppIconButton label={Locale.label("common.edit")} icon={<EditIcon />} onClick={(e) => { e.stopPropagation(); setEditWebhook(w); }} />
                      <AppIconButton label={Locale.label("common.delete")} icon={<DeleteIcon />} intent="remove" onClick={(e) => { e.stopPropagation(); handleDelete(w); }} />
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </SectionListCard>
    </>
  );
};
