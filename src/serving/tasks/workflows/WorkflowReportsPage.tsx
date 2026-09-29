import React from "react";
import { Box, Stack, Typography } from "@mui/material";
import { Chart } from "react-google-charts";
import { Locale, Loading } from "@churchapps/apphelper";
import { Link as RouterLink, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageContainer, PageHeader, RecordHeading, Surface, TextAction, VerbRow } from "../../../components/ui";
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

  const section = (title: string, hasData: boolean, chart: () => React.ReactNode) => (
    <Box component="section">
      <RecordHeading label={title} />
      {hasData ? chart() : <Typography variant="body2" color="text.secondary">{Locale.label("tasks.workflowReports.noData")}</Typography>}
    </Box>
  );

  return (
    <>
      <PageHeader title={Locale.label("tasks.workflowReports.title")} subtitle={Locale.label("tasks.workflowReports.subtitle")} />
      <PageContainer>
        <Surface sx={{ maxWidth: 960 }}>
          <Stack spacing={4} data-testid="workflow-reports">
            <VerbRow>
              <TextAction to={"/serving/tasks/workflows/" + workflowId} component={RouterLink} data-testid="workflow-reports-back">{"← " + Locale.label("common.back")}</TextAction>
            </VerbRow>
            <Box component="section">
              <RecordHeading label={Locale.label("tasks.workflowReports.overdue")} />
              <Typography variant="h1" component="p" color="error" sx={{ fontVariantNumeric: "tabular-nums" }} data-testid="report-overdue-count">{report.data?.overdue?.length || 0}</Typography>
            </Box>
            {section(Locale.label("tasks.workflowReports.perStep"), (report.data?.stepCounts?.length || 0) > 0, () => <Chart chartType="ColumnChart" data={perStepData()} width="100%" height="300px" />)}
            {section(Locale.label("tasks.workflowReports.throughput"), (report.data?.throughput?.length || 0) > 0, () => <Chart chartType="LineChart" data={throughputData()} width="100%" height="300px" />)}
          </Stack>
        </Surface>
      </PageContainer>
    </>
  );
};
