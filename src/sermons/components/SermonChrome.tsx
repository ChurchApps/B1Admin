import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { Locale } from "@churchapps/apphelper";
import { PageContainer, PageHeader, TextAction } from "../../components/ui";
import { SectionPills } from "../../calendars/components/SectionPills";

type SermonSection = "sermons" | "times" | "bulk";

const titles: Record<SermonSection, string> = {
  sermons: "sermons.title",
  times: "sermons.liveStreamTimes.title",
  bulk: "sermons.bulkImport.title"
};

const subtitles: Record<SermonSection, string> = {
  sermons: "sermons.subtitle",
  times: "sermons.liveStreamTimes.subtitle",
  bulk: "sermons.bulkImport.subtitle"
};

interface Props {
  selected: SermonSection;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

// Shared header for sermons pages: Sermons / Live Stream Times pills plus a Bulk import verb.
export const SermonChrome: React.FC<Props> = ({ selected, actions, children }) => {
  const pills = [
    { label: Locale.label("sermons.title"), to: "/sermons", selected: selected === "sermons", "data-testid": "pill-sermons" },
    { label: Locale.label("sermons.liveStreamTimes.title"), to: "/sermons/times", selected: selected === "times", "data-testid": "pill-times" }
  ];

  return (
    <>
      <PageHeader
        title={Locale.label(titles[selected])}
        subtitle={Locale.label(subtitles[selected])}
        tabs={<SectionPills items={pills} aria-label={Locale.label("sermons.chrome.sections", "Sermon sections")} />}>
        {selected !== "bulk" && (
          <TextAction to="/sermons/bulk" component={RouterLink} data-testid="sermons-bulk-import-link">
            {Locale.label("sermons.bulkImport.title")}
          </TextAction>
        )}
        {actions}
      </PageHeader>
      <PageContainer>{children}</PageContainer>
    </>
  );
};
