import React from "react";
import { Locale } from "@churchapps/apphelper";
import { PageContainer, PageHeader } from "../../components/ui";

type SermonSection = "sermons" | "times" | "settings" | "bulk";

const titles: Record<SermonSection, [string, string]> = {
  sermons: ["sermons.title", "Sermons"],
  times: ["sermons.liveStreamTimes.title", "Live Stream Times"],
  settings: ["sermons.streamSettings.title", "Stream Settings"],
  bulk: ["sermons.bulkImport.title", "Bulk Import"]
};

const subtitles: Record<SermonSection, [string, string]> = {
  sermons: ["sermons.subtitle", "Manage your sermon library and live streams"],
  times: ["sermons.liveStreamTimes.subtitle", "Configure your recurring service times"],
  settings: ["sermons.streamSettings.subtitle", "Choose the tabs shown beside your live stream"],
  bulk: ["sermons.bulkImport.subtitle", "Import sermons in bulk"]
};

interface Props {
  selected: SermonSection;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

// Shared header for the sermons pages; section switching lives in the main menu.
export const SermonChrome: React.FC<Props> = ({ selected, actions, children }) => (
  <>
    <PageHeader title={Locale.label(...titles[selected])} subtitle={Locale.label(...subtitles[selected])}>
      {actions}
    </PageHeader>
    <PageContainer>{children}</PageContainer>
  </>
);
