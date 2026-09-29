import { memo } from "react";
import { Locale, Permissions } from "@churchapps/apphelper";
import { PageHeader, PageContainer } from "../components/ui";
import { GivingDashboard } from "./GivingDashboard";
import { useRequirePermission } from "../hooks";

export const DonationsPage = memo(() => {
  const denied = useRequirePermission(Permissions.givingApi.donations.viewSummary);
  if (denied) return denied;

  return (
    <>
      <PageHeader title={Locale.label("donations.donationsPage.don")} subtitle={Locale.label("donations.donationsPage.subtitle")} />

      <PageContainer>
        <GivingDashboard />
      </PageContainer>
    </>
  );
});
