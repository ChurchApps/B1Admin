import React, { useEffect, useState } from "react";
import { Box, Button } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { useSearchParams } from "react-router-dom";
import { UserHelper, Permissions, PageHeader, Locale } from "@churchapps/apphelper";
import type { LinkInterface } from "@churchapps/helpers";
import { AppTabs, AppEdit } from "./components";
import { PermissionDenied } from "../components";

const ICON_FOR_LINK_TYPE: Record<string, string> = {
  bible: "menu_book",
  votd: "format_quote",
  sermons: "play_circle",
  stream: "live_tv",
  donation: "volunteer_activism",
  donationLanding: "volunteer_activism",
  groups: "groups",
  directory: "people",
  lessons: "school",
  plans: "assignment",
  volunteer: "volunteer_activism",
  checkin: "how_to_reg",
  page: "description",
  url: "link"
};

export const MobileAppSettingsPage = () => {
  const [selectedTab, setSelectedTab] = useState<LinkInterface>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();

  const buildNewTab = (linkType = "url", linkData = ""): LinkInterface => {
    const tab: LinkInterface = {
      churchId: UserHelper.currentUserChurch.church.id,
      sort: 0,
      text: "",
      url: "",
      icon: ICON_FOR_LINK_TYPE[linkType] || "home",
      linkData,
      linkType,
      category: "b1Tab"
    };
    (tab as any).visibility = "everyone";
    return tab;
  };

  const handleAddTab = () => {
    setSelectedTab(buildNewTab());
  };

  useEffect(() => {
    if (!UserHelper.currentUserChurch) return;
    const linkType = searchParams.get("linkType");
    if (!linkType) return;
    const linkData = searchParams.get("linkData") || "";
    setSelectedTab(buildNewTab(linkType, linkData));
    const next = new URLSearchParams(searchParams);
    next.delete("linkType");
    next.delete("linkData");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabsUpdated = () => {
    setSelectedTab(null);
    setRefreshKey(Math.random());
  };

  if (!UserHelper.checkAccess(Permissions.contentApi.content.edit)) return <PermissionDenied permissions={[Permissions.contentApi.content.edit]} />;

  return (
    <>
      <PageHeader
        title={Locale.label("settings.mobileAppSettings.title")}
        subtitle={Locale.label("settings.mobileAppSettings.subtitle")}
      >
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={handleAddTab}
          sx={{
            color: "#FFF",
            borderColor: "rgba(255,255,255,0.5)",
            "&:hover": {
              borderColor: "#FFF",
              backgroundColor: "rgba(255,255,255,0.1)"
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

        {UserHelper.currentUserChurch && (
          <AppTabs
            onSelected={(tab: LinkInterface) => setSelectedTab(tab)}
            refreshKey={refreshKey}
          />
        )}
      </Box>
    </>
  );
};
