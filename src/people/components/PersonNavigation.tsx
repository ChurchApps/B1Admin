import { type FormInterface } from "@churchapps/helpers";
import { Stack, Typography } from "@mui/material";
import {
  Group as GroupIcon,
  VolunteerActivism as DonationIcon,
  CalendarMonth as AttendanceIcon,
  Notes as NotesIcon,
  Assignment as FormIcon,
  Person as PersonIcon
} from "@mui/icons-material";
import React, { memo, useMemo } from "react";
import { NavigationTabs, type NavigationTab, type NavigationDropdown } from "../../components/ui";

interface Props {
  selectedTab: string;
  onTabChange: (tab: string) => void;
  allForms?: FormInterface[];
  onFormSelect?: (form: FormInterface) => void;
}

export const PersonNavigation = memo((props: Props) => {
  const { selectedTab, onTabChange, allForms, onFormSelect } = props;

  const tabs: NavigationTab[] = useMemo(() => [
    { value: "details", label: "Details", icon: <PersonIcon /> },
    { value: "notes", label: "Notes", icon: <NotesIcon /> },
    { value: "groups", label: "Groups", icon: <GroupIcon /> },
    { value: "attendance", label: "Attendance", icon: <AttendanceIcon /> },
    { value: "donations", label: "Donations", icon: <DonationIcon /> }
  ], []);

  const dropdown: NavigationDropdown<FormInterface> | undefined = useMemo(() => {
    if (!allForms || allForms.length === 0) return undefined;

    return {
      value: "forms",
      label: "Forms",
      icon: <FormIcon />,
      items: allForms,
      renderItem: (form: FormInterface) => (
        <Stack direction="row" spacing={1} alignItems="center">
          <FormIcon sx={{ color: "text.secondary", fontSize: 20 }} />
          <Typography variant="body2">{form.name}</Typography>
        </Stack>
      ),
      onItemSelect: onFormSelect || (() => {})
    };
  }, [allForms, onFormSelect]);

  return (
    <NavigationTabs
      selectedTab={selectedTab === "form" ? "forms" : selectedTab}
      onTabChange={onTabChange}
      tabs={tabs}
      dropdown={dropdown}
    />
  );
});
