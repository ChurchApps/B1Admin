import { UserHelper } from "@churchapps/apphelper";
import { EnvironmentHelper } from "../helpers/EnvironmentHelper";

let activeSubDomain: string | null = null;

// Editors working on a secondary site must bust that site's tag, not the church's default.
export const setActiveSiteSubDomain = (subDomain: string | null) => { activeSubDomain = subDomain; };

export const clearSiteCache = (subDomain?: string) => {
  const sd = subDomain || activeSubDomain || UserHelper.currentUserChurch?.church?.subDomain;
  if (!sd) return;
  const b1Url = EnvironmentHelper.B1Url.replace("{subdomain}", sd);
  fetch(b1Url + "/api/revalidate/" + sd, { method: "POST" }).catch(() => { /* best-effort */ });
};
