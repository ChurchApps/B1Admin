import { type GroupInterface } from "@churchapps/helpers";
import { Group as GroupIcon, CalendarMonth as AttendanceIcon, Event as EventIcon, MonitorHeart as HealthIcon } from "@mui/icons-material";
import { memo, useMemo } from "react";
import { NavigationTabs, type NavigationTab } from "../../components/ui";
import { Locale, Permissions, UserHelper } from "@churchapps/apphelper";

interface Props {
  selectedTab: string;
  onTabChange: (tab: string) => void;
  group: GroupInterface;
  onHeader?: boolean;
}

export const GroupNavigation = memo((props: Props) => {
  const { selectedTab, onTabChange, group, onHeader } = props;

  const isStandard = useMemo(() => (group?.tags?.indexOf("standard") ?? -1) > -1, [group?.tags]);

  const tabs: NavigationTab[] = useMemo(() => {
    const baseTabs = [{ value: "members", label: Locale.label("groups.groupNavigation.members"), icon: <GroupIcon /> }];

    if (isStandard) {
      baseTabs.push({ value: "sessions", label: Locale.label("groups.groupNavigation.sessions"), icon: <AttendanceIcon /> });
      baseTabs.push({ value: "calendar", label: Locale.label("groups.groupNavigation.calendar"), icon: <EventIcon /> });
      if (UserHelper.checkAccess(Permissions.membershipApi.groupMembers.view)) {
        baseTabs.push({ value: "health", label: Locale.label("groups.groupNavigation.health"), icon: <HealthIcon /> });
      }
    }

    return baseTabs;
  }, [isStandard]);

  return <NavigationTabs selectedTab={selectedTab} onTabChange={onTabChange} tabs={tabs} onHeader={onHeader} />;
});
