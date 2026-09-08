import React, { memo } from "react";
import { UserHelper, Permissions, Locale, CommonEnvironmentHelper } from "@churchapps/apphelper";
import { Box } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import type { StreamingServiceInterface } from "@churchapps/helpers";
import { Services, Tabs } from "./components";
import { SermonChrome } from "./components/SermonChrome";
import { Pills, Verb } from "./components/plate";

export const LiveStreamTimesPage = memo(() => {
  const [selectedTab, setSelectedTab] = React.useState("services");

  useQuery<StreamingServiceInterface[]>({
    queryKey: ["/streamingServices", "ContentApi"],
    placeholderData: []
  });

  if (!UserHelper.checkAccess(Permissions.contentApi.streamingServices.edit)) return <></>;

  const streamUrl = CommonEnvironmentHelper.B1Root.replace("{key}", UserHelper.currentUserChurch.church.subDomain || "") + "/stream";

  const getCurrentTab = () => {
    switch (selectedTab) {
      case "services": return <Services />;
      case "settings": return (
        <Box>
          <Tabs />
          <Box sx={{ mt: 2 }}>
            <Verb onClick={() => window.open(streamUrl, "_blank", "noopener,noreferrer")}>{Locale.label("sermons.liveStreamTimes.externalLinks.viewYourStream")}</Verb>
          </Box>
        </Box>
      );
      default: return <Services />;
    }
  };

  return (
    <SermonChrome selected="times" wide>
      <Pills
        items={[
          { label: Locale.label("sermons.liveStreamTimes.services"), selected: selectedTab === "services", onClick: () => setSelectedTab("services"), testId: "pill-services" },
          { label: Locale.label("sermons.liveStreamTimes.settings"), selected: selectedTab === "settings", onClick: () => setSelectedTab("settings"), testId: "pill-settings" }
        ]}
      />
      {getCurrentTab()}
    </SermonChrome>
  );
});
