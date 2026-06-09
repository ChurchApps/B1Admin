import { CalendarMonth as CalendarIcon, Group as GroupIcon, Settings as SettingsIcon } from "@mui/icons-material";
import React, { memo, useMemo } from "react";
import { NavigationTabs, type NavigationTab } from "../../components/ui";
import { UserHelper, Permissions, Locale } from "@churchapps/apphelper";

interface Props {
  selectedTab: string;
  onTabChange: (tab: string) => void;
}

export const AttendanceNavigation = memo((props: Props) => {
  const { selectedTab, onTabChange } = props;

  const tabs: NavigationTab[] = useMemo(() => {
    const tabsList = [];
    tabsList.push({ value: "setup", label: Locale.label("attendance.tabs.setup"), icon: <SettingsIcon /> });
    if (UserHelper.checkAccess(Permissions.attendanceApi.attendance.view)) {
      tabsList.push({ value: "attendance", label: Locale.label("attendance.tabs.attTrend"), icon: <CalendarIcon /> });
    }
    if (UserHelper.checkAccess(Permissions.attendanceApi.attendance.view)) {
      tabsList.push({ value: "groups", label: Locale.label("attendance.tabs.groupAtt"), icon: <GroupIcon /> });
    }
    return tabsList;
  }, []);

  return <NavigationTabs selectedTab={selectedTab} onTabChange={onTabChange} tabs={tabs} />;
});
