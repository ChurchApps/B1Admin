import React from "react";
import { Box } from "@mui/material";
import { Locale, PageHeader } from "@churchapps/apphelper";
import { AppThemeEdit } from "../settings/components/AppThemeEdit";

export const AppThemePage: React.FC = () => (
  <>
    <PageHeader title={Locale.label("mobile.appThemePage.title")} subtitle={Locale.label("mobile.appThemePage.subtitle")} />
    <Box sx={{ p: 3 }}>
      <AppThemeEdit />
    </Box>
  </>
);
