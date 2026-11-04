import React from "react";
import { Alert, Button, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { NotificationsActive as NotificationsActiveIcon, History as HistoryIcon } from "@mui/icons-material";
import { ApiHelper, Locale, Permissions, UserHelper } from "@churchapps/apphelper";
import type { GroupInterface } from "@churchapps/helpers";
import { CardWithHeader, HeaderPrimaryButton, StatusBadge, type StatusTone } from "../components/ui";
import { PermissionDenied } from "../components/PermissionDenied";
import { useConfirmDelete } from "../hooks";
import { MobileChrome } from "./components/MobileChrome";
import { SendNotificationDialog, formatPushTime, getPushTimeZone, type ScheduledNotificationInterface } from "../groups/components/SendNotificationDialog";

const STATUS_LABELS: Record<string, string> = {
  pending: "Scheduled",
  processing: "Sending",
  sent: "Sent",
  failed: "Failed",
  cancelled: "Cancelled"
};

const STATUS_TONES: Record<string, StatusTone> = { pending: "info", processing: "info", sent: "success", failed: "danger", cancelled: "neutral" };

// Scheduled push notifications (ChurchAppsSupport#1411): what is queued, with edit / send now / cancel, and recent history
// that can be removed one at a time or cleared (ChurchAppsSupport#1456).
export const PushNotificationsPage: React.FC = () => {
  const canSendEveryone = React.useMemo(() => UserHelper.checkAccess(Permissions.contentApi.content.edit), []);
  const canSendGroup = React.useMemo(() => UserHelper.checkAccess(Permissions.membershipApi.groupMembers.edit), []);
  const zone = React.useMemo(() => getPushTimeZone(), []);
  const [rows, setRows] = React.useState<ScheduledNotificationInterface[] | null>(null);
  const [groups, setGroups] = React.useState<GroupInterface[]>([]);
  const [editing, setEditing] = React.useState<ScheduledNotificationInterface | null>(null);
  const [composing, setComposing] = React.useState(false);
  const [error, setError] = React.useState("");
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  const loadData = React.useCallback(async () => {
    const data = await ApiHelper.get("/scheduledNotifications", "MessagingApi");
    setRows(Array.isArray(data) ? data : []);
  }, []);

  React.useEffect(() => {
    if (!canSendEveryone && !canSendGroup) return;
    loadData();
    if (canSendGroup) ApiHelper.get("/groups", "MembershipApi").then((data: GroupInterface[]) => setGroups(data || [])).catch(() => setGroups([]));
  }, [canSendEveryone, canSendGroup, loadData]);

  if (!canSendEveryone && !canSendGroup) return <PermissionDenied permissions={[Permissions.contentApi.content.edit, Permissions.membershipApi.groupMembers.edit]} />;

  const audienceLabel = (r: ScheduledNotificationInterface) => (r.audience === "church"
    ? Locale.label("mobile.pushNotifications.audienceEveryone", "Everyone with the app")
    : groups.find((g) => g.id === r.groupId)?.name || Locale.label("mobile.pushNotifications.group", "Group"));
  const canManage = (r: ScheduledNotificationInterface) => (r.audience === "church" ? canSendEveryone : canSendGroup);

  const runAction = async (action: () => Promise<any>) => {
    setError("");
    try {
      const resp = await action();
      if (resp?.error) setError(resp.error);
    } catch (e: any) {
      setError(e?.message || "Unable to update the notification.");
    }
    await loadData();
  };

  const handleSendNow = async (r: ScheduledNotificationInterface) => {
    const ok = await confirm(Locale.label("mobile.pushNotifications.sendNowConfirm", "Send this notification now?"), { confirmLabel: Locale.label("mobile.pushNotifications.sendNowAction", "Send now"), destructive: false });
    if (ok) await runAction(() => ApiHelper.post(`/scheduledNotifications/${r.id}/sendNow`, {}, "MessagingApi"));
  };

  const handleCancel = async (r: ScheduledNotificationInterface) => {
    const ok = await confirm(Locale.label("mobile.pushNotifications.cancelConfirm", "Cancel this scheduled notification? It will not be sent."), { confirmLabel: Locale.label("mobile.pushNotifications.cancel", "Cancel notification") });
    if (ok) await runAction(() => ApiHelper.delete(`/scheduledNotifications/${r.id}`, "MessagingApi"));
  };

  const handleRemove = async (r: ScheduledNotificationInterface) => {
    const ok = await confirm(Locale.label("mobile.pushNotifications.removeConfirm", "Remove this notification from the list? This cannot be undone."), { confirmLabel: Locale.label("mobile.pushNotifications.remove", "Remove") });
    if (ok) await runAction(() => ApiHelper.delete(`/scheduledNotifications/${r.id}`, "MessagingApi"));
  };

  const handleClearAll = async () => {
    const ok = await confirm(Locale.label("mobile.pushNotifications.clearAllConfirm", "Remove all sent, failed and cancelled notifications from the list? This cannot be undone."), { confirmLabel: Locale.label("mobile.pushNotifications.clearAll", "Clear all") });
    if (ok) await runAction(() => ApiHelper.delete("/scheduledNotifications", "MessagingApi"));
  };

  const upcoming = (rows || []).filter((r) => r.status === "pending" || r.status === "processing");
  const recent = (rows || []).filter((r) => r.status !== "pending" && r.status !== "processing");

  const statusText = (r: ScheduledNotificationInterface) => {
    if (r.status === "failed" && r.lastError === "missed send window") return Locale.label("mobile.pushNotifications.missed", "Missed (the send time passed)");
    if (r.status === "sent") return `${STATUS_LABELS.sent}: ${r.successCount ?? 0} of ${r.recipientCount ?? 0}`;
    return STATUS_LABELS[r.status || ""] || r.status;
  };

  return (
    <MobileChrome
      title={Locale.label("mobile.pushNotifications.title", "Push Notifications")}
      subtitle={Locale.label("mobile.pushNotifications.subtitle", "Schedule push notifications to the people using your church's app.")}
      actions={<HeaderPrimaryButton startIcon={<NotificationsActiveIcon />} onClick={() => setComposing(true)}>{Locale.label("mobile.pushNotifications.send", "Send Notification")}</HeaderPrimaryButton>}
    >
      <Stack spacing={3}>
        {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
        <CardWithHeader title={Locale.label("mobile.pushNotifications.scheduled", "Scheduled")} icon={<NotificationsActiveIcon />} count={upcoming.length}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {Locale.label("mobile.pushNotifications.timeZone", "Times are in {zone}.").replace("{zone}", zone)}
          </Typography>
          <Table size="small" data-testid="scheduled-table">
            <TableHead>
              <TableRow>
                <TableCell>{Locale.label("mobile.pushNotifications.sendAt", "Send at")}</TableCell>
                <TableCell>{Locale.label("mobile.pushNotifications.audience", "Audience")}</TableCell>
                <TableCell>{Locale.label("mobile.pushNotifications.notification", "Notification")}</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows && upcoming.length === 0 && (
                <TableRow><TableCell colSpan={4}><Typography variant="body2" color="text.secondary">{Locale.label("mobile.pushNotifications.noneScheduled", "Nothing is scheduled.")}</Typography></TableCell></TableRow>
              )}
              {upcoming.map((r) => (
                <TableRow key={r.id}>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{formatPushTime(r.sendAt, zone)}</TableCell>
                  <TableCell>{audienceLabel(r)}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{r.message}</Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    {r.status === "pending" && canManage(r) ? (
                      <>
                        <Button size="small" onClick={() => setEditing(r)}>{Locale.label("common.edit", "Edit")}</Button>
                        <Button size="small" onClick={() => handleSendNow(r)}>{Locale.label("mobile.pushNotifications.sendNowAction", "Send now")}</Button>
                        <Button size="small" color="error" onClick={() => handleCancel(r)}>{Locale.label("common.cancel", "Cancel")}</Button>
                      </>
                    ) : <StatusBadge tone={STATUS_TONES[r.status || ""] || "neutral"}>{statusText(r)}</StatusBadge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardWithHeader>

        <CardWithHeader
          title={Locale.label("mobile.pushNotifications.recent", "Recent")}
          icon={<HistoryIcon />}
          actions={recent.some(canManage) && <Button size="small" color="error" data-testid="clear-recent" onClick={handleClearAll}>{Locale.label("mobile.pushNotifications.clearAll", "Clear all")}</Button>}
        >
          <Table size="small" data-testid="recent-table">
            <TableHead>
              <TableRow>
                <TableCell>{Locale.label("mobile.pushNotifications.sentAt", "Sent at")}</TableCell>
                <TableCell>{Locale.label("mobile.pushNotifications.audience", "Audience")}</TableCell>
                <TableCell>{Locale.label("mobile.pushNotifications.notification", "Notification")}</TableCell>
                <TableCell>{Locale.label("mobile.pushNotifications.status", "Status")}</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows && recent.length === 0 && (
                <TableRow><TableCell colSpan={5}><Typography variant="body2" color="text.secondary">{Locale.label("mobile.pushNotifications.noneRecent", "No notifications have gone out yet.")}</Typography></TableCell></TableRow>
              )}
              {recent.map((r) => (
                <TableRow key={r.id}>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{formatPushTime(r.sentAt || r.sendAt, zone)}</TableCell>
                  <TableCell>{audienceLabel(r)}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{r.message}</Typography>
                  </TableCell>
                  <TableCell>
                    <StatusBadge tone={STATUS_TONES[r.status || ""] || "neutral"}>{statusText(r)}</StatusBadge>
                    {r.status === "failed" && r.lastError && r.lastError !== "missed send window" && <Typography variant="caption" color="error" display="block">{r.lastError}</Typography>}
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    {canManage(r) && <Button size="small" color="error" data-testid="remove-notification" onClick={() => handleRemove(r)}>{Locale.label("mobile.pushNotifications.remove", "Remove")}</Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardWithHeader>
      </Stack>

      {ConfirmDialogElement}
      {(composing || editing) && (
        <SendNotificationDialog
          existing={editing || undefined}
          onClose={() => { setComposing(false); setEditing(null); loadData(); }}
          onSaved={loadData}
        />
      )}
    </MobileChrome>
  );
};
