import React, { memo } from "react";
import { UserHelper, Permissions, Locale, CommonEnvironmentHelper } from "@churchapps/apphelper";
import { Box, Link } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import type { StreamingServiceInterface } from "@churchapps/helpers";
import { Services, Tabs } from "./components";
import { SermonChrome } from "./components/SermonChrome";
import { PillTabs } from "../components/ui";

export const LiveStreamTimesPage = memo(() => {
  const [selectedTab, setSelectedTab] = React.useState("services");

  useQuery<StreamingServiceInterface[]>({
    queryKey: ["/streamingServices", "ContentApi"],
    placeholderData: []
  });

  if (!UserHelper.checkAccess(Permissions.contentApi.streamingServices.edit)) return <></>;

  const streamUrl = CommonEnvironmentHelper.B1Root.replace("{key}", UserHelper.currentUserChurch.church.subDomain || "") + "/stream";

  const viewStream = (
    <Link href={streamUrl} target="_blank" rel="noopener noreferrer" underline="hover" sx={{ fontWeight: 600 }} data-testid="view-stream-link">
      {Locale.label("sermons.liveStreamTimes.externalLinks.viewYourStream")}
    </Link>
  );

  return (
    <SermonChrome selected="times" actions={viewStream}>
      <PillTabs
        tabs
        options={[
          { value: "services", label: Locale.label("sermons.liveStreamTimes.services"), "data-testid": "pill-services" },
          { value: "settings", label: Locale.label("sermons.liveStreamTimes.settings"), "data-testid": "pill-settings" }
        ]}
        value={selectedTab}
        onChange={setSelectedTab}
        aria-label={Locale.label("sermons.liveStreamTimes.title")}
        sx={{ mb: 3 }}
      />
      {selectedTab === "settings"
        ? <Box sx={{ maxWidth: 720 }}><Tabs /></Box>
        : <Services />}
    </SermonChrome>
  );
});
