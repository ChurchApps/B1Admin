import { UserHelper } from "@churchapps/apphelper";
import { EnvironmentHelper } from "./EnvironmentHelper";

// The event's public page on the church's B1 site. Guests register from it without an account.
export const getPublicEventUrl = (eventId: string): string => EnvironmentHelper.B1Url.replace("{subdomain}", UserHelper.currentUserChurch?.church?.subDomain || "") + "/events/" + eventId;
