import { type GroupInterface, type GroupServiceTimeInterface } from "@churchapps/helpers";
import { UserHelper, Permissions, ApiHelper, Locale } from "@churchapps/apphelper";
import { Box, Chip, Stack, Typography, Button } from "@mui/material";
import { Group as GroupIcon, CheckCircle as CheckIcon, Cancel as CancelIcon, ChatBubbleOutline as TextIcon, MailOutline as MailIcon } from "@mui/icons-material";
import React, { memo, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { SendTextDialog } from "./SendTextDialog";
import { SendEmailDialog } from "./SendEmailDialog";
import { SendNotificationDialog } from "./SendNotificationDialog";
import { Pill, TextAction, RecordActions } from "../../components/ui";
import { useConfirmDelete } from "../../hooks";
import { ShareLinkDialog } from "../../components/ShareLinkDialog";
import { getPublicGroupUrl, hasPublicGroupPage } from "../../helpers/GroupLinkHelper";

// publicRoster is not on the published GroupInterface yet.
type GroupWithRoster = GroupInterface & { publicRoster?: boolean };

interface Props {
  group: GroupInterface;
  onEdit?: () => void;
  editMode?: boolean;
}

const flagChipSx = { fontWeight: 500, bgcolor: "transparent" };

// Identity column of the group record: who the group is, when/where it meets, and its verbs.
export const GroupBanner = memo((props: Props) => {
  const { group, onEdit, editMode } = props;
  const navigate = useNavigate();
  const [groupServiceTimes, setGroupServiceTimes] = React.useState<GroupServiceTimeInterface[]>([]);
  const [showTextDialog, setShowTextDialog] = React.useState(false);
  const [showEmailDialog, setShowEmailDialog] = React.useState(false);
  const [showNotificationDialog, setShowNotificationDialog] = React.useState(false);
  const [hasTextingProvider, setHasTextingProvider] = React.useState(false);
  const [sharing, setSharing] = React.useState(false);
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  const canEdit = useMemo(() => UserHelper.checkAccess(Permissions.membershipApi.groups.edit), []);
  // Sending a group email or push notification requires groupMembers.edit on the Api.
  const canSendNotifications = useMemo(() => UserHelper.checkAccess(Permissions.membershipApi.groupMembers.edit), []);
  const canText = useMemo(() => UserHelper.checkAccess(Permissions.messagingApi.texting.send), []);

  const handleDuplicate = async () => {
    if (!group) return;
    if (!(await confirm(Locale.label("groups.groupBanner.confirmDuplicate"), { destructive: false, confirmLabel: Locale.label("common.confirm", "Confirm") }))) return;
    const copy: GroupWithRoster = {
      categoryName: group.categoryName,
      name: group.name + " " + Locale.label("groups.groupBanner.copySuffix"),
      trackAttendance: group.trackAttendance,
      attendanceReminders: group.attendanceReminders,
      parentPickup: group.parentPickup,
      printNametag: group.printNametag,
      about: group.about,
      photoUrl: group.photoUrl,
      tags: group.tags,
      meetingTime: group.meetingTime,
      meetingLocation: group.meetingLocation,
      labelArray: group.labelArray,
      campusId: group.campusId,
      joinPolicy: group.joinPolicy
    };
    copy.discussionsEnabled = group.discussionsEnabled !== false;
    copy.announcementsEnabled = group.announcementsEnabled !== false;
    const source: GroupWithRoster = group;
    const copyField = <K extends keyof GroupWithRoster>(key: K) => {
      const value = source[key];
      if (value !== undefined) copy[key] = value;
    };
    ([
      "confidential", "publicRoster", "minAgeMonths", "maxAgeMonths", "minGrade", "maxGrade", "capacity", "guestCapacity", "checkinClosed", "volunteerRatio", "minVolunteers"
    ] as const).forEach((key) => copyField(key));
    ApiHelper.post("/groups", [copy], "MembershipApi").then((result: GroupInterface[]) => {
      if (result?.[0]?.id) navigate("/groups/" + result[0].id);
    });
  };

  React.useEffect(() => {
    if (canText) {
      ApiHelper.get("/texting/providers", "MessagingApi")
        .then((data: unknown[]) => setHasTextingProvider(data?.length > 0))
        .catch(() => setHasTextingProvider(false));
    }
  }, [canText]);

  React.useEffect(() => {
    if (group?.id) {
      ApiHelper.get("/groupservicetimes?groupId=" + group.id, "AttendanceApi")
        .then((data: GroupServiceTimeInterface[]) => setGroupServiceTimes(data))
        .catch(() => setGroupServiceTimes([]));
    }
  }, [group?.id]);

  const isStandard = useMemo(() => (group?.tags?.indexOf("standard") ?? -1) > -1, [group?.tags]);
  const isTeam = (group?.tags?.indexOf("team") ?? -1) > -1;

  // Off states stay visible so staff can see a feed or check-in flag is turned off.
  const flags = useMemo(() => {
    if (!group || !isStandard) return [] as { key: string; value: boolean; label: string; testId?: string }[];
    const list: { key: string; value: boolean | undefined; label: string; testId?: string }[] = [
      { key: "track", value: group.trackAttendance, label: Locale.label("groups.groupBanner.trackAttendance") },
      { key: "nametag", value: group.printNametag, label: Locale.label("groups.groupBanner.printNametag") },
      { key: "pickup", value: group.parentPickup, label: Locale.label("groups.groupBanner.parentPickup") },
      { key: "discussions", value: group.discussionsEnabled !== false, label: Locale.label("groups.groupBanner.discussions"), testId: "group-chat-discussions-chip" },
      { key: "announcements", value: group.announcementsEnabled !== false, label: Locale.label("groups.groupBanner.announcements"), testId: "group-chat-announcements-chip" }
    ];
    return list.filter((f) => f.value !== undefined) as { key: string; value: boolean; label: string; testId?: string }[];
  }, [group, isStandard]);

  if (!group) return null;

  const labels = (group.labelArray || []).filter((label) => label && typeof label === "string" && label.trim() !== "");
  const serviceTimes = groupServiceTimes.filter((gst) => gst.serviceTime);
  const facts = [isTeam ? Locale.label("groups.groupBanner.team") : group.categoryName].filter(Boolean).join(" · ");
  const about = isStandard && group.about ? group.about.replace(/[#*_`]/g, "") : "";

  const avatar = group.photoUrl ? (
    <Box sx={{ width: 88, height: 88, borderRadius: "var(--b1-radius-panel)", overflow: "hidden", border: 1, borderColor: "divider" }}>
      <img src={group.photoUrl} alt={group.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </Box>
  ) : (
    <Box sx={{ width: 88, height: 88, borderRadius: "var(--b1-radius-panel)", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "var(--b1-selected)" }}>
      <GroupIcon sx={{ fontSize: 40, color: "var(--b1-on-selected)" }} />
    </Box>
  );

  return (
    <Box component="aside" data-testid="group-identity" sx={{ minWidth: 0 }}>
      {avatar}
      <Typography id="page-header-title" variant="h1" component="h1" sx={{ mt: 2, overflowWrap: "anywhere" }}>{group.name || ""}</Typography>
      {facts && <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>{facts}</Typography>}

      {((isStandard && group.meetingTime) || group.meetingLocation) && (
        <Stack spacing={0.5} sx={{ mt: 2 }}>
          {isStandard && group.meetingTime && (
            <Typography variant="h3" component="p" sx={{ fontWeight: 500 }} aria-label={Locale.label("groups.groupBanner.meetingTime") + " " + group.meetingTime}>{group.meetingTime}</Typography>
          )}
          {group.meetingLocation && (
            <Typography variant="body2" color="text.secondary" aria-label={Locale.label("groups.groupBanner.location") + " " + group.meetingLocation}>{group.meetingLocation}</Typography>
          )}
        </Stack>
      )}

      {about && <Typography variant="body2" color="text.secondary" sx={{ mt: 2, whiteSpace: "pre-line", overflowWrap: "anywhere" }}>{about}</Typography>}

      {flags.length > 0 && (
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 2 }}>
          {flags.map((f) => (
            <Chip
              key={f.key}
              icon={f.value ? <CheckIcon color="success" /> : <CancelIcon color="disabled" />}
              label={f.label}
              size="small"
              variant="outlined"
              sx={[flagChipSx, !f.value && { color: "text.secondary" }]}
              data-testid={f.testId}
            />
          ))}
        </Stack>
      )}

      {(labels.length > 0 || serviceTimes.length > 0) && (
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1.5 }}>
          {labels.map((label, idx) => <Pill key={`label-${label.trim()}-${idx}`}>{label.trim()}</Pill>)}
          {serviceTimes.map((gst, idx) => <Pill key={`st-${gst.serviceTime!.name}-${idx}`} tone="primary">{gst.serviceTime!.name}</Pill>)}
        </Stack>
      )}

      {!editMode && (
        <RecordActions
          buttons={<>
            {canEdit && <Button variant="contained" onClick={onEdit} data-testid="edit-group-button">{Locale.label("common.edit")}</Button>}
            {canSendNotifications && (
              <Button variant="outlined" startIcon={<MailIcon />} onClick={() => setShowEmailDialog(true)} aria-label={Locale.label("groups.groupBanner.emailTooltip")} data-testid="email-group-button">
                {Locale.label("groups.groupBanner.email", "Email")}
              </Button>
            )}
            {canText && hasTextingProvider && (
              <Button variant="outlined" startIcon={<TextIcon />} onClick={() => setShowTextDialog(true)} aria-label={Locale.label("groups.groupBanner.textTooltip")} data-testid="text-group-button">
                {Locale.label("groups.groupBanner.text", "Text")}
              </Button>
            )}
          </>}>
          {canSendNotifications && (
            <TextAction small onClick={() => setShowNotificationDialog(true)} aria-label={Locale.label("groups.groupBanner.notifyTooltip", "Send push notification")} data-testid="notify-group-button">
              {Locale.label("groups.groupBanner.notify", "Notify")}
            </TextAction>
          )}
          {hasPublicGroupPage(group) && (
            <TextAction small onClick={() => setSharing(true)} aria-label={Locale.label("groups.groupBanner.shareTooltip")} data-testid="share-group-button">
              {Locale.label("groups.groupBanner.share")}
            </TextAction>
          )}
          {canEdit && (
            <TextAction small onClick={handleDuplicate} aria-label={Locale.label("groups.groupBanner.duplicateTooltip")} data-testid="duplicate-group-button">
              {Locale.label("groups.groupBanner.duplicate", "Duplicate")}
            </TextAction>
          )}
        </RecordActions>
      )}

      {ConfirmDialogElement}
      {showTextDialog && (
        <SendTextDialog groupId={group?.id} groupName={group?.name} onClose={() => setShowTextDialog(false)} />
      )}
      {showEmailDialog && (
        <SendEmailDialog groupId={group.id || ""} groupName={group.name || ""} onClose={() => setShowEmailDialog(false)} />
      )}
      {sharing && (
        <ShareLinkDialog
          open={true}
          onClose={() => setSharing(false)}
          title={`${Locale.label("groups.groupBanner.share")}: ${group.name || ""}`}
          url={getPublicGroupUrl(group)}
          hint={Locale.label("groups.groupBanner.shareHint")}
          fileName={`group-qr-${(group.slug || group.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "group"}`}
          testIdPrefix="group-share"
        />
      )}
      {showNotificationDialog && (
        <SendNotificationDialog groupId={group.id || ""} groupName={group.name || ""} onClose={() => setShowNotificationDialog(false)} />
      )}
    </Box>
  );
});
