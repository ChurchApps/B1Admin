import { useEffect, useState } from "react";
import { Typography } from "@mui/material";
import { useSearchParams } from "react-router-dom";
import { UserHelper, Permissions, Locale } from "@churchapps/apphelper";
import type { LinkInterface } from "@churchapps/helpers";
import { AppTabs, AppEdit } from "../settings/components";
import { useRequirePermission } from "../hooks";
import { AddBlock, Verb } from "./components/plate";
import { MobileChrome } from "./components/MobileChrome";

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

export const MobileAppSettingsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedTab, setSelectedTab] = useState<LinkInterface | null>(() => {
    if (!UserHelper.currentUserChurch) return null;
    const linkType = searchParams.get("linkType");
    if (!linkType) return null;
    return buildNewTab(linkType, searchParams.get("linkData") || "");
  });
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAddTab = () => {
    setSelectedTab(buildNewTab());
  };

  useEffect(() => {
    if (!searchParams.has("linkType") && !searchParams.has("linkData")) return;
    const next = new URLSearchParams(searchParams);
    next.delete("linkType");
    next.delete("linkData");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleTabsUpdated = () => {
    setSelectedTab(null);
    setRefreshKey(Math.random());
  };

  const denied = useRequirePermission(Permissions.contentApi.content.edit);
  if (denied) return denied;

  return (
    <MobileChrome
      selected="navigation"
      extraVerbs={<Verb onClick={handleAddTab}>{Locale.label("settings.mobileAppSettings.addTab")}</Verb>}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{Locale.label("settings.mobileAppSettings.tabBarNote")}</Typography>

      {selectedTab && (
        <AppEdit
          currentTab={selectedTab}
          updatedFunction={handleTabsUpdated}
        />
      )}

      {UserHelper.currentUserChurch && (
        <AppTabs
          onSelected={(tab: LinkInterface) => setSelectedTab(tab)}
          refreshKey={refreshKey}
        />
      )}

      {!selectedTab && (
        <AddBlock>
          <Verb onClick={handleAddTab}>{Locale.label("settings.mobileAppSettings.addTab")}</Verb>
        </AddBlock>
      )}
    </MobileChrome>
  );
};
