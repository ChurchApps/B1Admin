import { memo } from "react";
import { Locale, Permissions } from "@churchapps/apphelper";
import { Box } from "@mui/material";
import { VolunteerActivism as DonationIcon } from "@mui/icons-material";

import { PageHeader } from "@churchapps/apphelper";
import { GivingDashboard } from "./GivingDashboard";
import { useRequirePermission } from "../hooks";

export const DonationsPage = memo(() => {
  const denied = useRequirePermission(Permissions.givingApi.donations.viewSummary);
  if (denied) return denied;

  return (
    <>
      <PageHeader icon={<DonationIcon />} title={Locale.label("donations.donationsPage.don")} subtitle={Locale.label("donations.donationsPage.subtitle")} />

      <Box sx={{ p: 3 }}>
        <GivingDashboard />
      </Box>
    </>
  );
});
