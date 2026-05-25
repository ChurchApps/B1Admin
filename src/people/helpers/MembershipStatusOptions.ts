import { Locale } from "@churchapps/apphelper";

interface MembershipStatusDefinition {
  value: string;
  labelKey: string;
}

export interface MembershipStatusOption {
  value: string;
  label: string;
}

export const membershipStatusDefinitions: MembershipStatusDefinition[] = [
  { value: "Visitor", labelKey: "person.visitor" },
  { value: "Regular Attendee", labelKey: "person.regularAttendee" },
  { value: "Member", labelKey: "person.member" },
  { value: "Staff", labelKey: "person.staff" },
  { value: "Inactive", labelKey: "person.inactive" },
  { value: "Deceased", labelKey: "person.deceased" },
  { value: "Former Member", labelKey: "person.formerMember" }
];

export const getMembershipStatusOptions = (): MembershipStatusOption[] =>
  membershipStatusDefinitions.map((status) => ({
    value: status.value,
    label: Locale.label(status.labelKey)
  }));

export const getLocalizedMembershipStatusOptions = (): MembershipStatusOption[] =>
  membershipStatusDefinitions.map((status) => {
    const label = Locale.label(status.labelKey);
    return { value: label, label };
  });
