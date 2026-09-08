import {
  Group as GroupIcon,
  VolunteerActivism as DonationIcon,
  CalendarMonth as AttendanceIcon,
  Notes as NotesIcon,
  Person as PersonIcon,
  Description as DescriptionIcon
} from "@mui/icons-material";
import { memo, useMemo } from "react";
import { Locale, Permissions, UserHelper } from "@churchapps/apphelper";
import { NavigationTabs, type NavigationTab } from "../../components/ui";

interface Props {
  selectedTab: string;
  onTabChange: (tab: string) => void;
  showForms?: boolean;
  onHeader?: boolean;
}

export const PersonNavigation = memo((props: Props) => {
  const { selectedTab, onTabChange, showForms, onHeader } = props;

  const tabs: NavigationTab[] = useMemo(() => {
    const list: NavigationTab[] = [{ value: "details", label: Locale.label("people.personNavigation.details"), icon: <PersonIcon /> }];
    if (showForms) list.push({ value: "forms", label: Locale.label("people.personNavigation.forms"), icon: <DescriptionIcon /> });
    if (UserHelper.checkAccess(Permissions.membershipApi.people.edit)) list.push({ value: "notes", label: Locale.label("people.personNavigation.notes"), icon: <NotesIcon /> });
    list.push({ value: "groups", label: Locale.label("people.personNavigation.groups"), icon: <GroupIcon /> });
    if (UserHelper.checkAccess(Permissions.attendanceApi.attendance.view)) list.push({ value: "attendance", label: Locale.label("people.personNavigation.attendance"), icon: <AttendanceIcon /> });
    if (UserHelper.checkAccess(Permissions.givingApi.donations.view)) list.push({ value: "donations", label: Locale.label("people.personNavigation.donations"), icon: <DonationIcon /> });
    return list;
  }, [showForms]);

  return (
    <NavigationTabs
      selectedTab={selectedTab}
      onTabChange={onTabChange}
      tabs={tabs}
      onHeader={onHeader}
    />
  );
});
