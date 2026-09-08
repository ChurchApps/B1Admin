import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Chart } from "react-google-charts";
import { Box, Card, CardContent, Grid, Typography, useTheme } from "@mui/material";
import { Loading, Locale, UserHelper, Permissions } from "@churchapps/apphelper";
import { type GroupInterface } from "@churchapps/helpers";
import { AgeChart } from "../../people/demographics/components/AgeChart";
import { DonutChart } from "../../people/demographics/components/DonutChart";
import { getChartTheme, CHART_PALETTE } from "../../people/demographics/components/chartTheme";

interface GroupHealthData {
  memberCount: number;
  averageAge: number | null;
  joins90: number;
  leaves90: number;
  churnRate90: number;
  monthly: { month: string; joins: number; leaves: number }[];
  demographics: {
    gender: { name: string; count: number }[];
    ageGroups: { group: string; female: number; male: number; unassigned: number }[];
  };
}

interface Props {
  group: GroupInterface;
}

const StatCard = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div style={{ fontSize: "1.6rem", fontWeight: 500, letterSpacing: "-0.02em" }}>{value}</div>
    <div className="og-muted">{label}</div>
  </div>
);

export const GroupHealthTab = (props: Props) => {
  const theme = useTheme();
  const chartTheme = getChartTheme(theme.palette.mode === "dark");

  const health = useQuery<GroupHealthData>({
    queryKey: [`/groups/${props.group.id}/health`, "MembershipApi"],
    enabled: !!props.group?.id
  });

  const canViewAttendance = UserHelper.checkAccess(Permissions.attendanceApi.attendance.viewSummary);
  const trend = useQuery<{ week: string; visits: number }[]>({
    queryKey: [`/attendancerecords/trend?campusId=0&serviceId=0&serviceTimeId=0&groupId=${props.group.id}`, "AttendanceApi"],
    enabled: !!props.group?.id && !!props.group?.trackAttendance && canViewAttendance
  });

  if (health.isLoading) return <Loading />;
  const data = health.data;
  if (!data) return null;

  const monthlyData: any[] = [[Locale.label("groups.groupHealth.month"), Locale.label("groups.groupHealth.joined"), Locale.label("groups.groupHealth.left")]];
  data.monthly?.forEach((m) => monthlyData.push([m.month, m.joins, m.leaves]));
  const hasChanges = data.monthly?.some((m) => m.joins > 0 || m.leaves > 0);

  const trendData: any[] = [[Locale.label("groups.groupHealth.week"), Locale.label("groups.groupHealth.attendance")]];
  (trend.data || []).forEach((r) => trendData.push([new Date(r.week).toLocaleDateString(), Number(r.visits)]));

  const chartOptions = {
    legend: { position: "bottom", textStyle: chartTheme.textStyle },
    backgroundColor: chartTheme.backgroundColor,
    colors: CHART_PALETTE,
    chartArea: { width: "85%", height: "70%" },
    hAxis: { textStyle: chartTheme.textStyle },
    vAxis: { textStyle: chartTheme.textStyle, gridlines: { color: chartTheme.gridColor }, baselineColor: chartTheme.baselineColor, minValue: 0 }
  };

  return (
    <Box data-testid="group-health-tab">
      <Grid container spacing={3}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label={Locale.label("groups.groupHealth.members")} value={data.memberCount.toString()} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label={Locale.label("groups.groupHealth.joined90")} value={data.joins90.toString()} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label={Locale.label("groups.groupHealth.left90")} value={data.leaves90.toString()} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label={Locale.label("groups.groupHealth.churn90")} value={`${data.churnRate90}%`} />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>{Locale.label("groups.groupHealth.membershipChanges")}</Typography>
              {hasChanges ? (
                <Chart chartType="ColumnChart" data={monthlyData} width="100%" height="320px" options={{ ...chartOptions, colors: [CHART_PALETTE[2], CHART_PALETTE[1]] }} />
              ) : (
                <Typography color="text.secondary">{Locale.label("people.demographics.noData")}</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {props.group?.trackAttendance && canViewAttendance && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>{Locale.label("groups.groupHealth.attendanceTrend")}</Typography>
                {trendData.length > 1 ? (
                  <Chart chartType="LineChart" data={trendData} width="100%" height="320px" options={{ ...chartOptions, legend: { position: "none" } }} />
                ) : (
                  <Typography color="text.secondary">{Locale.label("people.demographics.noData")}</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}

        <Grid size={{ xs: 12, md: 6 }}>
          <AgeChart title={Locale.label("people.demographics.age")} data={data.demographics?.ageGroups || []} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <DonutChart title={Locale.label("people.demographics.gender")} data={data.demographics?.gender || []} />
        </Grid>
      </Grid>
    </Box>
  );
};
