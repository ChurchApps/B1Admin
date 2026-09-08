import { memo } from "react";
import { Permissions } from "@churchapps/apphelper";
import { GivingDashboard } from "./GivingDashboard";
import { useRequirePermission } from "../hooks";

export const DonationsPage = memo(() => {
  const denied = useRequirePermission(Permissions.givingApi.donations.viewSummary);
  if (denied) return denied;

  return <GivingDashboard />;
});
