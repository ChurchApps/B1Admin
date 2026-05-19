import React, { useState, useEffect, useCallback } from "react";
import { TextField, FormControlLabel, Switch, Checkbox, Box, Typography, Stack, Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions, Table, TableHead, TableRow, TableCell, TableBody } from "@mui/material";
import { ApiHelper, InputBox, ErrorMessages, Locale } from "@churchapps/apphelper";
import type { WebhookInterface, WebhookDeliveryInterface } from "../WebhooksPage";

interface Props {
  webhook: WebhookInterface;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
}

const statusColor = (status?: string): "success" | "warning" | "error" | "default" => {
  if (status === "succeeded") return "success";
  if (status === "failed" || status === "pending") return "warning";
  if (status === "exhausted") return "error";
  return "default";
};

const codeBox = { backgroundColor: "#fafafa", border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1, mb: 2, overflow: "auto", maxHeight: 240, fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-all" } as const;

export const WebhookEdit: React.FC<Props> = ({ webhook, onSave, onCancel, onDelete }) => {
  const [name, setName] = useState(webhook.name || "");
  const [url, setUrl] = useState(webhook.url || "");
  const [active, setActive] = useState(webhook.active !== false);
  const [events, setEvents] = useState<string[]>(webhook.events || []);
  const [catalog, setCatalog] = useState<Record<string, string[]>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deliveries, setDeliveries] = useState<WebhookDeliveryInterface[]>([]);
  const [detail, setDetail] = useState<WebhookDeliveryInterface | null>(null);
  const [testing, setTesting] = useState(false);

  const loadDeliveries = useCallback(() => {
    if (!webhook.id) return;
    ApiHelper.get("/webhooks/" + webhook.id + "/deliveries", "MembershipApi").then((d: WebhookDeliveryInterface[]) => setDeliveries(d || []));
  }, [webhook.id]);

  useEffect(() => {
    ApiHelper.get("/webhooks/events", "MembershipApi").then((d: { groups?: Record<string, string[]> }) => setCatalog(d?.groups || {}));
    loadDeliveries();
  }, [loadDeliveries]);

  const toggleEvent = (event: string) => {
    setEvents((prev) => (prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]));
  };

  const validate = () => {
    const errs: string[] = [];
    if (!name.trim()) errs.push(Locale.label("settings.webhookEdit.nameRequired"));
    if (!url.trim()) errs.push(Locale.label("settings.webhookEdit.urlRequired"));
    if (events.length === 0) errs.push(Locale.label("settings.webhookEdit.eventsRequired"));
    setErrors(errs);
    return errs.length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const payload: WebhookInterface = { id: webhook.id, name, url, events, active };
    const saved: WebhookInterface = await ApiHelper.post("/webhooks", payload, "MembershipApi");
    // The signing secret is only returned when a webhook is first created.
    if (saved?.secret) setSecret(saved.secret);
    else onSave();
  };

  const handleRegenerate = async () => {
    if (!window.confirm(Locale.label("settings.webhookEdit.regenerateConfirm"))) return;
    const res: { secret?: string } = await ApiHelper.post("/webhooks/" + webhook.id + "/regenerate-secret", {}, "MembershipApi");
    if (res?.secret) setSecret(res.secret);
  };

  const handleRedeliver = async (delivery: WebhookDeliveryInterface) => {
    await ApiHelper.post("/webhooks/deliveries/" + delivery.id + "/redeliver", {}, "MembershipApi");
    loadDeliveries();
  };

  const handleSendTest = async () => {
    setTesting(true);
    try {
      await ApiHelper.post("/webhooks/" + webhook.id + "/test", {}, "MembershipApi");
      loadDeliveries();
    } finally {
      setTesting(false);
    }
  };

  const copySecret = () => {
    if (secret) navigator.clipboard?.writeText(secret);
    setCopied(true);
  };

  const closeSecret = () => {
    setSecret(null);
    setCopied(false);
    onSave();
  };

  return (
    <>
      <InputBox headerIcon="webhook" headerText={webhook.id ? Locale.label("settings.webhookEdit.editWebhook") : Locale.label("settings.webhookEdit.newWebhook")} saveFunction={handleSave} cancelFunction={onCancel} deleteFunction={onDelete}>
        <ErrorMessages errors={errors} />
        <TextField fullWidth label={Locale.label("settings.webhookEdit.name")} placeholder={Locale.label("settings.webhookEdit.namePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} />
        <TextField fullWidth label={Locale.label("settings.webhookEdit.url")} placeholder={Locale.label("settings.webhookEdit.urlPlaceholder")} value={url} onChange={(e) => setUrl(e.target.value)} />
        <FormControlLabel control={<Switch checked={active} onChange={(e) => setActive(e.target.checked)} />} label={Locale.label("settings.webhookEdit.active")} />
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>{Locale.label("settings.webhookEdit.events")}</Typography>
          {Object.keys(catalog).map((group) => (
            <Stack key={group} direction="row" flexWrap="wrap">
              {catalog[group].map((event) => (
                <FormControlLabel key={event} control={<Checkbox size="small" checked={events.includes(event)} onChange={() => toggleEvent(event)} />} label={event} />
              ))}
            </Stack>
          ))}
        </Box>
        {webhook.id && (
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button variant="outlined" size="small" onClick={handleRegenerate}>{Locale.label("settings.webhookEdit.regenerateSecret")}</Button>
            <Button variant="outlined" size="small" onClick={handleSendTest} disabled={testing}>{testing ? Locale.label("settings.webhookEdit.sendingTest") : Locale.label("settings.webhookEdit.sendTest")}</Button>
          </Stack>
        )}
      </InputBox>

      {webhook.id && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>{Locale.label("settings.webhookEdit.deliveries")}</Typography>
          {deliveries.length === 0 ? (
            <Typography variant="body2" color="text.secondary">{Locale.label("settings.webhookEdit.noDeliveries")}</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{Locale.label("settings.webhookEdit.event")}</TableCell>
                  <TableCell>{Locale.label("settings.webhooksPage.status")}</TableCell>
                  <TableCell>{Locale.label("settings.webhookEdit.attempts")}</TableCell>
                  <TableCell>{Locale.label("settings.webhookEdit.response")}</TableCell>
                  <TableCell>{Locale.label("settings.webhookEdit.date")}</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {deliveries.map((d) => (
                  <TableRow key={d.id} hover sx={{ cursor: "pointer" }} onClick={() => setDetail(d)}>
                    <TableCell>{d.event}</TableCell>
                    <TableCell><Chip size="small" color={statusColor(d.status)} label={d.status} /></TableCell>
                    <TableCell>{d.attemptCount}</TableCell>
                    <TableCell>{d.responseStatus || "—"}</TableCell>
                    <TableCell>{d.dateCreated ? new Date(d.dateCreated).toLocaleString() : ""}</TableCell>
                    <TableCell align="right">
                      <Button size="small" onClick={(e) => { e.stopPropagation(); handleRedeliver(d); }}>{Locale.label("settings.webhookEdit.redeliver")}</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Box>
      )}

      <Dialog open={!!secret} onClose={closeSecret} maxWidth="sm" fullWidth>
        <DialogTitle>{Locale.label("settings.webhookEdit.secretTitle")}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>{Locale.label("settings.webhookEdit.secretIntro")}</Typography>
          <TextField fullWidth value={secret || ""} InputProps={{ readOnly: true }} />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>{Locale.label("settings.webhookEdit.secretSignNote")}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={copySecret}>{copied ? Locale.label("settings.webhookEdit.copied") : Locale.label("settings.webhookEdit.copy")}</Button>
          <Button variant="contained" onClick={closeSecret}>{Locale.label("settings.webhookEdit.close")}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="md" fullWidth>
        <DialogTitle>{Locale.label("settings.webhookEdit.deliveryDetail")}</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>{Locale.label("settings.webhookEdit.payload")}</Typography>
          <Box component="pre" sx={codeBox}>{detail?.payload}</Box>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>{Locale.label("settings.webhookEdit.responseBody")}</Typography>
          <Box component="pre" sx={codeBox}>{detail?.responseBody || "—"}</Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetail(null)}>{Locale.label("settings.webhookEdit.close")}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
