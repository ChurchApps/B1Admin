import React, { useMemo } from "react";
import { type HouseholdInterface, type PersonInterface } from "@churchapps/helpers";
import { ApiHelper, DateHelper, Locale, Permissions, PersonAvatar, PersonHelper, UserHelper } from "@churchapps/apphelper";
import { Box, ButtonBase, Icon, Link, Stack, Typography } from "@mui/material";
import { WarningAmber as WarningIcon } from "@mui/icons-material";
import { SendTextDialog } from "../../groups/components/SendTextDialog";
import { type PersonFieldInterface, type PersonFieldValueInterface } from "../../helpers/Interfaces";
import { formatFieldValue } from "../../helpers/PersonFieldHelper";
import { useCampuses } from "../../hooks/useCampuses";
import { AddToWorkflowDialog } from "./AddToWorkflowDialog";
import CopyableText from "./CopyTextContainer";
import { Household } from "./Household";
import { PickupPeople } from "./PickupPeople";
import { formattedPhoneNumber } from "./PersonEdit";
import { downloadPersonData } from "./personDataExport";
import { Pill, TextAction, VerbRow, srOnlySx } from "../../components/ui";

interface Props {
  person: PersonInterface;
  household: HouseholdInterface | null;
  householdMembers: PersonInterface[] | null;
  view: string;
  onEdit: () => void;
  onEditHousehold: () => void;
  onMerge: () => void;
  onExport: () => void;
  onPhoto: () => void;
}

const memberTone = (status?: string) => (["member", "active", "staff"].includes((status || "").toLowerCase()) ? "primary" : "neutral");

export const PersonIdentity: React.FC<Props> = (props) => {
  const { person } = props;
  const [userEmail, setUserEmail] = React.useState("");
  const [customFields, setCustomFields] = React.useState<PersonFieldInterface[]>([]);
  const [customValues, setCustomValues] = React.useState<Record<string, string>>({});
  const [hasTextingProvider, setHasTextingProvider] = React.useState(false);
  const [showTextDialog, setShowTextDialog] = React.useState(false);
  const [showWorkflowDialog, setShowWorkflowDialog] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const campuses = useCampuses();

  const canEdit = useMemo(() => UserHelper.checkAccess(Permissions.membershipApi.people.edit), []);
  const canText = useMemo(() => UserHelper.checkAccess(Permissions.messagingApi.texting.send), []);
  const formPermission = useMemo(() => UserHelper.checkAccess(Permissions.membershipApi.forms.admin) || UserHelper.checkAccess(Permissions.membershipApi.forms.edit), []);

  React.useEffect(() => {
    if (!person.id) return;
    ApiHelper.get("/userchurch/personid/" + person.id, "MembershipApi")
      .then((data: { email: string } | null) => setUserEmail(data?.email || ""))
      .catch(() => setUserEmail(""));
    ApiHelper.get(`/personfieldvalues/person/${person.id}`, "MembershipApi")
      .then((data: PersonFieldValueInterface[]) => {
        const map: Record<string, string> = {};
        (data || []).forEach((v) => { if (v.fieldId) map[v.fieldId] = v.value || ""; });
        setCustomValues(map);
      })
      .catch(() => setCustomValues({}));
  }, [person]);

  React.useEffect(() => {
    ApiHelper.get("/personfields", "MembershipApi")
      .then((data: PersonFieldInterface[]) => setCustomFields(data || []))
      .catch(() => setCustomFields([]));
  }, []);

  React.useEffect(() => {
    if (!canText) return;
    ApiHelper.get("/texting/providers", "MessagingApi")
      .then((data: unknown[]) => setHasTextingProvider(data?.length > 0))
      .catch(() => setHasTextingProvider(false));
  }, [canText]);

  const facts = useMemo(() => {
    const list: string[] = [];
    if (person.birthDate) list.push(`${PersonHelper.getAge(new Date(person.birthDate))}`);
    if (person.gender && person.gender !== "Unspecified") list.push(person.gender);
    if (person.maritalStatus) {
      list.push(person.anniversary ? `${person.maritalStatus} (${DateHelper.getShortDate(DateHelper.toDate(person.anniversary))})` : person.maritalStatus);
    }
    const campus = person.campusId ? campuses.find((c) => c.id === person.campusId)?.name : "";
    if (campus) list.push(campus);
    return list.join(" · ");
  }, [person, campuses]);

  const extraFields = useMemo(
    () => customFields.map((f) => ({ f, text: formatFieldValue(f, customValues[f.id || ""]) })).filter((x) => x.text),
    [customFields, customValues]
  );

  const contact = person.contactInfo ?? ({} as NonNullable<PersonInterface["contactInfo"]>);
  const phones = [
    { key: "mobile", label: Locale.label("people.personView.mobile"), value: contact.mobilePhone },
    { key: "home", label: Locale.label("people.personView.home"), value: contact.homePhone },
    { key: "work", label: Locale.label("people.personView.work"), value: contact.workPhone }
  ].filter((p) => p.value);
  const addressLines = [contact.address1, contact.address2, [contact.city, contact.state].filter(Boolean).join(", ") + (contact.zip ? " " + contact.zip : "")]
    .map((l) => (l || "").trim())
    .filter(Boolean);

  const canSendText = !!contact.mobilePhone && canText && hasTextingProvider;
  const editing = props.view === "edit";

  const handleExportData = async () => {
    if (!person.id) return;
    setExporting(true);
    try {
      await downloadPersonData(person.id);
    } finally {
      setExporting(false);
    }
  };

  const faceFill = person.householdRole === "Child"
    ? { bgcolor: "var(--b1-accent)", color: "var(--b1-on-accent)" }
    : { bgcolor: "var(--b1-avatar)", color: "var(--b1-on-avatar)" };
  const avatar = <PersonAvatar person={person} sx={{ width: 88, height: 88, fontSize: 30, fontWeight: 700, borderRadius: "var(--b1-radius-avatar)", ...faceFill }} />;
  const quiet = { typography: "body2", color: "text.secondary", overflowWrap: "anywhere" } as const;
  const strong = { color: "text.primary" } as const;

  return (
    <Box component="aside" data-testid="person-identity" sx={{ minWidth: 0 }}>
      {canEdit
        ? (
          <ButtonBase onClick={props.onPhoto} aria-label={Locale.label("common.changePhoto")} sx={{ borderRadius: "var(--b1-radius-panel)", "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 } }}>
            {avatar}
          </ButtonBase>
        )
        : avatar}
      <Typography id="page-header-title" variant="h1" component="h1" sx={{ mt: 2, overflowWrap: "anywhere" }}>{person.name?.display}</Typography>
      {facts && <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>{facts}</Typography>}

      {(person.membershipStatus || userEmail || person.nametagNotes || person.optedOut) && (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
          {person.membershipStatus && <Pill tone={memberTone(person.membershipStatus)}>{person.membershipStatus}</Pill>}
          {person.nametagNotes && (
            <Pill tone="warning" data-testid="person-caution">
              <WarningIcon aria-hidden sx={{ fontSize: 16 }} />
              <Box component="span" sx={srOnlySx}>{Locale.label("people.personEdit.nameNote")}: </Box>
              {person.nametagNotes}
            </Pill>
          )}
          {userEmail && <Pill>{Locale.label("people.personBanner.hasLogin")}</Pill>}
          {person.optedOut && <Pill>{Locale.label("people.personRecord.noDirectory", "Hidden from directory")}</Pill>}
        </Stack>
      )}

      {(contact.email || phones.length > 0 || addressLines.length > 0 || userEmail || person.donorNumber || extraFields.length > 0) && (
        <Stack spacing={1} sx={{ mt: 2 }} data-testid="person-contact">
          {contact.mobilePhone && (
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Icon aria-hidden sx={{ fontSize: 18, color: "var(--b1-link)" }}>smartphone</Icon>
              <Link href={"tel:" + contact.mobilePhone.replace(/[^0-9+]/g, "")} underline="hover" sx={{ typography: "h3", fontWeight: 500, color: "var(--b1-link)", width: "fit-content" }} aria-label={`${Locale.label("people.personView.mobile")} ${formattedPhoneNumber(contact.mobilePhone)}`}>
                {formattedPhoneNumber(contact.mobilePhone)}
              </Link>
            </Stack>
          )}
          {phones.filter((p) => p.key !== "mobile").map((p) => (
            <Stack key={p.key} direction="row" spacing={1.25} alignItems="flex-start">
              <Icon aria-hidden sx={{ fontSize: 18, color: "var(--b1-link)", mt: "2px" }}>{p.key === "home" ? "home" : "call"}</Icon>
              <Typography sx={quiet}>
                {p.label} <CopyableText text={p.value || ""}><Box component="span" sx={{ color: "var(--b1-link)" }}>{formattedPhoneNumber(p.value || "")}</Box></CopyableText>
              </Typography>
            </Stack>
          ))}
          {contact.email && (
            <Stack direction="row" spacing={1.25} alignItems="flex-start">
              <Icon aria-hidden sx={{ fontSize: 18, color: "var(--b1-link)", mt: "2px" }}>email</Icon>
              <Typography sx={quiet}><Link href={"mailto:" + contact.email} sx={{ color: "var(--b1-link)" }}>{contact.email}</Link></Typography>
            </Stack>
          )}
          {addressLines.length > 0 && (
            <Stack direction="row" spacing={1.25} alignItems="flex-start">
              <Icon aria-hidden sx={{ fontSize: 18, color: "var(--b1-link)", mt: "2px" }}>place</Icon>
              <Typography sx={quiet}>
                <CopyableText text={addressLines.join(", ")}>
                  <Box component="span" sx={{ color: "var(--b1-link)" }}>{addressLines.map((l, i) => <React.Fragment key={i}>{l}{i < addressLines.length - 1 && <br />}</React.Fragment>)}</Box>
                </CopyableText>
              </Typography>
            </Stack>
          )}
          {person.donorNumber && <Typography sx={quiet}>{Locale.label("people.personEdit.donorNumber")} <Box component="span" sx={strong}>{person.donorNumber}</Box></Typography>}
          {userEmail && <Typography sx={quiet}>{Locale.label("people.personView.hasLoginLabel").replace("{email}", userEmail)}</Typography>}
          {extraFields.map((x) => (
            <Typography key={x.f.id || x.f.name} sx={quiet}>{x.f.name}: <Box component="span" sx={strong}>{x.text}</Box></Typography>
          ))}
        </Stack>
      )}

      <Box sx={{ mt: 3 }}>
        <Household person={person} household={props.household} members={props.householdMembers} editing={props.view === "household"} onEdit={props.onEditHousehold} />
      </Box>

      {!editing && (
        <VerbRow plain sx={{ mt: 3 }}>
          {canEdit && <TextAction onClick={props.onEdit} data-testid="edit-person-button">{Locale.label("common.edit")}</TextAction>}
          {contact.email && <TextAction href={"mailto:" + contact.email} aria-label={Locale.label("people.personBanner.emailPerson")}>{Locale.label("people.personRecord.email", "Email")}</TextAction>}
          {canEdit && <TextAction onClick={() => setShowWorkflowDialog(true)} data-testid="add-to-workflow-button">{Locale.label("people.personRecord.workflow", "Workflow")}</TextAction>}
          {canSendText && <TextAction onClick={() => setShowTextDialog(true)} aria-label={Locale.label("people.personBanner.sendTextMessage")}>{Locale.label("people.personRecord.text", "Text")}</TextAction>}
          {canEdit && <TextAction onClick={props.onMerge} data-testid="person-merge-action">{Locale.label("people.personEdit.merge")}</TextAction>}
          {formPermission && <TextAction onClick={props.onExport}>{Locale.label("people.peoplePage.export")}</TextAction>}
          {canEdit && (
            <TextAction onClick={handleExportData} disabled={exporting} data-testid="export-person-data-button">
              {exporting ? Locale.label("people.gdprActions.exporting") : Locale.label("people.gdprActions.exportData")}
            </TextAction>
          )}
        </VerbRow>
      )}

      {!!person.householdId && (
        <Box sx={{ mt: 4 }}>
          <PickupPeople person={person} />
        </Box>
      )}

      {showTextDialog && contact.mobilePhone && (
        <SendTextDialog personId={person.id} personName={person.name?.display} phoneNumber={contact.mobilePhone} onClose={() => setShowTextDialog(false)} />
      )}
      {showWorkflowDialog && person.id && <AddToWorkflowDialog person={person} onClose={() => setShowWorkflowDialog(false)} />}
    </Box>
  );
};
