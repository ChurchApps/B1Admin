import {
  Group as GroupIcon,
  VolunteerActivism as DonationIcon,
  CalendarMonth as AttendanceIcon,
  Notes as NotesIcon,
  Person as PersonIcon
} from "@mui/icons-material";
import { memo, useMemo } from "react";
import { Locale } from "@churchapps/apphelper";
import { NavigationTabs, type NavigationTab } from "../../components/ui";

interface Props {
  selectedTab: string;
  onTabChange: (tab: string) => void;
}

export const PersonNavigation = memo((props: Props) => {
  const { selectedTab, onTabChange } = props;

  const tabs: NavigationTab[] = useMemo(() => [
    { value: "details", label: Locale.label("people.personNavigation.details"), icon: <PersonIcon /> },
    { value: "notes", label: Locale.label("people.personNavigation.notes"), icon: <NotesIcon /> },
    { value: "groups", label: Locale.label("people.personNavigation.groups"), icon: <GroupIcon /> },
    { value: "attendance", label: Locale.label("people.personNavigation.attendance"), icon: <AttendanceIcon /> },
    { value: "donations", label: Locale.label("people.personNavigation.donations"), icon: <DonationIcon /> }
  ], []);

  return (
    <NavigationTabs
      selectedTab={selectedTab}
      onTabChange={onTabChange}
      tabs={tabs}
    />
  );
});
