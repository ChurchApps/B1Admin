import React, { memo } from "react";
import { useQuery } from "@tanstack/react-query";
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
              <AgeChart title={Locale.label("people.demographics.age")} data={data.ageGroups} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <DonutChart title={Locale.label("people.demographics.membershipStatus")} data={data.membershipStatus} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <DonutChart title={Locale.label("people.demographics.gender")} data={data.gender} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <DonutChart title={Locale.label("people.demographics.maritalStatus")} data={data.maritalStatus} />
            </Grid>
          </Grid>
        ) : null}
      </Box>
    </>
  );
});

DemographicsPage.displayName = "DemographicsPage";
