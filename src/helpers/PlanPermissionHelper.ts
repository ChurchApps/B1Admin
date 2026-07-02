import { Permissions, UserHelper } from "@churchapps/apphelper";

// Plans/Edit moved from the MembershipApi bucket to DoingApi server-side; check both
// until the legacy MembershipApi grant is retired.
export const hasPlansEditAccess = (): boolean => UserHelper.checkAccess(Permissions.membershipApi.plans.edit) || UserHelper.checkAccess({ api: "DoingApi", contentType: "Plans", action: "Edit" });
