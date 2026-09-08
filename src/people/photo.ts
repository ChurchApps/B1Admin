import { type PersonInterface } from "@churchapps/helpers";
import { PersonHelper } from "@churchapps/apphelper";

export const personInitial = (person?: PersonInterface | null) => {
  const n = person?.name?.nick || person?.name?.first || person?.name?.display || "?";
  return n.trim().charAt(0).toUpperCase() || "?";
};

export const personPhotoUrl = (person?: PersonInterface | null) => {
  if (!person) return "";
  const url = PersonHelper.getPhotoUrl(person);
  if (!url || url === "/images/sample-profile.png") return "";
  return url;
};
