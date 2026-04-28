import { Icon, Button, Box } from "@mui/material";
import React from "react";
import { Locale } from "@churchapps/apphelper";

export const PersonNav: React.FC = () => {
  return (
    <Box className="sideNav" sx={{ height: "100vh", borderRight: 1, borderColor: "divider" }}>
      <ul>
        <li key="details" className="active">
          <Button variant="text" color="inherit" sx={{ p: 0, minWidth: 0 }}>
            <Icon>person</Icon> {Locale.label("ui.personNav.details")}
          </Button>
        </li>
        <li key="notes">
          <Button variant="text" color="inherit" sx={{ p: 0, minWidth: 0 }}>
            <Icon>sticky_note_2</Icon> {Locale.label("ui.personNav.notes")}
          </Button>
        </li>
        <li key="attendance">
          <Button variant="text" color="inherit" sx={{ p: 0, minWidth: 0 }}>
            <Icon>calendar_month</Icon> {Locale.label("ui.personNav.attendance")}
          </Button>
        </li>
        <li key="giving">
          <Button variant="text" color="inherit" sx={{ p: 0, minWidth: 0 }}>
            <Icon>volunteer_activism</Icon> {Locale.label("ui.personNav.giving")}
          </Button>
        </li>
        <li key="groups">
          <Button variant="text" color="inherit" sx={{ p: 0, minWidth: 0 }}>
            <Icon>people</Icon> {Locale.label("ui.personNav.groups")}
          </Button>
        </li>
      </ul>

      <div className="subhead">{Locale.label("ui.personNav.customForms")}</div>
      <ul>
        <li key="discipleship">
          <Button variant="text" color="inherit" sx={{ p: 0, minWidth: 0 }}>{Locale.label("ui.personNav.discipleship")}</Button>
        </li>
      </ul>
    </Box>
  );
};
