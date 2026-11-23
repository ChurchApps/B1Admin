import { UserHelper } from "@churchapps/apphelper";
import { type GroupInterface } from "@churchapps/helpers";
import { EnvironmentHelper } from "./EnvironmentHelper";

const b1Base = (): string => EnvironmentHelper.B1Url.replace("{subdomain}", UserHelper.currentUserChurch?.church?.subDomain || "");

// The church's public groups page on its B1 site.
export const getPublicGroupsUrl = (): string => b1Base() + "/groups";

// The group's page on the church's B1 site. Visitors join or request to join from it.
export const getPublicGroupUrl = (group: GroupInterface): string => b1Base() + "/mobile/groups/" + (group.slug || group.id || "");

// Confidential and archived groups have no public page.
export const hasPublicGroupPage = (group: GroupInterface): boolean => !!group.id && !group.confidential && !group.archived && (group.tags?.indexOf("standard") ?? -1) > -1;
