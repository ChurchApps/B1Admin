import React from "react";
import { UserHelper, Permissions, Locale, PageHeader } from "@churchapps/apphelper";
import { Box } from "@mui/material";
import { PermissionDenied } from "../components";
import { CampusesSection } from "./components/CampusesSection";

export const CampusesPage: React.FC = () => {
  const hasAccess = UserHelper.checkAccess(Permissions.membershipApi.settings.edit);

  if (!hasAccess) return <PermissionDenied permissions={[Permissions.membershipApi.settings.edit]} />;

  return (
    <>
      <PageHeader title={Locale.label("settings.campuses.campuses")} subtitle={Locale.label("settings.campuses.subtitle")} />
      <Box sx={{ p: 3 }}>
        <CampusesSection />
      </Box>
    </>
  );
};
