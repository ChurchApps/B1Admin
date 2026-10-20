import { useQuery } from "@tanstack/react-query";
import { Permissions, UserHelper } from "@churchapps/apphelper";
import { type GroupMemberInterface } from "@churchapps/helpers";

// Recording attendance (view or edit) is enough to need the class list. Names-only
// users without it stay on My Groups (ChurchAppsSupport#1284).
export const canRecordAttendance = (): boolean => UserHelper.checkAccess(Permissions.attendanceApi.attendance.view) || UserHelper.checkAccess(Permissions.attendanceApi.attendance.edit);

// The All groups list is for people who manage groups or people, and for attendance takers
// whose only people permission is View Names. Leaders reach their own groups from My Groups.
export const hasAllGroupsAccess = (): boolean =>
  UserHelper.checkAccess(Permissions.membershipApi.groups.edit)
  || UserHelper.checkAccess(Permissions.membershipApi.groupMembers.view)
  || UserHelper.checkAccess(Permissions.membershipApi.people.view)
  || (UserHelper.checkAccess(Permissions.membershipApi.people.viewNames) && canRecordAttendance());

// Confidential groups stay with staff. Attendance takers see the public class list.
export const canSeeConfidentialGroups = (): boolean =>
  UserHelper.checkAccess(Permissions.membershipApi.groupMembers.view)
  || UserHelper.checkAccess(Permissions.membershipApi.groups.edit)
  || UserHelper.checkAccess(Permissions.membershipApi.people.view);

export const leadsGroup = (members: GroupMemberInterface[] | undefined): boolean => !!members?.some((m) => m.leader && m.personId === UserHelper.person?.id);

// Printing a group roster needs Group Members / View, or leading that group.
export const useCanPrintRoster = (groupId?: string): boolean => {
  const canView = UserHelper.checkAccess(Permissions.membershipApi.groupMembers.view);
  const members = useQuery<GroupMemberInterface[]>({ queryKey: [`/groupmembers?groupId=${groupId}`, "MembershipApi"], enabled: !!groupId && !canView });
  return canView || leadsGroup(members.data);
};
