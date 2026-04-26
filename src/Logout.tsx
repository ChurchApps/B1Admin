import React from "react";
import UserContext from "./UserContext";
import { LogoutPage } from "@churchapps/apphelper/login";

export const Logout = () => {
  const context = React.useContext(UserContext);
  return <LogoutPage context={context} />;
};
