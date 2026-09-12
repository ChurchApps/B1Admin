import { type GroupInterface, type GroupServiceTimeInterface } from "@churchapps/helpers";
import { UserHelper, Permissions, ApiHelper, Locale } from "@churchapps/apphelper";
import React, { memo, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { SendTextDialog } from "./SendTextDialog";
import { SendEmailDialog } from "./SendEmailDialog";
import { SendNotificationDialog } from "./SendNotificationDialog";
import { useConfirmDelete } from "../../hooks";

interface Props {
  group: GroupInterface;
  onEdit?: () => void;
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
    (copy as Record<string, unknown>).discussionsEnabled = (group as Record<string, unknown>).discussionsEnabled !== false;
    (copy as Record<string, unknown>).announcementsEnabled = (group as Record<string, unknown>).announcementsEnabled !== false;
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

  const flagChips = useMemo(() => {
    if (!group || !isStandard) return [] as { key: string; label: string; testId?: string }[];
    const g = group as Record<string, unknown>;
    const chips: { key: string; label: string; testId?: string }[] = [];
    if (group.trackAttendance) chips.push({ key: "track", label: Locale.label("groups.groupBanner.trackAttendance") });
    if (group.printNametag) chips.push({ key: "nametag", label: Locale.label("groups.groupBanner.printNametag") });
    if (group.parentPickup) chips.push({ key: "pickup", label: Locale.label("groups.groupBanner.parentPickup") });
    if (g.discussionsEnabled !== false) chips.push({ key: "discussions", label: Locale.label("groups.groupBanner.discussions"), testId: "group-chat-discussions-chip" });
    if (g.announcementsEnabled !== false) chips.push({ key: "announcements", label: Locale.label("groups.groupBanner.announcements"), testId: "group-chat-announcements-chip" });
    return chips;
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
          <span key={c.key} className="og-chip on" data-testid={c.testId}>{c.label}</span>
        ))}
        {labels.map((label, idx) => (
          <span key={`label-${label}-${idx}`} className="og-chip">{label}</span>
        ))}
        {groupServiceTimes.filter((gst) => gst.serviceTime).map((gst, idx) => (
          <span key={`st-${gst.serviceTime!.name}-${idx}`} className="og-chip">{gst.serviceTime!.name}</span>
        ))}
      </div>

      <div className="og-verbs">
        <button type="button" onClick={() => setShowEmailDialog(true)}>Email</button>
        {canSendNotifications && (
          <button type="button" onClick={() => setShowNotificationDialog(true)}>Notify</button>
        )}
        {canText && hasTextingProvider && (
          <button type="button" onClick={() => setShowTextDialog(true)}>Text</button>
        )}
        {canEdit && (
          <button type="button" onClick={handleDuplicate} data-testid="duplicate-group-button">Duplicate</button>
        )}
        {canEdit && (
          <button type="button" onClick={onEdit} data-testid="edit-group-button">{Locale.label("common.edit")}</button>
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
