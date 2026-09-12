import React from "react";
import { type PersonInterface } from "@churchapps/helpers";
import { ApiHelper, DateHelper, Locale, Permissions, PersonHelper, UserHelper } from "@churchapps/apphelper";
import { Household } from "./Household";
import { PickupPeople } from "./PickupPeople";
import { formattedPhoneNumber } from "./PersonEdit";
import { personInitial, personPhotoUrl } from "../photo";
import { type PersonFieldInterface } from "../../helpers/Interfaces";
import { formatFieldValue } from "../../helpers/PersonFieldHelper";
import { SendTextDialog } from "../../groups/components/SendTextDialog";
import { AddToWorkflowDialog } from "./AddToWorkflowDialog";
import { downloadPersonData } from "./personDataExport";

interface Props {
  person: PersonInterface;
  userEmail?: string;
  campusName?: string;
  customFields: PersonFieldInterface[];
  customValues: Record<string, string>;
  onEdit: () => void;
  onMerge: () => void;
  onPhoto: () => void;
}

export const PersonIdentity = (props: Props) => {
  const { person } = props;
  const [showTextDialog, setShowTextDialog] = React.useState(false);
  const [showWorkflowDialog, setShowWorkflowDialog] = React.useState(false);
  const [hasTextingProvider, setHasTextingProvider] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const canText = UserHelper.checkAccess(Permissions.messagingApi.texting.send);
  const canEdit = UserHelper.checkAccess(Permissions.membershipApi.people.edit);

  React.useEffect(() => {
    if (canText) {
      ApiHelper.get("/texting/providers", "MessagingApi").then((data: any[]) => setHasTextingProvider(data?.length > 0)).catch(() => setHasTextingProvider(false));
    }
  }, [canText]);

  const photo = personPhotoUrl(person);
  const first = person.membershipStatus === "Visitor";
  const age = person.birthDate ? PersonHelper.getAge(new Date(person.birthDate)) : "";
  const marital = person.maritalStatus && person.maritalStatus !== "Single"
    ? (person.anniversary ? `${person.maritalStatus} · ${DateHelper.getShortDate(DateHelper.toDate(person.anniversary))}` : person.maritalStatus)
    : person.maritalStatus;
  const facts = [age, person.gender && person.gender !== "Unspecified" ? person.gender : "", marital, props.campusName].filter(Boolean).join(" · ");
  const mobile = person.contactInfo?.mobilePhone;
  const home = person.contactInfo?.homePhone;
  const work = person.contactInfo?.workPhone;
  const otherPhones = [home && `Home ${formattedPhoneNumber(home)}`, work && `Work ${formattedPhoneNumber(work)}`].filter(Boolean).join(" · ");
  const address = [person.contactInfo?.address1, person.contactInfo?.address2, [person.contactInfo?.city, person.contactInfo?.state, person.contactInfo?.zip].filter(Boolean).join(", ")].filter(Boolean);
  const extra = props.customFields
    .map((f) => ({ f, text: formatFieldValue(f, props.customValues[f.id || ""]) }))
    .filter((x) => x.text);

  return (
    <>
      <div className="id-row">
        {photo
          ? <img className="photo" src={photo} alt={person.name?.display || ""} onClick={() => canEdit && props.onPhoto()} />
          : <div className="ini-lg" onClick={() => canEdit && props.onPhoto()}>{personInitial(person)}</div>}
        <div>
          <h1 id="page-header-title">{person.name?.display}</h1>
          {facts && <p className="facts">{facts}</p>}
        </div>
      </div>
      <div className="chips">
        {person.membershipStatus && <span className={`chip ${first ? "first" : "on"}`}>{person.membershipStatus}</span>}
        {props.userEmail && <span className="chip">{Locale.label("people.personBanner.hasLogin")}</span>}
        {person.optedOut && <span className="chip">No direct mail</span>}
        {person.nametagNotes && <span className="chip">{person.nametagNotes}</span>}
      </div>
      <Household person={person} reload={person?.photoUpdated} />
      {mobile && <a className="phone" href={"tel:" + mobile.replace(/\D/g, "")}>{formattedPhoneNumber(mobile)}</a>}
      {otherPhones && <p className="phones">{otherPhones}</p>}
      {person.contactInfo?.email && <a className="email" href={"mailto:" + person.contactInfo.email}>{person.contactInfo.email}</a>}
      {address.length > 0 && <p className="addr">{address.map((l, i) => <React.Fragment key={i}>{l}{i < address.length - 1 && <br />}</React.Fragment>)}</p>}
      {person.donorNumber && <p className="muted" style={{ marginTop: 8 }}>Donor {person.donorNumber}</p>}
      {extra.map((x) => (
        <div className="dl" key={x.f.id}><dt>{x.f.name}</dt><dd>{x.text}</dd></div>
      ))}
      <div className="verbs">
        {person.contactInfo?.email && <a href={"mailto:" + person.contactInfo.email}>Email</a>}
        {mobile && canText && hasTextingProvider && <button type="button" onClick={() => setShowTextDialog(true)}>Text</button>}
        {canEdit && <button type="button" data-testid="add-to-workflow-button" onClick={() => setShowWorkflowDialog(true)}>Workflow</button>}
        {canEdit && <button type="button" data-testid="edit-person-button" onClick={props.onEdit}>{Locale.label("common.edit")}</button>}
        {canEdit && <button type="button" onClick={props.onMerge}>{Locale.label("people.personEdit.merge")}</button>}
        {canEdit && (
          <button
            type="button"
            data-testid="export-person-data-button"
            disabled={exporting}
            onClick={async () => {
              setExporting(true);
              try { if (person.id) await downloadPersonData(person.id); } finally { setExporting(false); }
            }}>
            Export
          </button>
        )}
      </div>
      <PickupPeople person={person} />
      {showTextDialog && mobile && (
        <SendTextDialog personId={person.id} personName={person.name?.display} phoneNumber={mobile} onClose={() => setShowTextDialog(false)} />
      )}
      {showWorkflowDialog && person.id && (
        <AddToWorkflowDialog person={person} onClose={() => setShowWorkflowDialog(false)} />
      )}
    </>
  );
};
