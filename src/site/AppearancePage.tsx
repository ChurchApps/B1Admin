import React, { useCallback } from "react";
import { Box } from "@mui/material";
import { UserHelper, Permissions, PageHeader, Locale } from "@churchapps/apphelper";
import { Navigate } from "react-router-dom";
import { StylesManager } from "./components";

export const AppearancePage = () => {
  const [redirectUrl, setRedirectUrl] = React.useState<string>("");

  const checkAccess = useCallback(() => {
    if (!UserHelper.checkAccess(Permissions.contentApi.content.edit)) setRedirectUrl("/");
  }, []);

  React.useEffect(checkAccess, [checkAccess]);

  if (redirectUrl !== "") return <Navigate to={redirectUrl}></Navigate>;

  return (
    <>
      <PageHeader
        title={Locale.label("site.appearancePage.title")}
        subtitle={Locale.label("site.appearancePage.subtitle")}
      />
      <Box sx={{ p: 3 }}>
        {UserHelper.currentUserChurch && UserHelper.checkAccess(Permissions.contentApi.content.edit) && (
          <StylesManager />
        )}
      </Box>
    </>
  );
};
