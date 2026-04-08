import React from "react";
import { Box } from "@mui/material";
import { Locale, PageHeader, UserHelper, Permissions } from "@churchapps/apphelper";
import { AppThemeEdit } from "../settings/components/AppThemeEdit";
import { PermissionDenied } from "../components";

export const AppThemePage: React.FC = () => {
  if (!UserHelper.checkAccess(Permissions.membershipApi.settings.edit)) return <PermissionDenied permissions={[Permissions.membershipApi.settings.edit]} />;

  return (
    <>
      <PageHeader title={Locale.label("mobile.appThemePage.title")} subtitle={Locale.label("mobile.appThemePage.subtitle")} />
      <Box sx={{ p: 3 }}>
        <AppThemeEdit />
      </Box>
    </>
  );
};
