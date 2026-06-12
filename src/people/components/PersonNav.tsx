import React from "react";
import { Icon, Button, Box } from "@mui/material";
import { type PersonInterface } from "@churchapps/helpers";
import { Permissions, UserHelper, Locale } from "@churchapps/apphelper";
interface Props {
  person: PersonInterface;
}

export const PersonNav: React.FC<Props> = (props) => {
  const [person, setPerson] = React.useState<PersonInterface>(props.person);
  const [selectedTab, setSelectedTab] = React.useState("details");

  React.useEffect(() => setPerson(props.person), [props.person]);
  const tabs: { key: string; icon: string; label: string }[] = [];

  if (person === undefined || person === null) return null;

  tabs.push({ key: "details", icon: "person", label: Locale.label("person.person") });

  if (UserHelper.checkAccess(Permissions.membershipApi.people.edit)) {
    tabs.push({ key: "notes", icon: "notes", label: Locale.label("common.notes") });
  }
  if (UserHelper.checkAccess(Permissions.attendanceApi.attendance.view)) {
    tabs.push({ key: "attendance", icon: "calendar_month", label: Locale.label("people.tabs.att") });
  }
  if (UserHelper.checkAccess(Permissions.givingApi.donations.view)) {
    tabs.push({ key: "donations", icon: "volunteer_activism", label: Locale.label("people.tabs.don") });
  }
  const getItem = (tab: any) => {
    if (tab.key === selectedTab) {
      return (
        <li className="active">
          <Button variant="text" color="inherit" onClick={() => setSelectedTab(tab.key)} sx={{ p: 0, minWidth: 0 }}>
            <Icon>{tab.icon}</Icon> {tab.label}
          </Button>
        </li>
      );
    }
    return (
      <li>
        <Button variant="text" color="inherit" onClick={() => setSelectedTab(tab.key)} sx={{ p: 0, minWidth: 0 }}>
          <Icon>{tab.icon}</Icon> {tab.label}
        </Button>
      </li>
    );
  };

  return (
    <Box className="sideNav" sx={{ height: "100vh", borderRight: 1, borderColor: "divider" }}>
      <ul>
        {tabs.map((tab) => getItem(tab))}
        <li>
          <Button variant="text" color="inherit" sx={{ p: 0, minWidth: 0 }}>
            <Icon>people</Icon> {Locale.label("people.personNav.groups")}
          </Button>
        </li>
      </ul>

      <div className="subhead">{Locale.label("people.personNav.customForms")}</div>
      <ul>
        <li>
          <Button variant="text" color="inherit" sx={{ p: 0, minWidth: 0 }}>{Locale.label("people.personNav.discipleship")}</Button>
        </li>
      </ul>
    </Box>
  );
};
