"use client";

import React from "react";
import { Box } from "@mui/material";
import { ReportWithFilter } from "../components/reporting/ReportWithFilter";
import { Locale } from "@churchapps/apphelper";
import { Verb, VerbRow, plateSx, SectionTitle } from "./components/plate";

export const GivingDashboard = () => {
  const [period, setPeriod] = React.useState("Weekly");
  const [view, setView] = React.useState<"dashboard" | "lapsed">("dashboard");

  const reportKeyName = "donationDashboard" + period;
  const periods = ["Weekly", "Monthly", "Quarterly"];

  return (
    <Box sx={plateSx}>
      <Box role="tablist" sx={{ mb: 1 }}>
        <VerbRow>
          <Verb role="tab" aria-selected={view === "dashboard"} onClick={() => setView("dashboard")}>{Locale.label("donations.tabs.dashboard")}</Verb>
          <Verb role="tab" aria-selected={view === "lapsed"} onClick={() => setView("lapsed")}>{Locale.label("donations.tabs.lapsedGivers")}</Verb>
        </VerbRow>
      </Box>

      {view === "dashboard" ? (
        <>
          <SectionTitle sx={{ mt: 1 }}>This {period.toLowerCase()}</SectionTitle>
          <Box sx={{ display: "flex", gap: "6px", flexWrap: "wrap", mb: 2.25 }}>
            {periods.map((p) => (
              <Box
                key={p}
                component="button"
                type="button"
                onClick={() => setPeriod(p)}
                aria-pressed={period === p}
                sx={{
                  background: period === p ? "var(--c1)" : "transparent",
                  color: period === p ? "#fff" : "var(--text-main)",
                  border: "1px solid",
                  borderColor: period === p ? "var(--c1)" : "var(--border-main)",
                  font: "inherit",
                  fontSize: "0.82rem",
                  py: "5px",
                  px: "10px",
                  borderRadius: "999px",
                  cursor: "pointer"
                }}>
                {Locale.label("donations.period." + p.toLowerCase()) || p}
              </Box>
            ))}
          </Box>
          <ReportWithFilter keyName={reportKeyName} autoRun={true} />
        </>
      ) : (
        <>
          <SectionTitle sx={{ mt: 1 }}>{Locale.label("donations.tabs.lapsedGivers")}</SectionTitle>
          <ReportWithFilter keyName="lapsedGivers" autoRun={true} />
        </>
      )}
    </Box>
  );
};
