import { UserHelper, Permissions, Locale } from "@churchapps/apphelper";
import { Box } from "@mui/material";
import { FilesManager } from "./components";
import { PermissionDenied } from "../components";
import { Plate, h1Sx, ledeSx } from "./plated";

export const FilesPage = () => {
  if (!UserHelper.checkAccess(Permissions.contentApi.content.edit)) return <PermissionDenied permissions={[Permissions.contentApi.content.edit]} />;

  return (
    <Plate directory>
      <Box component="h1" sx={h1Sx}>{Locale.label("site.filesPage.title")}</Box>
      <Box sx={ledeSx}>{Locale.label("site.filesPage.subtitle")}</Box>
      {UserHelper.currentUserChurch && <FilesManager />}
    </Plate>
  );
};
