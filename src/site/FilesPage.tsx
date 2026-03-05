import React, { useCallback } from "react";
import { Box } from "@mui/material";
import { UserHelper, Permissions, PageHeader, Locale } from "@churchapps/apphelper";
import { Navigate } from "react-router-dom";
import { FilesManager } from "./components";

export const FilesPage = () => {
  const [redirectUrl, setRedirectUrl] = React.useState<string>("");

  const checkAccess = useCallback(() => {
    if (!UserHelper.checkAccess(Permissions.contentApi.content.edit)) setRedirectUrl("/");
  }, []);

  React.useEffect(checkAccess, [checkAccess]);

  if (redirectUrl !== "") return <Navigate to={redirectUrl}></Navigate>;

  return (
    <>
      <PageHeader
        title={Locale.label("site.filesPage.title")}
        subtitle={Locale.label("site.filesPage.subtitle")}
      />
      <Box sx={{ p: 3 }}>
        {UserHelper.currentUserChurch && UserHelper.checkAccess(Permissions.contentApi.content.edit) && (
          <FilesManager />
        )}
      </Box>
    </>
  );
};
