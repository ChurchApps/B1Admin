import React, { useState, useCallback } from "react";
import { Box, Button } from "@mui/material";
import { PhoneIphone as PhoneIcon, Add as AddIcon } from "@mui/icons-material";
import { UserHelper, Permissions, PageHeader, Locale } from "@churchapps/apphelper";
import { Navigate } from "react-router-dom";
import type { LinkInterface } from "@churchapps/helpers";
import { AppTabs, AppEdit } from "./components";

export const MobileAppSettingsPage = () => {
  const [selectedTab, setSelectedTab] = useState<LinkInterface>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [redirectUrl, setRedirectUrl] = useState<string>("");

  const checkAccess = useCallback(() => {
    if (!UserHelper.checkAccess(Permissions.contentApi.content.edit)) setRedirectUrl("/");
  }, []);

  const handleAddTab = () => {
    const newTab: LinkInterface = {
      churchId: UserHelper.currentUserChurch.church.id,
      sort: 0,
      text: "",
      url: "",
      icon: "home",
      linkData: "",
      linkType: "url",
      category: "b1Tab"
    };
    (newTab as any).visibility = "everyone";
    setSelectedTab(newTab);
  };

  const handleTabsUpdated = () => {
    setSelectedTab(null);
    setRefreshKey(Math.random());
  };

  React.useEffect(checkAccess, [checkAccess]);

  if (redirectUrl !== "") return <Navigate to={redirectUrl}></Navigate>;

  return (
    <>
      <PageHeader
        icon={<PhoneIcon />}
        title={Locale.label("settings.mobileAppSettings.title")}
        subtitle={Locale.label("settings.mobileAppSettings.subtitle")}
      >
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={handleAddTab}
          sx={{
            color: '#FFF',
            borderColor: 'rgba(255,255,255,0.5)',
            '&:hover': {
              borderColor: '#FFF',
              backgroundColor: 'rgba(255,255,255,0.1)'
            }
          }}
        >
          {Locale.label("settings.mobileAppSettings.addTab")}
        </Button>
      </PageHeader>

      <Box sx={{ p: 3 }}>
        {selectedTab && (
          <Box sx={{ mb: 3 }}>
            <AppEdit
              currentTab={selectedTab}
              updatedFunction={handleTabsUpdated}
            />
          </Box>
        )}

        {UserHelper.currentUserChurch && UserHelper.checkAccess(Permissions.contentApi.content.edit) && (
          <AppTabs
            onSelected={(tab: LinkInterface) => setSelectedTab(tab)}
            refreshKey={refreshKey}
          />
        )}
      </Box>
    </>
  );
};
