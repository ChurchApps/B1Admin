import React from "react";
import { UserHelper, Permissions } from "@churchapps/apphelper";
import UserContext from "../UserContext";
import { AdminWelcome } from "./components/AdminWelcome";
import { MemberWelcome } from "./components/MemberWelcome";

export const QuickActionsPage = () => {
  const context = React.useContext(UserContext);

  const isDomainAdmin = UserHelper.checkAccess(Permissions.membershipApi.settings.edit)
    && UserHelper.checkAccess(Permissions.membershipApi.roles.edit)
    && UserHelper.checkAccess(Permissions.givingApi.settings.edit)
    && UserHelper.checkAccess(Permissions.contentApi.content.edit);

  return isDomainAdmin ? <AdminWelcome /> : <MemberWelcome />;
};
