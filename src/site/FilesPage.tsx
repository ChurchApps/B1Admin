import { UserHelper, Permissions } from "@churchapps/apphelper";
import { FilesManager } from "./components";
import { PermissionDenied } from "../components";

export const FilesPage = () => {
  if (!UserHelper.checkAccess(Permissions.contentApi.content.edit)) return <PermissionDenied permissions={[Permissions.contentApi.content.edit]} />;
  if (!UserHelper.currentUserChurch) return null;
  return <FilesManager />;
};
