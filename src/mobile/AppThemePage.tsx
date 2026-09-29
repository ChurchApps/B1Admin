import React from "react";
import { Locale, Permissions } from "@churchapps/apphelper";
import { AppThemeEdit } from "../settings/components/AppThemeEdit";
import { useRequirePermission } from "../hooks";
import { MobileChrome } from "./components/MobileChrome";

export const AppThemePage: React.FC = () => {
  const denied = useRequirePermission(Permissions.membershipApi.settings.edit);
  if (denied) return denied;

  return (
    <MobileChrome title={Locale.label("mobile.appThemePage.title")} subtitle={Locale.label("mobile.appThemePage.subtitle")} maxWidth="md">
      <AppThemeEdit />
    </MobileChrome>
  );
};
