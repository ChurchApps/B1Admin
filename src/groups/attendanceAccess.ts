import { Permissions, UserHelper } from "@churchapps/apphelper";

// Visit rows are readable by attendance.view and by a leader of that group.
// Plain members can list sessions, but visitsessions returns 401 for them.
export const canReadGroupAttendance = (groupId?: string) =>
  UserHelper.checkAccess(Permissions.attendanceApi.attendance.view)
  || (!!groupId && !!UserHelper.currentUserChurch?.groups?.some((g) => g.id === groupId && g.leader));
