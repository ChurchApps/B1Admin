import React, { memo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { type SearchCondition } from "@churchapps/helpers";
import { Box, Grid } from "@mui/material";
import { BarChart as BarChartIcon } from "@mui/icons-material";
import { Loading, Locale, PageHeader } from "@churchapps/apphelper";
import { AgeChart } from "./components/AgeChart";
import { DonutChart } from "./components/DonutChart";

interface DemographicsData {
  total: number;
  ageGroups: { group: string; female: number; male: number; unassigned: number }[];
  membershipStatus: { name: string; count: number }[];
  gender: { name: string; count: number }[];
  maritalStatus: { name: string; count: number }[];
}

export const DemographicsPage = memo(() => {
  const query = useQuery<DemographicsData>({ queryKey: ["/people/demographics", "MembershipApi"] });
  const data = query.data;
  const navigate = useNavigate();

  const valueFor = (name: string) => (name === "Unassigned" ? "" : name);

  const drillTo = useCallback((conditions: SearchCondition[]) => {
    navigate("/people", { state: { searchConditions: conditions } });
  }, [navigate]);

  const drillToField = (field: string) => (name: string) => drillTo([{ field, operator: "equals", value: valueFor(name) }]);

  const drillToAge = (group: string, series: "female" | "male" | "unassigned") => {
    const conditions: SearchCondition[] = [];
    if (group.endsWith("+")) {
      conditions.push({ field: "age", operator: "greaterThanEqual", value: group.replace("+", "") });
    } else {
      const [min, max] = group.split("-");
      conditions.push({ field: "age", operator: "greaterThanEqual", value: min });
      conditions.push({ field: "age", operator: "lessThanEqual", value: max });
    }
    const gender = series === "female" ? "Female" : series === "male" ? "Male" : "";
    conditions.push({ field: "gender", operator: "equals", value: gender });
    drillTo(conditions);
  };

  return (
    <>
      <PageHeader
        title={Locale.label("people.demographics.title")}
        subtitle={data ? `${Locale.label("people.demographics.total")}: ${data.total.toLocaleString()}` : Locale.label("people.demographics.subtitle")}>
        <BarChartIcon sx={{ fontSize: 32, color: "rgba(255,255,255,0.8)", mr: 2 }} />
      </PageHeader>

      <Box sx={{ p: 3 }}>
        {query.isLoading ? (
          <Loading />
        ) : data ? (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <AgeChart title={Locale.label("people.demographics.age")} data={data.ageGroups} onSelect={drillToAge} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <DonutChart title={Locale.label("people.demographics.membershipStatus")} data={data.membershipStatus} onSelect={drillToField("membershipStatus")} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <DonutChart title={Locale.label("people.demographics.gender")} data={data.gender} onSelect={drillToField("gender")} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <DonutChart title={Locale.label("people.demographics.maritalStatus")} data={data.maritalStatus} onSelect={drillToField("maritalStatus")} />
            </Grid>
          </Grid>
        ) : null}
      </Box>
    </>
  );
});

DemographicsPage.displayName = "DemographicsPage";
