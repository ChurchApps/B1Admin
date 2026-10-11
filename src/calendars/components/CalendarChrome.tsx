import React from "react";
import { Locale } from "@churchapps/apphelper";
import { PageContainer, PageHeader } from "../../components/ui";

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

// Shared header for the four calendar pages; section switching lives in the main menu.
export const CalendarChrome: React.FC<Props> = ({ selected, subtitle, actions, children }) => (
  <>
    <PageHeader title={Locale.label(titles[selected])} subtitle={subtitle}>{actions}</PageHeader>
    <PageContainer>{children}</PageContainer>
  </>
);
