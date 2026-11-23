import { type PersonInterface } from "@churchapps/helpers";

export type ContactLine = { name?: string; value: string };

export interface DirectoryHousehold {
  key: string;
  sortName: string;
  letter: string;
  displayName: string;
  surname: string;
  address1?: string;
  address2?: string;
  cityStateZip?: string;
  phones: ContactLine[];
  emails: ContactLine[];
  members: PersonInterface[];
}

const roleOrder: Record<string, number> = { Head: 0, Spouse: 1, Child: 2 };
const birthTime = (d?: string | Date) => {
  const t = d ? new Date(d).getTime() : NaN;
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
};

// Head, Spouse, Child, everyone else; then oldest first; then name. Same order as the household card.
export const sortHouseholdMembers = (list: PersonInterface[]) => [...list].sort((a, b) => ((roleOrder[a.householdRole || ""] ?? 3) - (roleOrder[b.householdRole || ""] ?? 3))
  || (birthTime(a.birthDate) - birthTime(b.birthDate))
  || (a.name?.display || "").localeCompare(b.name?.display || ""));

export const firstName = (p: PersonInterface) => p.name?.nick || p.name?.first || p.name?.display || "";

// First name, plus the member's own surname when it is not the household's.
export const memberLabel = (p: PersonInterface, surname: string) => {
  const last = (p.name?.last || "").trim();
  return last && last.toLowerCase() !== surname.toLowerCase() ? `${firstName(p)} ${last}` : firstName(p);
};

// One line per distinct value in member order; a value more than one member has prints once without a name.
const contactLines = (members: PersonInterface[], values: (p: PersonInterface) => (string | undefined)[], keyOf: (v: string) => string): ContactLine[] => {
  const lines: { member: PersonInterface; value: string; key: string; shared: boolean }[] = [];
  members.forEach((m) => {
    values(m).forEach((raw) => {
      const value = (raw || "").trim();
      if (!value) return;
      const key = keyOf(value);
      const existing = lines.find((l) => l.key === key);
      if (!existing) lines.push({ member: m, value, key, shared: false });
      else if (existing.member !== m) existing.shared = true;
    });
  });
  return lines.map((l) => (members.length > 1 && !l.shared ? { name: firstName(l.member), value: l.value } : { value: l.value }));
};

const phoneKey = (v: string) => v.replace(/\D/g, "") || v;
const emailKey = (v: string) => v.toLowerCase();

export const buildHouseholds = (people: PersonInterface[], householdNameById: Map<string, string> = new Map()): DirectoryHousehold[] => {
  const groups = new Map<string, PersonInterface[]>();
  people.forEach((p) => {
    const key = p.householdId || `solo-${p.id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  });

  const households: DirectoryHousehold[] = [];
  groups.forEach((members, key) => {
    const sorted = sortHouseholdMembers(members);
    const storedName = (householdNameById.get(key) || "").trim();
    const surnameSource = storedName ? sorted[0] : (members.find((m) => m.householdRole === "Head") || sorted[0]);
    const primary = sorted[0];
    const lastName = storedName || (surnameSource.name?.last || surnameSource.name?.display?.split(" ").pop() || "").trim();

    let displayName: string;
    if (members.length === 1) {
      displayName = primary.name?.display || `${firstName(primary)} ${lastName}`.trim();
    } else if (members.length === 2 && lastName && sorted.every((m) => m.householdRole !== "Child")) {
      displayName = `${firstName(sorted[0])} & ${firstName(sorted[1])} ${lastName}`;
    } else if (lastName) {
      displayName = `The ${lastName} Family`;
    } else {
      displayName = primary.name?.display || "";
    }

    const addressSource = members.find((m) => m.contactInfo?.address1) || primary;
    const ci = addressSource.contactInfo || {};
    const cityStateZip = [ci.city, ci.state].filter(Boolean).join(", ") + (ci.zip ? ` ${ci.zip}` : "");

    const phones = contactLines(sorted, (m) => [m.contactInfo?.homePhone, m.contactInfo?.mobilePhone, m.contactInfo?.workPhone], phoneKey);
    const emails = contactLines(sorted, (m) => [m.contactInfo?.email], emailKey);

    const letter = (lastName[0] || displayName[0] || "#").toUpperCase();

    households.push({
      key,
      sortName: (lastName || displayName).toLowerCase(),
      letter,
      displayName,
      surname: lastName,
      address1: ci.address1,
      address2: ci.address2,
      cityStateZip: cityStateZip.trim() || undefined,
      phones,
      emails,
      members: sorted
    });
  });

  return households.sort((a, b) => a.sortName.localeCompare(b.sortName));
};
