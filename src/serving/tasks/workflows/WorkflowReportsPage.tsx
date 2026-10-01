import React from "react";
import { Grid, Typography } from "@mui/material";
import { ArrowBack as BackIcon } from "@mui/icons-material";
import { Chart } from "react-google-charts";
import { Locale, Loading } from "@churchapps/apphelper";
import { Link as RouterLink, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { HeaderTextButton, PageContainer, PageHeader, Surface } from "../../../components/ui";
import { type WorkflowStepInterface } from "@churchapps/helpers";

interface ReportData {
  stepCounts: { stepId: string; count: number }[];
  overdue: any[];
  throughput: { day: string; count: number }[];
}

export const WorkflowReportsPage = () => {
  const params = useParams();
  const workflowId = params.id;

  const report = useQuery<ReportData>({ queryKey: ["/workflows/" + workflowId + "/report", "DoingApi"], enabled: !!workflowId });
  const steps = useQuery<WorkflowStepInterface[]>({ queryKey: ["/workflowSteps/workflow/" + workflowId, "DoingApi"], enabled: !!workflowId, placeholderData: [] });

  const stepName = (id: string) => steps.data?.find((s) => s.id === id)?.name || Locale.label("tasks.workflowBoard.unassigned");

  const perStepData = () => {
    const rows: any[] = [[Locale.label("tasks.workflowBoard.step"), Locale.label("tasks.workflowReports.perStep")]];
    (report.data?.stepCounts || []).forEach((sc) => rows.push([stepName(sc.stepId), Number(sc.count)]));
    return rows;
  };

  const throughputData = () => {
    const rows: any[] = [[Locale.label("tasks.workflowReports.throughput"), Locale.label("tasks.workflowReports.throughput")]];
    (report.data?.throughput || []).forEach((t) => rows.push([String(t.day), Number(t.count)]));
    return rows;
  };

  if (report.isLoading) return <Loading />;

  const chartPanel = (title: string, hasData: boolean, chart: () => React.ReactNode) => (
    <Surface sx={{ height: "100%" }}>
      <Typography variant="h3" component="h2" sx={{ mb: 2 }}>{title}</Typography>
      {hasData ? chart() : <Typography variant="body2" color="text.secondary">{Locale.label("tasks.workflowReports.noData")}</Typography>}
    </Surface>
  );

  return (
    <>
      <PageHeader title={Locale.label("tasks.workflowReports.title")} subtitle={Locale.label("tasks.workflowReports.subtitle")}>
        <HeaderTextButton component={RouterLink} to={"/serving/tasks/workflows/" + workflowId} startIcon={<BackIcon />} data-testid="workflow-reports-back">{Locale.label("common.back")}</HeaderTextButton>
      </PageHeader>
      <PageContainer>
        <Grid container spacing={3} data-testid="workflow-reports">
          <Grid size={{ xs: 12, md: 4, lg: 3 }}>
            <Surface sx={{ height: "100%" }}>
              <Typography variant="h3" component="h2" sx={{ mb: 1 }}>{Locale.label("tasks.workflowReports.overdue")}</Typography>
              <Typography variant="h1" component="p" color={report.data?.overdue?.length ? "error" : "text.primary"} sx={{ fontSize: 48, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }} data-testid="report-overdue-count">{report.data?.overdue?.length || 0}</Typography>
            </Surface>
          </Grid>
          <Grid size={{ xs: 12, md: 8, lg: 9 }}>
            {chartPanel(Locale.label("tasks.workflowReports.perStep"), (report.data?.stepCounts?.length || 0) > 0, () => <Chart chartType="ColumnChart" data={perStepData()} width="100%" height="300px" />)}
          </Grid>
          <Grid size={12}>
            {chartPanel(Locale.label("tasks.workflowReports.throughput"), (report.data?.throughput?.length || 0) > 0, () => <Chart chartType="LineChart" data={throughputData()} width="100%" height="300px" />)}
          </Grid>
        </Grid>
      </PageContainer>
    </>
  );
};
