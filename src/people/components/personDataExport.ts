import { ApiHelper } from "@churchapps/apphelper";

export const downloadPersonData = async (personId: string) => {
  const data = await ApiHelper.get("/gdpr/people/" + personId + "/export", "MembershipApi");
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `person-data-${personId}.json`;
  a.click();
  URL.revokeObjectURL(url);
};
