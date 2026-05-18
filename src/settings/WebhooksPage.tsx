import React, { useState, useEffect, useCallback } from "react";
import { Box, Table, TableHead, TableRow, TableCell, TableBody, IconButton, Tooltip, Stack, Button, Typography, Chip } from "@mui/material";
import { Webhook as WebhookIcon, Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from "@mui/icons-material";
import { ApiHelper, Loading, PageHeader, Locale, UserHelper, Permissions } from "@churchapps/apphelper";
import { PermissionDenied } from "../components";
import { WebhookEdit } from "./components/WebhookEdit";

export interface WebhookInterface {
  id?: string;
  churchId?: string;
  name?: string;
  url?: string;
  secret?: string;
  events?: string[];
  active?: boolean;
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
  dateCreated?: Date;
  dateCompleted?: Date;
}

const blankWebhook = (): WebhookInterface => ({ name: "", url: "", events: [], active: true });

export const WebhooksPage: React.FC = () => {
  const [webhooks, setWebhooks] = useState<WebhookInterface[]>([]);
  const [editWebhook, setEditWebhook] = useState<WebhookInterface | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(() => {
    setLoading(true);
    ApiHelper.get("/webhooks", "MembershipApi")
      .then((data: WebhookInterface[]) => setWebhooks(data || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = async (webhook: WebhookInterface) => {
    if (!window.confirm(Locale.label("settings.webhooksPage.deleteConfirm").replace("{name}", webhook.name || ""))) return;
    await ApiHelper.delete("/webhooks/" + webhook.id, "MembershipApi");
    loadData();
  };

  const handleSaved = () => { setEditWebhook(null); loadData(); };

  if (!UserHelper.checkAccess(Permissions.membershipApi.settings.edit)) return <PermissionDenied permissions={[Permissions.membershipApi.settings.edit]} />;
  if (loading) return <Loading />;

  return (
    <>
      <PageHeader title={Locale.label("settings.webhooksPage.title")} subtitle={Locale.label("settings.webhooksPage.subtitle")}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditWebhook(blankWebhook())} sx={{ color: "#FFF", backgroundColor: "rgba(255,255,255,0.2)", borderColor: "#FFF", "&:hover": { backgroundColor: "rgba(255,255,255,0.3)" } }}>
          {Locale.label("settings.webhooksPage.newWebhook")}
        </Button>
      </PageHeader>

      <Box sx={{ p: 2 }}>
        {editWebhook !== null ? (
          <WebhookEdit webhook={editWebhook} onSave={handleSaved} onCancel={() => setEditWebhook(null)} onDelete={editWebhook.id ? () => { handleDelete(editWebhook); setEditWebhook(null); } : undefined} />
        ) : (
          <>
            {webhooks.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 6 }}>
                <WebhookIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
                <Typography variant="h6" color="text.secondary">{Locale.label("settings.webhooksPage.emptyTitle")}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{Locale.label("settings.webhooksPage.emptyDescription")}</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditWebhook(blankWebhook())}>{Locale.label("settings.webhooksPage.createWebhook")}</Button>
              </Box>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{Locale.label("settings.webhooksPage.name")}</TableCell>
                    <TableCell>{Locale.label("settings.webhooksPage.url")}</TableCell>
                    <TableCell>{Locale.label("settings.webhooksPage.events")}</TableCell>
                    <TableCell>{Locale.label("settings.webhooksPage.status")}</TableCell>
                    <TableCell align="right">{Locale.label("settings.webhooksPage.actions")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {webhooks.map((w) => (
                    <TableRow key={w.id} hover sx={{ cursor: "pointer" }} onClick={() => setEditWebhook(w)}>
                      <TableCell><Typography fontWeight={600}>{w.name}</Typography></TableCell>
                      <TableCell><Typography variant="body2" sx={{ maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.url}</Typography></TableCell>
                      <TableCell>{w.events?.length || 0}</TableCell>
                      <TableCell><Chip size="small" color={w.active ? "success" : "default"} label={w.active ? Locale.label("settings.webhooksPage.active") : Locale.label("settings.webhooksPage.disabled")} /></TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Tooltip title={Locale.label("settings.webhooksPage.tooltipEdit")}>
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEditWebhook(w); }}><EditIcon fontSize="small" /></IconButton>
                          </Tooltip>
                          <Tooltip title={Locale.label("settings.webhooksPage.tooltipDelete")}>
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDelete(w); }}><DeleteIcon fontSize="small" /></IconButton>
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
