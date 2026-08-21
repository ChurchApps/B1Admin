import { type PersonInterface } from "@churchapps/helpers";

export interface DirectoryHousehold {
  key: string;
  sortName: string;
  letter: string;
  displayName: string;
  address1?: string;
  address2?: string;
  cityStateZip?: string;
  phone?: string;
  email?: string;
  members: PersonInterface[];
}

const ageFrom = (birthDate?: string): number => {
  if (!birthDate) return -1;
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return -1;
  const ms = Date.now() - d.getTime();
  return ms / (365.25 * 24 * 60 * 60 * 1000);
};

export const firstName = (p: PersonInterface) => p.name?.nick || p.name?.first || p.name?.display || "";

export const buildHouseholds = (people: PersonInterface[], householdNameById: Map<string, string> = new Map()): DirectoryHousehold[] => {
  const groups = new Map<string, PersonInterface[]>();
  people.forEach((p) => {
    const key = p.householdId || `solo-${p.id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  });

  const households: DirectoryHousehold[] = [];
  groups.forEach((members, key) => {
    const sorted = [...members].sort((a, b) => ageFrom(b.birthDate) - ageFrom(a.birthDate));
    const storedName = (householdNameById.get(key) || "").trim();
    const surnameSource = storedName ? sorted[0] : (members.find((m) => m.householdRole === "Head") || sorted[0]);
    const primary = sorted[0];
    const lastName = storedName || (surnameSource.name?.last || surnameSource.name?.display?.split(" ").pop() || "").trim();

    let displayName: string;
    if (members.length === 1) {
      displayName = primary.name?.display || `${firstName(primary)} ${lastName}`.trim();
    } else if (members.length === 2 && lastName) {
      displayName = `${firstName(sorted[0])} & ${firstName(sorted[1])} ${lastName}`;
    } else if (lastName) {
      displayName = `The ${lastName} Family`;
    } else {
      displayName = primary.name?.display || "";
    }

    const addressSource = members.find((m) => m.contactInfo?.address1) || primary;
    const ci = addressSource.contactInfo || {};
    const cityStateZip = [ci.city, ci.state].filter(Boolean).join(", ") + (ci.zip ? ` ${ci.zip}` : "");

    const phoneSource = members.find((m) => m.contactInfo?.homePhone || m.contactInfo?.mobilePhone);
    const phone = phoneSource?.contactInfo?.homePhone || phoneSource?.contactInfo?.mobilePhone;
    const emailSource = members.find((m) => m.contactInfo?.email);

    const letter = (lastName[0] || displayName[0] || "#").toUpperCase();

    households.push({
      key,
      sortName: (lastName || displayName).toLowerCase(),
      letter,
      displayName,
      address1: ci.address1,
      address2: ci.address2,
      cityStateZip: cityStateZip.trim() || undefined,
      phone,
      email: emailSource?.contactInfo?.email,
      members: sorted
    });
  });

  return households.sort((a, b) => a.sortName.localeCompare(b.sortName));
};
