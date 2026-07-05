import React from "react";
import { Box } from "@mui/material";
import { Locale, PageHeader, Permissions } from "@churchapps/apphelper";
import { Palette as PaletteIcon } from "@mui/icons-material";
import { AppThemeEdit } from "../settings/components/AppThemeEdit";
import { useRequirePermission } from "../hooks";

export const AppThemePage: React.FC = () => {
  const denied = useRequirePermission(Permissions.membershipApi.settings.edit);
  if (denied) return denied;

  return (
    <>
      <PageHeader icon={<PaletteIcon />} title={Locale.label("mobile.appThemePage.title")} subtitle={Locale.label("mobile.appThemePage.subtitle")} />
      <Box sx={{ p: 3 }}>
        <AppThemeEdit />
      </Box>
    </>
  );
};
