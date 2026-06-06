import React from "react";
import { type ChurchInterface } from "@churchapps/helpers";
import { UserHelper, Permissions, Locale, Loading, PageHeader } from "@churchapps/apphelper";
import { Box } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { PermissionDenied } from "../components";
import { RolesTab } from "./components";

export const RolesPage: React.FC = () => {
  const churchId = UserHelper.currentUserChurch.church.id;
  const hasAccess = UserHelper.checkAccess(Permissions.membershipApi.roles.view);

  const church = useQuery<ChurchInterface>({
    queryKey: [`/churches/${churchId}?include=permissions`, "MembershipApi"],
    enabled: !!churchId && hasAccess
  });

  if (!hasAccess) return <PermissionDenied permissions={[Permissions.membershipApi.roles.view]} />;
  if (church.isLoading) return <Loading />;

  return (
    <>
      <PageHeader title={Locale.label("settings.roles.roles")} subtitle={Locale.label("settings.rolesPage.subtitle")} />
      <Box sx={{ p: 3 }}>
        <RolesTab church={church.data || null} />
      </Box>
    </>
  );
};
