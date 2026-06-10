import { type GroupInterface } from "@churchapps/helpers";
import { Group as GroupIcon, CalendarMonth as AttendanceIcon } from "@mui/icons-material";
import { memo, useMemo } from "react";
import { NavigationTabs, type NavigationTab } from "../../components/ui";
import { Locale } from "@churchapps/apphelper";

interface Props {
  selectedTab: string;
  onTabChange: (tab: string) => void;
  group: GroupInterface;
}

export const GroupNavigation = memo((props: Props) => {
  const { selectedTab, onTabChange, group } = props;

  const isStandard = useMemo(() => group?.tags?.indexOf("standard") > -1, [group?.tags]);

  const tabs: NavigationTab[] = useMemo(() => {
    const baseTabs = [{ value: "members", label: Locale.label("groups.groupNavigation.members"), icon: <GroupIcon /> }];

    if (isStandard && group?.trackAttendance) {
      baseTabs.push({ value: "sessions", label: Locale.label("groups.groupNavigation.sessions"), icon: <AttendanceIcon /> });
    }

    return baseTabs;
  }, [isStandard, group?.trackAttendance]);

  return <NavigationTabs selectedTab={selectedTab} onTabChange={onTabChange} tabs={tabs} />;
});
