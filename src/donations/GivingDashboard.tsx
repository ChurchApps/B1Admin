"use client";

import React from "react";
import { Box, Stack } from "@mui/material";
import { ReportWithFilter } from "../components/reporting/ReportWithFilter";
import { Locale } from "@churchapps/apphelper";
import { PillTabs } from "../components/ui";
import { VerbTabs } from "./components/GivingParts";

export const GivingDashboard = () => {
  const [period, setPeriod] = React.useState("Weekly");
  const [view, setView] = React.useState("dashboard");

  const reportKeyName = "donationDashboard" + period;

  return (
    <Box>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }} justifyContent="space-between" sx={{ mb: 3 }}>
        <VerbTabs
          aria-label="giving-dashboard-tabs"
          value={view}
          onChange={setView}
          options={[
            { value: "dashboard", label: Locale.label("donations.tabs.dashboard") },
            { value: "lapsedGivers", label: Locale.label("donations.tabs.lapsedGivers") }
          ]}
        />
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
      </Stack>
      {view === "dashboard" ? <ReportWithFilter keyName={reportKeyName} autoRun={true} /> : <ReportWithFilter key="lapsedGivers" keyName="lapsedGivers" autoRun={true} />}
    </Box>
  );
};
