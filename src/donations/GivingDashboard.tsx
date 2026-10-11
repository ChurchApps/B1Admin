"use client";

import React from "react";
import { Box, Stack } from "@mui/material";
import { InsertChartOutlined as DashboardIcon, PersonOffOutlined as LapsedIcon } from "@mui/icons-material";
import { ReportWithFilter } from "../components/reporting/ReportWithFilter";
import { Locale } from "@churchapps/apphelper";
import { PillTabs, ViewToggle } from "../components/ui";

export const GivingDashboard = () => {
  const [period, setPeriod] = React.useState("Weekly");
  const [view, setView] = React.useState<"dashboard" | "lapsedGivers">("dashboard");

  const reportKeyName = "donationDashboard" + period;

  return (
    <Box>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }} justifyContent="space-between" sx={{ mb: 3, minHeight: 40 }}>
        <Box>
          {view === "dashboard" && (
            <PillTabs
              aria-label={Locale.label("donations.period.label", "Period")}
              value={period}
              onChange={setPeriod}
              options={[
                { value: "Weekly", label: Locale.label("donations.period.weekly") },
                { value: "Monthly", label: Locale.label("donations.period.monthly") },
                { value: "Quarterly", label: Locale.label("donations.period.quarterly") }
              ]}
            />
          )}
        </Box>
        <ViewToggle
          label={Locale.label("donations.view.label", "View")}
          value={view}
          onChange={setView}
          options={[
            { value: "dashboard", label: Locale.label("donations.tabs.dashboard"), icon: <DashboardIcon />, "data-testid": "giving-view-dashboard" },
            { value: "lapsedGivers", label: Locale.label("donations.tabs.lapsedGivers"), icon: <LapsedIcon />, "data-testid": "giving-view-lapsed" }
          ]}
        />
      </Stack>
      {view === "dashboard" ? <ReportWithFilter keyName={reportKeyName} autoRun={true} /> : <ReportWithFilter key="lapsedGivers" keyName="lapsedGivers" autoRun={true} />}
    </Box>
  );
};
