import { type GroupInterface, type GroupServiceTimeInterface } from "@churchapps/helpers";
import { UserHelper, Permissions, ApiHelper, Locale } from "@churchapps/apphelper";
import { Box, Chip, Stack, Typography } from "@mui/material";
import { Group as GroupIcon, CheckCircle as CheckIcon, Cancel as CancelIcon } from "@mui/icons-material";
import React, { memo, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { SendTextDialog } from "./SendTextDialog";
import { SendEmailDialog } from "./SendEmailDialog";
import { SendNotificationDialog } from "./SendNotificationDialog";
import { Pill, TextAction, VerbRow } from "../../components/ui";
import { useConfirmDelete } from "../../hooks";

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
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  const canEdit = useMemo(() => UserHelper.checkAccess(Permissions.membershipApi.groups.edit), []);
  const canSendNotifications = useMemo(() => UserHelper.checkAccess(Permissions.membershipApi.groupMembers.edit), []);
  const canText = useMemo(() => UserHelper.checkAccess(Permissions.messagingApi.texting.send), []);

  const handleDuplicate = async () => {
    if (!group) return;
    if (!(await confirm(Locale.label("groups.groupBanner.confirmDuplicate"), { destructive: false, confirmLabel: Locale.label("common.confirm", "Confirm") }))) return;
    const copy: GroupInterface = {
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
    // Cast until the published GroupInterface includes the chat feed toggles.
    (copy as Record<string, any>).discussionsEnabled = (group as Record<string, any>).discussionsEnabled !== false;
    (copy as Record<string, any>).announcementsEnabled = (group as Record<string, any>).announcementsEnabled !== false;
    [
      "confidential", "publicRoster", "minAgeMonths", "maxAgeMonths", "minGrade", "maxGrade", "capacity", "guestCapacity", "checkinClosed", "volunteerRatio", "minVolunteers"
    ].forEach((key) => {
      const value = (group as Record<string, any>)[key];
      if (value !== undefined) (copy as Record<string, any>)[key] = value;
    });
    ApiHelper.post("/groups", [copy], "MembershipApi").then((result: GroupInterface[]) => {
      if (result?.[0]?.id) navigate("/groups/" + result[0].id);
    });
  };

  React.useEffect(() => {
    if (canText) {
      ApiHelper.get("/texting/providers", "MessagingApi")
        .then((data: any[]) => setHasTextingProvider(data?.length > 0))
        .catch(() => setHasTextingProvider(false));
    }
  }, [canText]);

  React.useEffect(() => {
    if (group?.id) {
      ApiHelper.get("/groupservicetimes?groupId=" + group.id, "AttendanceApi")
        .then((data: any) => setGroupServiceTimes(data))
        .catch(() => setGroupServiceTimes([]));
    }
  }, [group?.id]);

  const isStandard = useMemo(() => (group?.tags?.indexOf("standard") ?? -1) > -1, [group?.tags]);
  const isTeam = (group?.tags?.indexOf("team") ?? -1) > -1;

  // Off states stay visible so staff can see a feed or check-in flag is turned off.
  const flags = useMemo(() => {
    if (!group || !isStandard) return [] as { key: string; value: boolean; label: string; testId?: string }[];
    const g = group as Record<string, any>;
    const list: { key: string; value: boolean | undefined; label: string; testId?: string }[] = [
      { key: "track", value: group.trackAttendance, label: Locale.label("groups.groupBanner.trackAttendance") },
      { key: "nametag", value: group.printNametag, label: Locale.label("groups.groupBanner.printNametag") },
      { key: "pickup", value: group.parentPickup, label: Locale.label("groups.groupBanner.parentPickup") },
      { key: "discussions", value: g.discussionsEnabled !== false, label: Locale.label("groups.groupBanner.discussions"), testId: "group-chat-discussions-chip" },
      { key: "announcements", value: g.announcementsEnabled !== false, label: Locale.label("groups.groupBanner.announcements"), testId: "group-chat-announcements-chip" }
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
        <VerbRow plain sx={{ mt: 3 }}>
          {canEdit && <TextAction onClick={onEdit} data-testid="edit-group-button">{Locale.label("common.edit")}</TextAction>}
          <TextAction onClick={() => setShowEmailDialog(true)} aria-label={Locale.label("groups.groupBanner.emailTooltip")} data-testid="email-group-button">
            {Locale.label("groups.groupBanner.email", "Email")}
          </TextAction>
          {canSendNotifications && (
            <TextAction onClick={() => setShowNotificationDialog(true)} aria-label={Locale.label("groups.groupBanner.notifyTooltip", "Send push notification")} data-testid="notify-group-button">
              {Locale.label("groups.groupBanner.notify", "Notify")}
            </TextAction>
          )}
          {canText && hasTextingProvider && (
            <TextAction onClick={() => setShowTextDialog(true)} aria-label={Locale.label("groups.groupBanner.textTooltip")} data-testid="text-group-button">
              {Locale.label("groups.groupBanner.text", "Text")}
            </TextAction>
          )}
          {canEdit && (
            <TextAction onClick={handleDuplicate} aria-label={Locale.label("groups.groupBanner.duplicateTooltip")} data-testid="duplicate-group-button">
              {Locale.label("groups.groupBanner.duplicate", "Duplicate")}
            </TextAction>
          )}
        </VerbRow>
      )}

      {ConfirmDialogElement}
      {showTextDialog && (
        <SendTextDialog groupId={group?.id} groupName={group?.name} onClose={() => setShowTextDialog(false)} />
      )}
      {showEmailDialog && (
        <SendEmailDialog groupId={group.id || ""} groupName={group.name || ""} onClose={() => setShowEmailDialog(false)} />
      )}
      {showNotificationDialog && (
        <SendNotificationDialog groupId={group.id || ""} groupName={group.name || ""} onClose={() => setShowNotificationDialog(false)} />
      )}
    </Box>
  );
});
