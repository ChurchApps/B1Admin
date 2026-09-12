import { type PersonInterface } from "@churchapps/helpers";

const roleRank = (role?: string) => {
  switch ((role || "").toLowerCase()) {
    case "head": return 0;
    case "spouse": return 1;
    default: return 2;
  }
};

const birthTime = (birthDate?: string | Date) => {
  if (!birthDate) return Number.POSITIVE_INFINITY;
  const t = new Date(birthDate).getTime();
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
};

export const sortHouseholdMembers = (members: PersonInterface[]) =>
  [...members].sort((a, b) => {
    const rank = roleRank(a.householdRole) - roleRank(b.householdRole);
    if (rank !== 0) return rank;
    const byAge = birthTime(a.birthDate) - birthTime(b.birthDate);
    if (byAge !== 0) return byAge;
    return (a.name?.display || "").localeCompare(b.name?.display || "");
  });
