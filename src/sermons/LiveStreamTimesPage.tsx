import React, { memo } from "react";
import { UserHelper, Permissions, Locale, CommonEnvironmentHelper } from "@churchapps/apphelper";
import { Add as AddIcon, OpenInNew as OpenIcon } from "@mui/icons-material";
import type { StreamingServiceInterface } from "@churchapps/helpers";
import { Services } from "./components";
import { newStreamingService } from "./components/Services";
import { SermonChrome } from "./components/SermonChrome";
import { HeaderPrimaryButton, HeaderTextButton } from "../components/ui";

export const LiveStreamTimesPage = memo(() => {
  const [current, setCurrent] = React.useState<StreamingServiceInterface | null>(null);

  if (!UserHelper.checkAccess(Permissions.contentApi.streamingServices.edit)) return <></>;

  const streamUrl = CommonEnvironmentHelper.B1Root.replace("{key}", UserHelper.currentUserChurch.church.subDomain || "") + "/stream";

  const actions = (
    <>
      <HeaderTextButton href={streamUrl} target="_blank" rel="noopener noreferrer" endIcon={<OpenIcon />} data-testid="view-stream-link">
        {Locale.label("sermons.liveStreamTimes.externalLinks.viewYourStream")}
      </HeaderTextButton>
      {current === null && (
        <HeaderPrimaryButton startIcon={<AddIcon />} onClick={() => setCurrent(newStreamingService())} data-testid="add-service-button">
          {Locale.label("sermons.liveStreamTimes.servicesTab.addService")}
        </HeaderPrimaryButton>
      )}
    </>
  );

  return (
    <SermonChrome selected="times" actions={actions}>
      <Services current={current} onEdit={setCurrent} />
    </SermonChrome>
  );
});
