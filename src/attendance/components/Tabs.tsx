import React from "react";
import { Permissions, UserHelper, Locale } from "@churchapps/apphelper";
import { Box, Paper } from "@mui/material";
import { ReportWithFilter } from "../../components/reporting";
import { SmartTabs } from "../../components/ui";

export const Tabs: React.FC = () => {
  const canView = UserHelper.checkAccess(Permissions.attendanceApi.attendance.view);
  const tabs = [
    {
      key: "attendance",
      label: Locale.label("attendance.tabs.attTrend"),
      content: <ReportWithFilter keyName="attendanceTrend" autoRun={true} />,
      hidden: !canView
    },
    {
      key: "groups",
      label: Locale.label("attendance.tabs.groupAtt"),
      content: <ReportWithFilter keyName="groupAttendance" autoRun={true} />,
      hidden: !canView
    }
  ];

  return (
    <Paper>
      <Box>
        <SmartTabs tabs={tabs} ariaLabel="attendance-tabs" />
      </Box>
    </Paper>
  );
};
