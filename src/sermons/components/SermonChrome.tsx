import React from "react";
import { Locale } from "@churchapps/apphelper";
import { DirectoryPage, Verb, type PillItem } from "./plate";

type SermonPlate = "sermons" | "times" | "bulk";

const titles: Record<SermonPlate, string> = {
  sermons: "sermons.title",
  times: "sermons.liveStreamTimes.title",
  bulk: "sermons.bulkImport.title"
};

const ledes: Record<SermonPlate, string> = {
  sermons: "sermons.subtitle",
  times: "sermons.liveStreamTimes.subtitle",
  bulk: "sermons.bulkImport.subtitle"
};

export const SermonChrome: React.FC<{
  selected: SermonPlate;
  extraVerbs?: React.ReactNode;
  find?: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
}> = ({ selected, extraVerbs, find, children, wide }) => {
  const pills: PillItem[] = [
    { label: Locale.label("sermons.title"), to: "/sermons", selected: selected === "sermons", testId: "pill-sermons" },
    { label: Locale.label("sermons.liveStreamTimes.title"), to: "/sermons/times", selected: selected === "times", testId: "pill-times" }
  ];

  return (
    <DirectoryPage
      title={Locale.label(titles[selected])}
      lede={Locale.label(ledes[selected])}
      pills={pills}
      wide={wide}
      find={find}
      headerVerbs={(
        <>
          <Verb to="/sermons/bulk">{Locale.label("sermons.bulkImport.title")}</Verb>
          {extraVerbs}
        </>
      )}>
      {children}
    </DirectoryPage>
  );
};
