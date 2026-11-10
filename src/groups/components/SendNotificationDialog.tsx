import React from "react";
import { Alert, Box, FormControl, FormControlLabel, InputLabel, MenuItem, Radio, RadioGroup, Select, Stack, TextField, Typography } from "@mui/material";
import { NotificationsActive as NotificationsActiveIcon } from "@mui/icons-material";
import { LocalizationProvider, DateTimePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { type Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { ApiHelper, Locale, Permissions, UserHelper } from "@churchapps/apphelper";
import type { GroupInterface } from "@churchapps/helpers";
import { useSendDialog } from "./useSendDialog";
import { SendDialogShell } from "./SendDialogShell";

dayjs.extend(utc);
dayjs.extend(timezone);

interface PreviewData {
  totalMembers: number;
  eligibleCount: number;
  noDeviceCount: number;
  pushDisabledCount: number;
  excludedSenderCount: number;
  webPushDeviceCount: number;
}

interface SendResult extends Partial<PreviewData> {
  recipientCount?: number;
  successCount?: number;
  skippedCount?: number;
  status?: string;
  sendAt?: string;
}

export interface ScheduledNotificationInterface {
  id?: string;
  audience?: "group" | "church";
  groupId?: string;
  title?: string;
  message?: string;
  link?: string;
  imageUrl?: string;
  sendAt?: string;
  timeZone?: string;
  status?: string;
  sentAt?: string;
  recipientCount?: number;
  successCount?: number;
  lastError?: string;
}

interface Props {
  groupId?: string;
  groupName?: string;
  existing?: ScheduledNotificationInterface;
  onClose: () => void;
  onSaved?: () => void;
}

const EVERYONE = "church";

const isOptionalUrlValid = (value: string) => {
  const trimmed = value.trim();
  return !trimmed || /^https?:\/\//i.test(trimmed) || trimmed.startsWith("/");
};

const isOptionalImageUrlValid = (value: string) => {
  const trimmed = value.trim();
  return !trimmed || /^https?:\/\//i.test(trimmed);
};

// Scheduled times are entered in the church's time zone when it is set, otherwise the browser's.
export const getPushTimeZone = () => (UserHelper.currentUserChurch?.church as any)?.timeZone || dayjs.tz.guess();

export const formatPushTime = (value: string | Date | undefined, zone: string) => (value ? dayjs(value).tz(zone).format("ddd, MMM D, YYYY h:mm A") : "");

export const SendNotificationDialog: React.FC<Props> = (props) => {
  const existing = props.existing;
  const zone = React.useMemo(() => existing?.timeZone || getPushTimeZone(), [existing]);
  const canSendEveryone = React.useMemo(() => UserHelper.checkAccess(Permissions.contentApi.content.edit), []);
  const canSendGroup = React.useMemo(() => UserHelper.checkAccess(Permissions.membershipApi.groupMembers.edit), []);
  const showAudience = !props.groupId;

  const [title, setTitle] = React.useState(existing?.title || "");
  const [message, setMessage] = React.useState(existing?.message || "");
  const [link, setLink] = React.useState(existing?.link || "");
  const [imageUrl, setImageUrl] = React.useState(existing?.imageUrl || "");
  const [audience, setAudience] = React.useState<string>(() => {
    if (props.groupId) return props.groupId;
    if (existing) return existing.audience === "group" ? existing.groupId || "" : EVERYONE;
    return canSendEveryone ? EVERYONE : "";
  });
  const [when, setWhen] = React.useState<"now" | "later">(existing ? "later" : "now");
  // The picker holds the wall-clock time in the push time zone; it is converted to UTC on save.
  const [sendAt, setSendAt] = React.useState<Dayjs | null>(() => (existing?.sendAt ? dayjs(dayjs(existing.sendAt).tz(zone).format("YYYY-MM-DDTHH:mm")) : null));
  const [groups, setGroups] = React.useState<GroupInterface[]>([]);

  React.useEffect(() => {
    if (!showAudience || !canSendGroup) return;
    ApiHelper.get("/groups", "MembershipApi").then((data: GroupInterface[]) => setGroups(data || [])).catch(() => setGroups([]));
  }, [showAudience, canSendGroup]);

  const isEveryone = audience === EVERYONE;
  const groupId = isEveryone ? "" : audience;
  const groupName = props.groupName || groups.find((g) => g.id === groupId)?.name || "";
  const isGroupSendNow = !!groupId && when === "now" && !existing;
  const sendAtUtc = sendAt && sendAt.isValid() ? dayjs.tz(sendAt.format("YYYY-MM-DDTHH:mm"), zone) : null;

  const { sending, result, error, preview, loadingPreview, handleSend } = useSendDialog<PreviewData, SendResult>({
    previewUrl: isEveryone ? "/notifications/churchPreview" : groupId ? "/notifications/groupPreview/" + groupId : null,
    sendUrl: isGroupSendNow ? "/notifications/group/send" : "/scheduledNotifications",
    buildPayload: () => {
      if (!title.trim() || !message.trim() || !audience) return null;
      const base = { title: title.trim(), message: message.trim(), link: link.trim(), imageUrl: imageUrl.trim() };
      if (isGroupSendNow) return { ...base, groupId };
      if (when === "later" && !sendAtUtc) return null;
      return {
        ...base,
        id: existing?.id,
        audience: isEveryone ? "church" : "group",
        groupId: groupId || undefined,
        sendAt: when === "later" ? sendAtUtc!.toISOString() : new Date().toISOString(),
        timeZone: zone
      };
    },
    fallbackError: Locale.label("groups.sendNotificationDialog.fallbackError", "Unable to send the push notification.")
  });

  const { onSaved } = props;
  React.useEffect(() => { if (result) onSaved?.(); }, [result, onSaved]);

  const renderPreview = () => {
    if (loadingPreview) return <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{Locale.label("groups.sendNotificationDialog.loadingRecipients", "Loading recipients...")}</Typography>;
    if (!preview) return <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{Locale.label("groups.sendNotificationDialog.checkedBeforeSending", "Push recipients will be checked before sending.")}</Typography>;

    return (
      <Alert severity={preview.eligibleCount > 0 ? "info" : "warning"} sx={{ mb: 2 }}>
        {isEveryone
          ? <>{Locale.label("groups.sendNotificationDialog.eligibleEveryone", "{eligible} of {total} people using the app have push enabled.").replace("{eligible}", String(preview.eligibleCount)).replace("{total}", String(preview.totalMembers))}</>
          : <>{Locale.label("groups.sendNotificationDialog.eligibleGroup", "{eligible} of {total} members have B1App PWA push enabled.").replace("{eligible}", String(preview.eligibleCount)).replace("{total}", String(preview.totalMembers))}</>}
        {preview.excludedSenderCount > 0 && <><br />{Locale.label("groups.sendNotificationDialog.senderExcluded", "The sender is excluded.")}</>}
        {!isEveryone && preview.noDeviceCount > 0 && <><br />{Locale.label("groups.sendNotificationDialog.noDevice", "{count} members do not have a registered PWA push device.").replace("{count}", String(preview.noDeviceCount))}</>}
        {preview.pushDisabledCount > 0 && <><br />{(isEveryone ? Locale.label("groups.sendNotificationDialog.pushDisabledPeople", "{count} people have push disabled.") : Locale.label("groups.sendNotificationDialog.pushDisabledMembers", "{count} members have push disabled.")).replace("{count}", String(preview.pushDisabledCount))}</>}
        {when === "later" && <><br />{Locale.label("groups.sendNotificationDialog.resolvedAtSend", "Recipients are checked again when it goes out.")}</>}
      </Alert>
    );
  };

  const renderResult = () => {
    if (!result) return null;
    if (result.status === "pending") {
      return (
        <Alert severity="success" sx={{ mt: 1 }}>
          &ldquo;{title.trim()}&rdquo; {Locale.label("groups.sendNotificationDialog.scheduled", "is scheduled for")} {formatPushTime(result.sendAt, zone)} ({zone}).
          <br />{Locale.label("groups.sendNotificationDialog.manage", "See, edit or cancel it under Mobile > Push Notifications.")}
        </Alert>
      );
    }
    const recipientCount = result.recipientCount || 0;
    const successCount = result.successCount || 0;
    const skippedCount = result.skippedCount ?? recipientCount - successCount;
    return (
      <>
        <Alert severity={successCount > 0 ? "success" : "warning"} sx={{ mt: 1 }}>
          {Locale.label("groups.sendNotificationDialog.queued", "{success} of {total} push notifications were queued.").replace("{success}", String(successCount)).replace("{total}", String(recipientCount))}
          {skippedCount > 0 && <><br />{Locale.label("groups.sendNotificationDialog.skipped", "{count} recipients were skipped.").replace("{count}", String(skippedCount))}</>}
        </Alert>
        {(!!result.noDeviceCount || !!result.pushDisabledCount) && (
          <Alert severity="info" sx={{ mt: 1 }}>
            {!!result.noDeviceCount && <>{Locale.label("groups.sendNotificationDialog.hadNoDevice", "{count} members had no registered PWA push device.").replace("{count}", String(result.noDeviceCount))}<br /></>}
            {!!result.pushDisabledCount && <>{Locale.label("groups.sendNotificationDialog.hadPushDisabled", "{count} members had push disabled.").replace("{count}", String(result.pushDisabledCount))}</>}
          </Alert>
        )}
      </>
    );
  };

  const titleCount = title.length;
  const messageCount = message.length;
  const linkValid = isOptionalUrlValid(link);
  const imageUrlValid = isOptionalImageUrlValid(imageUrl);
  const sendAtValid = when === "now" || (!!sendAtUtc && sendAtUtc.isAfter(dayjs()));
  // A scheduled send resolves recipients when it goes out, so no one being reachable yet doesn't block it.
  const recipientsOk = when === "later" || !preview || preview.eligibleCount > 0;
  const canSend = !sending && !!audience && title.trim().length > 0 && message.trim().length > 0 && linkValid && imageUrlValid && sendAtValid && recipientsOk;

  const dialogTitle = props.groupName
    ? <>{Locale.label("groups.sendNotificationDialog.groupTitle", "Push Notification: {groupName}").replace("{groupName}", props.groupName)}</>
    : existing ? <>{Locale.label("groups.sendNotificationDialog.editTitle", "Edit Push Notification")}</> : <>{Locale.label("groups.sendNotificationDialog.title", "Push Notification")}</>;
  const sendLabel = existing
    ? Locale.label("groups.sendNotificationDialog.saveChanges", "Save Changes")
    : when === "later" ? Locale.label("groups.sendNotificationDialog.scheduleButton", "Schedule Notification") : Locale.label("groups.sendNotificationDialog.sendButton", "Send Notification");

  return (
    <SendDialogShell
      onClose={props.onClose}
      maxWidth="md"
      title={dialogTitle}
      isComplete={!!result}
      resultContent={renderResult()}
      sending={sending}
      canSend={canSend}
      onSend={handleSend}
      closeLabel={Locale.label("common.close")}
      cancelLabel={Locale.label("common.cancel")}
      sendLabel={sendLabel}
      sendingLabel={Locale.label("groups.sendNotificationDialog.sending", "Sending...")}
    >
      {showAudience && (
        <FormControl fullWidth sx={{ mb: 2 }} disabled={sending || !!existing}>
          <InputLabel id="push-audience-label">{Locale.label("groups.sendNotificationDialog.audience", "Audience")}</InputLabel>
          <Select
            labelId="push-audience-label"
            label={Locale.label("groups.sendNotificationDialog.audience", "Audience")}
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            data-testid="push-audience-select"
          >
            {canSendEveryone && <MenuItem value={EVERYONE}>{Locale.label("mobile.pushNotifications.audienceEveryone", "Everyone with the app")}</MenuItem>}
            {canSendGroup && groups.map((g) => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
            {!!groupId && !groups.some((g) => g.id === groupId) && <MenuItem value={groupId}>{groupName || groupId}</MenuItem>}
          </Select>
        </FormControl>
      )}
      {renderPreview()}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack spacing={2}>
        {!existing && (
          <FormControl disabled={sending}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{Locale.label("groups.sendNotificationDialog.when", "When")}</Typography>
            <RadioGroup row value={when} onChange={(e) => setWhen(e.target.value as "now" | "later")}>
              <FormControlLabel value="now" control={<Radio />} label={Locale.label("groups.sendNotificationDialog.sendNow", "Send now")} />
              <FormControlLabel value="later" control={<Radio />} label={Locale.label("groups.sendNotificationDialog.scheduleForLater", "Schedule for later")} />
            </RadioGroup>
          </FormControl>
        )}
        {when === "later" && (
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DateTimePicker
              label={Locale.label("groups.sendNotificationDialog.sendAt", "Send at")}
              value={sendAt}
              onChange={(v) => setSendAt(v)}
              disablePast
              disabled={sending}
              slotProps={{
                textField: {
                  fullWidth: true,
                  error: !!sendAt && !sendAtValid,
                  helperText: (!!sendAt && !sendAtValid ? Locale.label("groups.sendNotificationDialog.futureTime", "Pick a time in the future.") + " " : "")
                    + Locale.label("groups.sendNotificationDialog.timeZoneHelp", "Times are in {zone}.").replace("{zone}", zone),
                  inputProps: { "data-testid": "push-send-at" }
                }
              }}
            />
          </LocalizationProvider>
        )}
        <TextField
          fullWidth
          label={Locale.label("groups.sendNotificationDialog.titleLabel", "Title")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={sending}
          placeholder={Locale.label("groups.sendNotificationDialog.titlePlaceholder", "Reminder")}
          inputProps={{ maxLength: 80 }}
          helperText={`${titleCount} / 80`}
        />
        <TextField
          fullWidth
          multiline
          minRows={4}
          maxRows={8}
          label={Locale.label("groups.sendNotificationDialog.messageLabel", "Message")}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={sending}
          placeholder={Locale.label("groups.sendNotificationDialog.messagePlaceholder", "Compose your notification...")}
          inputProps={{ maxLength: 240 }}
          helperText={`${messageCount} / 240`}
        />
        <TextField
          fullWidth
          label={Locale.label("groups.sendNotificationDialog.linkLabel", "Open link or flyer URL")}
          value={link}
          onChange={(e) => setLink(e.target.value)}
          disabled={sending}
          placeholder="/mobile/groups or https://..."
          error={!linkValid}
          helperText={!linkValid ? Locale.label("groups.sendNotificationDialog.linkInvalid", "Use an https URL or a relative app path.") : " "}
        />
        <TextField
          fullWidth
          label={Locale.label("groups.sendNotificationDialog.imageUrlLabel", "Image URL")}
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          disabled={sending}
          placeholder="https://..."
          error={!imageUrlValid}
          helperText={!imageUrlValid ? Locale.label("groups.sendNotificationDialog.imageUrlInvalid", "Use an https URL or leave this blank.") : " "}
        />
        <Box sx={{ p: 2, border: 1, borderColor: "divider", borderRadius: "var(--b1-radius-panel)", bgcolor: "var(--b1-canvas)" }}>
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <NotificationsActiveIcon sx={{ color: "primary.main", mt: 0.25 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, wordBreak: "break-word" }}>
                {title.trim() || Locale.label("groups.sendNotificationDialog.previewTitle", "Notification title")}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {message.trim() || Locale.label("groups.sendNotificationDialog.previewMessage", "Notification message")}
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Stack>
    </SendDialogShell>
  );
};
