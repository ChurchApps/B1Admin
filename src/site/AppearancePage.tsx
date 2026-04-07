import React from "react";
import { Box } from "@mui/material";
import { UserHelper, Permissions, PageHeader, Locale } from "@churchapps/apphelper";
import { StylesManager } from "./components";
import { PermissionDenied } from "../components";

export const AppearancePage = () => {
  if (!UserHelper.checkAccess(Permissions.contentApi.content.edit)) return <PermissionDenied permissions={[Permissions.contentApi.content.edit]} />;

  return (
    <>
      <PageHeader
        title={Locale.label("site.appearancePage.title")}
        subtitle={Locale.label("site.appearancePage.subtitle")}
      />
      <Box sx={{ p: 3 }}>
        {UserHelper.currentUserChurch && <StylesManager />}
      </Box>
    </>
  );
};
