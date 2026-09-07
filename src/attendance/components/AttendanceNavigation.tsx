import { CalendarMonth as CalendarIcon, Group as GroupIcon, Groups as GroupsIcon, Settings as SettingsIcon, ShowChart as ShowChartIcon } from "@mui/icons-material";
import { memo, useMemo } from "react";
import { NavigationTabs, type NavigationTab } from "../../components/ui";
import { UserHelper, Permissions, Locale } from "@churchapps/apphelper";

interface Props {
  selectedTab: string;
  onTabChange: (tab: string) => void;
  onHeader?: boolean;
}

export const AttendanceNavigation = memo((props: Props) => {
  const { selectedTab, onTabChange, onHeader } = props;

  const tabs: NavigationTab[] = useMemo(() => {
    const tabsList = [];
    tabsList.push({ value: "setup", label: Locale.label("attendance.tabs.setup"), icon: <SettingsIcon /> });
    if (UserHelper.checkAccess(Permissions.attendanceApi.attendance.edit)) {
      tabsList.push({ value: "headcounts", label: Locale.label("attendance.tabs.headcounts"), icon: <GroupsIcon />, testId: "attendance-tab-headcounts" });
    }
    if (UserHelper.checkAccess(Permissions.attendanceApi.attendance.view)) {
      tabsList.push({ value: "attendance", label: Locale.label("attendance.tabs.attTrend"), icon: <CalendarIcon /> });
    }
    if (UserHelper.checkAccess(Permissions.attendanceApi.attendance.view)) {
      tabsList.push({ value: "headcountTrend", label: Locale.label("attendance.tabs.headcountTrend"), icon: <ShowChartIcon />, testId: "attendance-tab-headcount-trend" });
    }
    if (UserHelper.checkAccess(Permissions.attendanceApi.attendance.view)) {
      tabsList.push({ value: "groups", label: Locale.label("attendance.tabs.groupAtt"), icon: <GroupIcon /> });
    }
    return tabsList;
  }, []);

  return <NavigationTabs selectedTab={selectedTab} onTabChange={onTabChange} tabs={tabs} onHeader={onHeader} />;
});
