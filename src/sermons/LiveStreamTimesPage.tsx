import React, { memo } from "react";
import { UserHelper, Permissions, PageHeader, Locale, CommonEnvironmentHelper } from "@churchapps/apphelper";
import { Box, Button, Grid } from "@mui/material";
import {
  Schedule as ScheduleIcon,
  PlayArrow as PlayArrowIcon,
  Settings as SettingsIcon,
  LiveTv as LiveTvIcon
} from "@mui/icons-material";
import { Services, Tabs } from "./components";
import { NavigationTabs } from "../components/ui/NavigationTabs";

export const LiveStreamTimesPage = memo(() => {
  const [selectedTab, setSelectedTab] = React.useState("services");

  if (!UserHelper.checkAccess(Permissions.contentApi.streamingServices.edit)) return <></>;

  const tabs = [
    { value: "services", label: Locale.label("sermons.liveStreamTimes.services"), icon: <PlayArrowIcon /> },
    { value: "settings", label: Locale.label("sermons.liveStreamTimes.settings"), icon: <SettingsIcon /> }
  ];

  const streamUrl = CommonEnvironmentHelper.B1Root.replace("{key}", UserHelper.currentUserChurch.church.subDomain) + "/stream";

  const getCurrentTab = () => {
    switch (selectedTab) {
      case "services": return <Services />;
      case "settings": return (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Tabs />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Button variant="contained" startIcon={<LiveTvIcon />} href={streamUrl} target="_blank" rel="noopener noreferrer">
              {Locale.label("sermons.liveStreamTimes.externalLinks.viewYourStream")}
            </Button>
          </Grid>
        </Grid>
      );
      default: return <Services />;
    }
  };

  return (
    <>
      <PageHeader icon={<ScheduleIcon />} title={Locale.label("sermons.liveStreamTimes.title")} subtitle={Locale.label("sermons.liveStreamTimes.subtitle")} />
      <NavigationTabs selectedTab={selectedTab} onTabChange={setSelectedTab} tabs={tabs} />
      <Box sx={{ p: 3 }}>
        {getCurrentTab()}
      </Box>
    </>
  );
});
