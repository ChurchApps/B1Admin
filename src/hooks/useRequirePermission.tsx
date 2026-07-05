import { UserHelper } from "@churchapps/apphelper";
import type { IApiPermission } from "@churchapps/helpers";
import { PermissionDenied } from "../components/PermissionDenied";

// Guards a component on one or more permissions, typing each permission only once.
// Returns a <PermissionDenied> element to return early, or null when access is granted:
//   const denied = useRequirePermission(Permissions.contentApi.content.edit);
//   if (denied) return denied;
export const useRequirePermission = (...permissions: IApiPermission[]): React.ReactElement | null => {
  const granted = permissions.every((p) => UserHelper.checkAccess(p));
  return granted ? null : <PermissionDenied permissions={permissions} />;
};
