import React from "react";
import { Box } from "@mui/material";
import { UserHelper, Permissions, PageHeader, Locale } from "@churchapps/apphelper";
import { FilesManager } from "./components";
import { PermissionDenied } from "../components";

export const FilesPage = () => {
  if (!UserHelper.checkAccess(Permissions.contentApi.content.edit)) return <PermissionDenied permissions={[Permissions.contentApi.content.edit]} />;

  return (
    <>
      <PageHeader
        title={Locale.label("site.filesPage.title")}
        subtitle={Locale.label("site.filesPage.subtitle")}
      />
      <Box sx={{ p: 3 }}>
        {UserHelper.currentUserChurch && <FilesManager />}
      </Box>
    </>
  );
};
