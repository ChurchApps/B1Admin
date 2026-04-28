import { Icon, Button, Box } from "@mui/material";
import React from "react";

export const PersonNav: React.FC = () => {
  return (
    <Box className="sideNav" sx={{ height: "100vh", borderRight: 1, borderColor: "divider" }}>
      <ul>
        <li key="details" className="active">
          <Button variant="text" color="inherit" sx={{ p: 0, minWidth: 0 }}>
            <Icon>person</Icon> Details
          </Button>
        </li>
        <li key="notes">
          <Button variant="text" color="inherit" sx={{ p: 0, minWidth: 0 }}>
            <Icon>sticky_note_2</Icon> Notes
          </Button>
        </li>
        <li key="attendance">
          <Button variant="text" color="inherit" sx={{ p: 0, minWidth: 0 }}>
            <Icon>calendar_month</Icon> Attendance
          </Button>
        </li>
        <li key="giving">
          <Button variant="text" color="inherit" sx={{ p: 0, minWidth: 0 }}>
            <Icon>volunteer_activism</Icon> Giving
          </Button>
        </li>
        <li key="groups">
          <Button variant="text" color="inherit" sx={{ p: 0, minWidth: 0 }}>
            <Icon>people</Icon> Groups
          </Button>
        </li>
      </ul>

      <div className="subhead">Custom Forms</div>
      <ul>
        <li key="discipleship">
          <Button variant="text" color="inherit" sx={{ p: 0, minWidth: 0 }}>Discipleship</Button>
        </li>
      </ul>
    </Box>
  );
};
