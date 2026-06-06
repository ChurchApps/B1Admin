import { Box, Card, CardContent, Typography, Grid } from "@mui/material";
import React from "react";
import { Chart } from "react-google-charts";
import { Locale, Loading, PageHeader } from "@churchapps/apphelper";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowBack as BackIcon } from "@mui/icons-material";
import { Button } from "@mui/material";
import { type WorkflowStepInterface } from "@churchapps/helpers";

interface ReportData {
  stepCounts: { stepId: string; count: number }[];
  overdue: any[];
  throughput: { day: string; count: number }[];
}

export const WorkflowReportsPage = () => {
  const params = useParams();
  const navigate = useNavigate();
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

  return (
    <>
      <PageHeader title={Locale.label("tasks.workflowReports.title")} subtitle={Locale.label("tasks.workflowReports.subtitle")}>
        <Button variant="outlined" startIcon={<BackIcon />} onClick={() => navigate("/serving/tasks/workflows/" + workflowId)} sx={{ color: "#FFF", borderColor: "rgba(255,255,255,0.5)" }}>{Locale.label("common.back")}</Button>
      </PageHeader>
      <Box sx={{ p: 3 }} data-testid="workflow-reports">
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ borderRadius: 2 }}><CardContent>
              <Typography variant="overline" color="text.secondary">{Locale.label("tasks.workflowReports.overdue")}</Typography>
              <Typography variant="h3" color="error" data-testid="report-overdue-count">{report.data?.overdue?.length || 0}</Typography>
            </CardContent></Card>
          </Grid>
          <Grid size={{ xs: 12, md: 8 }}>
            <Card sx={{ borderRadius: 2 }}><CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>{Locale.label("tasks.workflowReports.perStep")}</Typography>
              {(report.data?.stepCounts?.length || 0) > 0
                ? <Chart chartType="ColumnChart" data={perStepData()} width="100%" height="300px" />
                : <Typography color="text.secondary">{Locale.label("tasks.workflowReports.noData")}</Typography>}
            </CardContent></Card>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Card sx={{ borderRadius: 2 }}><CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>{Locale.label("tasks.workflowReports.throughput")}</Typography>
              {(report.data?.throughput?.length || 0) > 0
                ? <Chart chartType="LineChart" data={throughputData()} width="100%" height="300px" />
                : <Typography color="text.secondary">{Locale.label("tasks.workflowReports.noData")}</Typography>}
            </CardContent></Card>
          </Grid>
        </Grid>
      </Box>
    </>
  );
};
