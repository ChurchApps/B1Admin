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
import { Locale } from "@churchapps/apphelper";
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
    { value: "details", label: Locale.label("people.personNavigation.details"), icon: <PersonIcon /> },
    { value: "notes", label: Locale.label("people.personNavigation.notes"), icon: <NotesIcon /> },
    { value: "groups", label: Locale.label("people.personNavigation.groups"), icon: <GroupIcon /> },
    { value: "attendance", label: Locale.label("people.personNavigation.attendance"), icon: <AttendanceIcon /> },
    { value: "donations", label: Locale.label("people.personNavigation.donations"), icon: <DonationIcon /> }
  ], []);

  const dropdown: NavigationDropdown<FormInterface> | undefined = useMemo(() => {
    const personForms = (allForms || []).filter((form) => form.contentType === "person");
    if (personForms.length === 0) return undefined;

    return {
      value: "forms",
      label: Locale.label("people.personNavigation.forms"),
      icon: <FormIcon />,
      items: personForms,
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
