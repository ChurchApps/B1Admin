"use client";

import React from "react";
import { Box, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { ReportWithFilter } from "../components/reporting/ReportWithFilter";
import { Locale } from "@churchapps/apphelper";

export const GivingDashboard = () => {
  const [period, setPeriod] = React.useState("Weekly");

  const handlePeriodChange = (_event: React.MouseEvent<HTMLElement>, newPeriod: string | null) => {
    if (newPeriod) setPeriod(newPeriod);
  };

  const reportKeyName = "donationDashboard" + period;

  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <ToggleButtonGroup value={period} exclusive onChange={handlePeriodChange} size="small">
          <ToggleButton value="Weekly">{Locale.label("donations.period.weekly") || "Weekly"}</ToggleButton>
          <ToggleButton value="Monthly">{Locale.label("donations.period.monthly") || "Monthly"}</ToggleButton>
          <ToggleButton value="Quarterly">{Locale.label("donations.period.quarterly") || "Quarterly"}</ToggleButton>
        </ToggleButtonGroup>
      </Box>
      <ReportWithFilter keyName={reportKeyName} autoRun={true} />
    </>
  );
};
