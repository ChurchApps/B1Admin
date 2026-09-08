import React from "react";
import { Permissions } from "@churchapps/apphelper";
import { AppThemeEdit } from "../settings/components/AppThemeEdit";
import { useRequirePermission } from "../hooks";
import { MobileChrome } from "./components/MobileChrome";

export const AppThemePage: React.FC = () => {
  const denied = useRequirePermission(Permissions.membershipApi.settings.edit);
  if (denied) return denied;

  return (
    <MobileChrome selected="theme" wide>
      <AppThemeEdit />
    </MobileChrome>
  );
};
