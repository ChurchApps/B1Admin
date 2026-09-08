import React from "react";
import { Locale } from "@churchapps/apphelper";
import { usePendingApprovalsCount } from "../../hooks";
import { DirectoryPage, Verb, type PillItem } from "./plate";

type CalendarPlate = "calendars" | "approvals" | "rooms" | "availability";

const titles: Record<CalendarPlate, string> = {
  calendars: "calendars.calendarList.title",
  approvals: "calendars.approvals.title",
  rooms: "calendars.rooms.title",
  availability: "calendars.availability.title"
};

const ledes: Record<CalendarPlate, string> = {
  calendars: "calendars.calendarList.subtitleEmpty",
  approvals: "calendars.approvals.subtitle",
  rooms: "calendars.rooms.subtitle",
  availability: "calendars.availability.subtitle"
};

export const CalendarChrome: React.FC<{
  selected: CalendarPlate;
  extraVerbs?: React.ReactNode;
  find?: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
}> = ({ selected, extraVerbs, find, children, wide }) => {
  const pending = usePendingApprovalsCount();

  const pills: PillItem[] = [
    { label: Locale.label("calendars.calendarList.title"), to: "/calendars", selected: selected === "calendars", testId: "pill-calendars" },
    { label: Locale.label("calendars.approvals.title"), to: "/calendars/approvals", selected: selected === "approvals", count: pending, testId: "pill-approvals" },
    { label: Locale.label("calendars.rooms.title"), to: "/calendars/rooms", selected: selected === "rooms", testId: "pill-rooms" },
    { label: Locale.label("calendars.availability.title"), to: "/calendars/availability", selected: selected === "availability", testId: "pill-availability" }
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
          <Verb to="/registrations">{Locale.label("helpers.secondaryMenuHelper.registrations")}</Verb>
          {extraVerbs}
        </>
      )}>
      {children}
    </DirectoryPage>
  );
};
