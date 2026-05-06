import React, { memo } from "react";
import { UserHelper, Locale, Permissions } from "@churchapps/apphelper";
import { Box } from "@mui/material";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@churchapps/apphelper";
import { GivingDashboard } from "./GivingDashboard";
import { TabVisibilityBanner } from "../components/ui";

export const DonationsPage = memo(() => {
  const gateways = useQuery<any[]>({
    queryKey: ["/gateways", "GivingApi"],
    placeholderData: []
  });

  if (!UserHelper.checkAccess(Permissions.givingApi.donations.viewSummary)) return <></>;

  const hasGateway = (gateways.data || []).length > 0;

  return (
    <>
      <PageHeader title={Locale.label("donations.donationsPage.don")} subtitle={Locale.label("donations.donationsPage.subtitle")} />

      <TabVisibilityBanner linkType="donation" hasContent={hasGateway} />

      {/* Main Content */}
      <Box sx={{ p: 3 }}>
        <GivingDashboard />
      </Box>
    </>
  );
});
