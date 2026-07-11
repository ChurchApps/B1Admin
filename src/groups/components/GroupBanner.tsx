import { type GroupInterface, type GroupServiceTimeInterface } from "@churchapps/helpers";
import { UserHelper, Permissions, ApiHelper, Locale, PageHeader } from "@churchapps/apphelper";
import { Box, Chip } from "@mui/material";
import {
  Edit as EditIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationIcon,
  Group as GroupIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Event as CalendarIcon,
  Sms as SmsIcon,
  Email as EmailIcon,
  NotificationsActive as NotificationsActiveIcon,
  ContentCopy as ContentCopyIcon
} from "@mui/icons-material";
import React, { memo, useMemo, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { SendTextDialog } from "./SendTextDialog";
import { SendEmailDialog } from "./SendEmailDialog";
import { SendNotificationDialog } from "./SendNotificationDialog";
import { AppIconButton } from "../../components/ui/AppIconButton";
import { useConfirmDelete } from "../../hooks";

interface Props {
  group: GroupInterface;
  onEdit?: () => void;
  editMode?: boolean;
  tabs?: ReactNode;
}

const headerChipSx = { backgroundColor: "rgba(255,255,255,0.2)", color: "#fff", fontWeight: 600, fontSize: "0.8125rem" };

export const GroupBanner = memo((props: Props) => {
  const { group, onEdit, tabs } = props;
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

  const groupTypeChip = useMemo(() => {
    if (!group?.tags) return null;
    if (group.tags.indexOf("team") > -1) return <Chip label={Locale.label("groups.groupBanner.team")} size="small" sx={headerChipSx} />;
    if (group.categoryName) return <Chip label={group.categoryName} size="small" sx={headerChipSx} />;
    return null;
  }, [group?.tags, group?.categoryName]);

  const attendanceChips = useMemo(() => {
    if (!group || !isStandard) return [] as ReactNode[];
    const chipDefs: { key: string; value: boolean | undefined; label: string }[] = [
      { key: "track", value: group.trackAttendance, label: Locale.label("groups.groupBanner.trackAttendance") },
      { key: "nametag", value: group.printNametag, label: Locale.label("groups.groupBanner.printNametag") },
      { key: "pickup", value: group.parentPickup, label: Locale.label("groups.groupBanner.parentPickup") }
    ];
    return chipDefs
      .filter((c) => c.value !== undefined)
      .map((c) => (
        <Chip
          key={`attendance-${c.key}`}
          icon={c.value ? <CheckIcon sx={{ color: "success.light" }} /> : <CancelIcon sx={{ color: "error.light" }} />}
          label={c.label}
          size="small"
          sx={{ ...headerChipSx, fontWeight: 500 }}
        />
      ));
  }, [group, isStandard]);

  const labelChips = useMemo(() => {
    const validLabels = group?.labelArray?.filter((label) => label && typeof label === "string" && label.trim() !== "") || [];
    if (validLabels.length === 0) return [] as ReactNode[];
    const chips: ReactNode[] = validLabels.slice(0, 4).map((label, idx) => (
      <Chip key={`label-${label.trim()}-${idx}`} label={label.trim()} size="small" sx={{ ...headerChipSx, fontWeight: 400, fontSize: "0.75rem" }} />
    ));
    if (validLabels.length > 4) {
      chips.push(
        <Chip
          key="label-more"
          label={Locale.label("groups.groupBanner.moreLabels").replace("{count}", (validLabels.length - 4).toString())}
          size="small"
          sx={{ backgroundColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", fontSize: "0.75rem" }}
        />
      );
    }
    return chips;
  }, [group?.labelArray]);

  const serviceTimeChips = useMemo(() => (
    groupServiceTimes.filter((gst) => gst.serviceTime).map((gst, idx) => (
      <Chip
        key={`servicetime-${gst.serviceTime!.name}-${idx}`}
        icon={<CalendarIcon />}
        label={gst.serviceTime!.name}
        size="small"
        sx={{ ...headerChipSx, fontWeight: 400, "& .MuiChip-icon": { color: "#FFF" } }}
      />
    ))
  ), [groupServiceTimes]);

  const statistics = useMemo(() => {
    if (!group) return [];
    const stats: { icon: ReactNode; value: string; label: string }[] = [];
    if (isStandard && group.meetingTime) stats.push({ icon: <ScheduleIcon />, value: group.meetingTime, label: Locale.label("groups.groupBanner.meetingTime") });
    if (group.meetingLocation) stats.push({ icon: <LocationIcon />, value: group.meetingLocation, label: Locale.label("groups.groupBanner.location") });
    return stats;
  }, [group, isStandard]);

  if (!group) return null;

  const avatar = group.photoUrl ? (
    <Box sx={{ width: 56, height: 56, borderRadius: 2, overflow: "hidden", border: "2px solid #FFF" }}>
      <img src={group.photoUrl} alt={group.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </Box>
  ) : (
    <Box sx={{ width: 56, height: 56, borderRadius: 2, border: "2px solid #FFF", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.1)" }}>
      <GroupIcon sx={{ fontSize: 32, color: "rgba(255,255,255,0.7)" }} />
    </Box>
  );

  const chips = (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
      {groupTypeChip}
      {attendanceChips}
      {labelChips}
      {serviceTimeChips}
    </Box>
  );

  const subtitle = isStandard && group.about ? group.about.replace(/[#*_`]/g, "") : undefined;

  return (
    <PageHeader avatar={avatar} title={group.name || ""} subtitle={subtitle} chips={chips} statistics={statistics} tabs={tabs}>
      <AppIconButton label={Locale.label("groups.groupBanner.emailTooltip")} icon={<EmailIcon />} tone="header" onClick={() => setShowEmailDialog(true)} />
      {canSendNotifications && (
        <AppIconButton label="Send push notification" icon={<NotificationsActiveIcon />} tone="header" onClick={() => setShowNotificationDialog(true)} />
      )}
      {canText && hasTextingProvider && (
        <AppIconButton label={Locale.label("groups.groupBanner.textTooltip")} icon={<SmsIcon />} tone="header" onClick={() => setShowTextDialog(true)} />
      )}
      {canEdit && (
        <AppIconButton label={Locale.label("groups.groupBanner.duplicateTooltip")} icon={<ContentCopyIcon />} tone="header" onClick={handleDuplicate} data-testid="duplicate-group-button" />
      )}
      {canEdit && (
        <AppIconButton label={Locale.label("common.edit")} icon={<EditIcon />} tone="header" onClick={onEdit} data-testid="edit-group-button" />
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
    </PageHeader>
  );
});
