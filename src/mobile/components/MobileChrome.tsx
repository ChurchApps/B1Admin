import React from "react";
import { Locale } from "@churchapps/apphelper";
import { DirectoryPage, type PillItem } from "./plate";

type MobilePlate = "navigation" | "theme" | "portal" | "checkin" | "labels";

const titles: Record<MobilePlate, string> = {
  navigation: "settings.mobileAppSettings.title",
  theme: "mobile.appThemePage.title",
  portal: "mobile.b1MobilePage.title",
  checkin: "mobile.checkInPage.title",
  labels: "attendance.labels.title"
};

const ledes: Record<MobilePlate, string> = {
  navigation: "settings.mobileAppSettings.subtitle",
  theme: "mobile.appThemePage.subtitle",
  portal: "mobile.b1MobilePage.subtitle",
  checkin: "mobile.checkInPage.subtitle",
  labels: "attendance.labels.subtitle"
};

export const MobileChrome: React.FC<{
  selected: MobilePlate;
  extraVerbs?: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
}> = ({ selected, extraVerbs, children, wide }) => {
  const pills: PillItem[] = [
    { label: Locale.label("common.navigation"), to: "/mobile/navigation", selected: selected === "navigation", testId: "pill-mobile-nav" },
    { label: Locale.label("common.appTheme"), to: "/mobile/theme", selected: selected === "theme", testId: "pill-mobile-theme" },
    { label: Locale.label("common.b1Mobile"), to: "/mobile/b1-mobile", selected: selected === "portal", testId: "pill-mobile-portal" },
    { label: Locale.label("common.b1CheckIn"), to: "/mobile/checkin", selected: selected === "checkin", testId: "pill-mobile-checkin" },
    { label: Locale.label("common.labels"), to: "/mobile/checkin/labels", selected: selected === "labels", testId: "pill-mobile-labels" }
  ];

  return (
    <DirectoryPage
      title={Locale.label(titles[selected])}
      lede={Locale.label(ledes[selected])}
      pills={pills}
      wide={wide}
      headerVerbs={extraVerbs}>
      {children}
    </DirectoryPage>
  );
};
