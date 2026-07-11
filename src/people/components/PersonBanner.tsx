import { type PersonInterface } from "@churchapps/helpers";
import { PersonHelper, UserHelper, Permissions, DateHelper, PersonAvatar, ApiHelper, Locale, PageHeader } from "@churchapps/apphelper";
import { Chip } from "@mui/material";
import {
  Email as EmailIcon,
  Sms as SmsIcon,
  ViewKanban as WorkflowIcon,
  Cake as CakeIcon,
  Wc as WcIcon,
  Favorite as FavoriteIcon
} from "@mui/icons-material";
import { memo, useMemo, useState, useEffect, type ReactNode } from "react";
import { AppIconButton } from "../../components/ui/AppIconButton";
import { StatusChip } from "../../components";
import { SendTextDialog } from "../../groups/components/SendTextDialog";
import { AddToWorkflowDialog } from "./AddToWorkflowDialog";

interface Props {
  person: PersonInterface;
  togglePhotoEditor?: (show: boolean) => void;
  tabs?: ReactNode;
  breadcrumbs?: ReactNode;
}

export const PersonBanner = memo((props: Props) => {
  const { person, togglePhotoEditor, tabs, breadcrumbs } = props;

  const [userEmail, setUserEmail] = useState<string>("");
  const [showTextDialog, setShowTextDialog] = useState(false);
  const [showWorkflowDialog, setShowWorkflowDialog] = useState(false);
  const [hasTextingProvider, setHasTextingProvider] = useState(false);

  const canText = useMemo(() => UserHelper.checkAccess(Permissions.messagingApi.texting.send), []);
  const canEdit = useMemo(() => UserHelper.checkAccess(Permissions.membershipApi.people.edit), []);

  useEffect(() => {
    if (person?.id) {
      ApiHelper.get("/userchurch/personid/" + person.id, "MembershipApi")
        .then((data: { email: string } | null) => {
          setUserEmail(data?.email || "");
        })
        .catch(() => setUserEmail(""));
    }
  }, [person?.id]);

  useEffect(() => {
    if (canText) {
      ApiHelper.get("/texting/providers", "MessagingApi")
        .then((data: any[]) => setHasTextingProvider(data?.length > 0))
        .catch(() => setHasTextingProvider(false));
    }
  }, [canText]);

  const statistics = useMemo(() => {
    if (!person) return [];
    const stats: { icon: ReactNode; value: string; label: string }[] = [];

    if (person.birthDate) {
      const age = PersonHelper.getAge(new Date(person.birthDate));
      stats.push({ icon: <CakeIcon />, value: `${age}`, label: Locale.label("people.personBanner.age") });
    }
    if (person.gender && person.gender !== "Unspecified") {
      stats.push({ icon: <WcIcon />, value: person.gender, label: Locale.label("people.personBanner.gender") });
    }
    if (person.maritalStatus && person.maritalStatus !== "Single") {
      let value = person.maritalStatus;
      if (person.anniversary) value += ` (${DateHelper.getShortDate(DateHelper.toDate(person.anniversary))})`;
      stats.push({ icon: <FavoriteIcon />, value, label: Locale.label("people.personBanner.maritalStatus") });
    }
    return stats;
  }, [person]);

  const subtitle = useMemo(() => {
    if (!person?.contactInfo) return undefined;
    const parts: string[] = [];
    if (person.contactInfo.email) parts.push(person.contactInfo.email);
    const phone = person.contactInfo.mobilePhone || person.contactInfo.homePhone || person.contactInfo.workPhone;
    if (phone) parts.push(phone);
    if (person.contactInfo.address1) {
      const addressParts = [person.contactInfo.address1, person.contactInfo.address2, [person.contactInfo.city, person.contactInfo.state, person.contactInfo.zip].filter(Boolean).join(", ")].filter(Boolean);
      parts.push(addressParts.join(", "));
    }
    return parts.length > 0 ? parts.join("  •  ") : undefined;
  }, [person]);

  if (!person) return null;

  const avatar = (
    <div style={{ border: "3px solid #FFF", borderRadius: "50%" }}>
      <PersonAvatar person={person} size="medium" onClick={() => canEdit && togglePhotoEditor?.(true)} />
    </div>
  );

  const chips = (
    <>
      {person.membershipStatus && <StatusChip status={person.membershipStatus} variant="header" size="small" />}
      {userEmail && (
        <Chip label={Locale.label("people.personBanner.hasLogin")} size="small" title={userEmail} sx={{ backgroundColor: "rgba(255,255,255,0.2)", color: "#fff" }} />
      )}
    </>
  );

  const hasMobile = !!person.contactInfo?.mobilePhone;

  return (
    <PageHeader avatar={avatar} title={person?.name?.display || ""} subtitle={subtitle} chips={chips} statistics={statistics} tabs={tabs} breadcrumbs={breadcrumbs}>
      {person.contactInfo?.email && (
        <AppIconButton label={Locale.label("people.personBanner.emailPerson")} icon={<EmailIcon />} tone="header" onClick={() => (window.location.href = `mailto:${person.contactInfo?.email}`)} />
      )}
      {hasMobile && canText && hasTextingProvider && (
        <AppIconButton label={Locale.label("people.personBanner.sendTextMessage")} icon={<SmsIcon />} tone="header" onClick={() => setShowTextDialog(true)} />
      )}
      {canEdit && (
        <AppIconButton label={Locale.label("people.personBanner.addToWorkflow")} icon={<WorkflowIcon />} tone="header" data-testid="add-to-workflow-button" onClick={() => setShowWorkflowDialog(true)} />
      )}
      {showTextDialog && person?.contactInfo?.mobilePhone && (
        <SendTextDialog
          personId={person.id}
          personName={person.name?.display}
          phoneNumber={person.contactInfo.mobilePhone}
          onClose={() => setShowTextDialog(false)}
        />
      )}
      {showWorkflowDialog && person?.id && (
        <AddToWorkflowDialog person={person} onClose={() => setShowWorkflowDialog(false)} />
      )}
    </PageHeader>
  );
});
