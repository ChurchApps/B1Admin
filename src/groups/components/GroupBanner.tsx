import { type GroupInterface, type GroupServiceTimeInterface } from "@churchapps/helpers";
import { UserHelper, Permissions, ApiHelper, Locale } from "@churchapps/apphelper";
import {
  Edit as EditIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Sms as SmsIcon,
  Email as EmailIcon,
  NotificationsActive as NotificationsActiveIcon,
  ContentCopy as ContentCopyIcon
} from "@mui/icons-material";
import React, { memo, useMemo } from "react";
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
}

export const GroupBanner = memo((props: Props) => {
  const { group, onEdit } = props;
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
    (copy as Record<string, any>).discussionsEnabled = (group as Record<string, any>).discussionsEnabled !== false;
    (copy as Record<string, any>).announcementsEnabled = (group as Record<string, any>).announcementsEnabled !== false;
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

  const flagChips = useMemo(() => {
    if (!group || !isStandard) return [] as { key: string; on: boolean; label: string; testId?: string }[];
    const g = group as Record<string, any>;
    return [
      { key: "track", on: !!group.trackAttendance, label: Locale.label("groups.groupBanner.trackAttendance") },
      { key: "nametag", on: !!group.printNametag, label: Locale.label("groups.groupBanner.printNametag") },
      { key: "pickup", on: !!group.parentPickup, label: Locale.label("groups.groupBanner.parentPickup") },
      { key: "discussions", on: g.discussionsEnabled !== false, label: Locale.label("groups.groupBanner.discussions"), testId: "group-chat-discussions-chip" },
      { key: "announcements", on: g.announcementsEnabled !== false, label: Locale.label("groups.groupBanner.announcements"), testId: "group-chat-announcements-chip" }
    ];
  }, [group, isStandard]);

  const labels = (group?.labelArray || []).filter((label) => label && label.trim() !== "");
  const initial = (group?.name || "?").trim().charAt(0).toUpperCase();

  if (!group) return null;

  const facts = [isStandard && group.categoryName, (group.tags?.indexOf("team") ?? -1) > -1 ? Locale.label("groups.groupBanner.team") : ""].filter(Boolean).join(" · ");

  return (
    <section className="og-who">
      <div className="og-id-row">
        {group.photoUrl ? (
          <img className="og-photo" src={group.photoUrl} alt={group.name} />
        ) : (
          <div className="og-ini">{initial}</div>
        )}
        <div>
          <h1 id="page-header-title">{group.name || ""}</h1>
          {facts && <p className="og-facts">{facts}</p>}
        </div>
      </div>

      {isStandard && group.meetingTime && <div className="og-meet">{group.meetingTime}</div>}
      {group.meetingLocation && <p className="og-addr">{group.meetingLocation}</p>}
      {isStandard && group.about && <p className="og-about">{group.about.replace(/[#*_`]/g, "")}</p>}

      <div className="og-chips">
        {flagChips.map((c) => (
          <span key={c.key} className="og-chip" data-testid={c.testId}>
            {c.on ? <CheckIcon color="success" sx={{ fontSize: 16 }} /> : <CancelIcon color="error" sx={{ fontSize: 16 }} />}
            <span>{c.label}</span>
          </span>
        ))}
        {labels.map((label, idx) => (
          <span key={`label-${label}-${idx}`} className="og-chip">{label}</span>
        ))}
        {groupServiceTimes.filter((gst) => gst.serviceTime).map((gst, idx) => (
          <span key={`st-${gst.serviceTime!.name}-${idx}`} className="og-chip">{gst.serviceTime!.name}</span>
        ))}
      </div>

      <div className="og-verbs">
        <AppIconButton label={Locale.label("groups.groupBanner.emailTooltip")} icon={<EmailIcon />} onClick={() => setShowEmailDialog(true)} />
        {canSendNotifications && (
          <AppIconButton label="Send push notification" icon={<NotificationsActiveIcon />} onClick={() => setShowNotificationDialog(true)} />
        )}
        {canText && hasTextingProvider && (
          <AppIconButton label={Locale.label("groups.groupBanner.textTooltip")} icon={<SmsIcon />} onClick={() => setShowTextDialog(true)} />
        )}
        {canEdit && (
          <AppIconButton label={Locale.label("groups.groupBanner.duplicateTooltip")} icon={<ContentCopyIcon />} onClick={handleDuplicate} data-testid="duplicate-group-button" />
        )}
        {canEdit && (
          <AppIconButton label={Locale.label("common.edit")} icon={<EditIcon />} onClick={onEdit} data-testid="edit-group-button" />
        )}
      </div>

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
    </section>
  );
});
