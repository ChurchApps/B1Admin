import React from "react";
import { Permissions, Locale, PageHeader } from "@churchapps/apphelper";
import { Box } from "@mui/material";
import { Church as ChurchIcon } from "@mui/icons-material";
import { CampusesSection } from "./components/CampusesSection";
import { useRequirePermission } from "../hooks";

export const CampusesPage: React.FC = () => {
  const denied = useRequirePermission(Permissions.membershipApi.settings.edit);
  if (denied) return denied;

  return (
    <>
      <PageHeader icon={<ChurchIcon />} title={Locale.label("settings.campuses.campuses")} subtitle={Locale.label("settings.campuses.subtitle")} />
      <Box sx={{ p: 3 }}>
        <CampusesSection />
      </Box>
    </>
  );
};
