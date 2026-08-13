import { UserHelper } from "@churchapps/apphelper";
import { EnvironmentHelper } from "../helpers/EnvironmentHelper";

export const clearSiteCache = (subDomain?: string) => {
  const sd = subDomain || UserHelper.currentUserChurch?.church?.subDomain;
  if (!sd) return;
  const b1Url = EnvironmentHelper.B1Url.replace("{subdomain}", sd);
  fetch(b1Url + "/api/revalidate/" + sd, { method: "POST" }).catch(() => { /* best-effort */ });
};
