import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { Locale } from "@churchapps/apphelper";
import { usePendingApprovalsCount } from "../../hooks";
import { PageContainer, PageHeader, TextAction } from "../../components/ui";
import { SectionPills } from "./SectionPills";

type CalendarSection = "calendars" | "approvals" | "rooms" | "availability";

const titles: Record<CalendarSection, string> = {
  calendars: "calendars.calendarList.title",
  approvals: "calendars.approvals.title",
  rooms: "calendars.rooms.title",
  availability: "calendars.availability.title"
};

interface Props {
  selected: CalendarSection;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

// Shared header for the four calendar pages: section pills plus a Registrations cross-link.
export const CalendarChrome: React.FC<Props> = ({ selected, subtitle, actions, children }) => {
  const pending = usePendingApprovalsCount();

  const pills = [
    { label: Locale.label("calendars.calendarList.title"), to: "/calendars", selected: selected === "calendars", "data-testid": "pill-calendars" },
    { label: Locale.label("calendars.approvals.title"), to: "/calendars/approvals", selected: selected === "approvals", count: pending, "data-testid": "pill-approvals" },
    { label: Locale.label("calendars.rooms.title"), to: "/calendars/rooms", selected: selected === "rooms", "data-testid": "pill-rooms" },
    { label: Locale.label("calendars.availability.title"), to: "/calendars/availability", selected: selected === "availability", "data-testid": "pill-availability" }
  ];

  return (
    <>
      <PageHeader
        title={Locale.label(titles[selected])}
        subtitle={subtitle}
        tabs={<SectionPills items={pills} aria-label={Locale.label("calendars.chrome.sections", "Calendar sections")} />}>
        <TextAction to="/registrations" component={RouterLink} data-testid="calendars-registrations-link">
          {Locale.label("helpers.secondaryMenuHelper.registrations")}
        </TextAction>
        {actions}
      </PageHeader>
      <PageContainer>{children}</PageContainer>
    </>
  );
};
