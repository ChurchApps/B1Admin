import { CalendarMonth as CalendarIcon, Group as GroupIcon, Label as LabelIcon, Settings as SettingsIcon } from "@mui/icons-material";
import { memo, useMemo } from "react";
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
    if (UserHelper.checkAccess(Permissions.attendanceApi.attendance.edit)) {
      tabsList.push({ value: "labels", label: Locale.label("attendance.tabs.labels"), icon: <LabelIcon /> });
    }
    return tabsList;
  }, []);

  return <NavigationTabs selectedTab={selectedTab} onTabChange={onTabChange} tabs={tabs} />;
});
