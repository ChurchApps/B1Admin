import { Permissions, UserHelper } from "@churchapps/apphelper";

// The All groups list is for people who manage groups or people; leaders reach their own groups from My Groups.
export const hasAllGroupsAccess = (): boolean => UserHelper.checkAccess(Permissions.membershipApi.groups.edit) || UserHelper.checkAccess(Permissions.membershipApi.groupMembers.view) || UserHelper.checkAccess(Permissions.membershipApi.people.view);
