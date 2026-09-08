import { Box } from "@mui/material";
import { Chart } from "react-google-charts";
import { Locale, Loading } from "@churchapps/apphelper";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { type WorkflowStepInterface } from "@churchapps/helpers";
import { DirectoryPage, SectionLabel, Verb, Verbs, platedColor } from "../../plated";

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
    <DirectoryPage title={Locale.label("tasks.workflowReports.title")} lede={Locale.label("tasks.workflowReports.subtitle")} wide>
      <Verbs>
        <Verb onClick={() => navigate("/serving/tasks/workflows/" + workflowId)}>{Locale.label("common.back")}</Verb>
      </Verbs>
      <Box data-testid="workflow-reports">
        <SectionLabel sx={{ mt: 0 }}>{Locale.label("tasks.workflowReports.overdue")}</SectionLabel>
        <Box data-testid="report-overdue-count" sx={{ fontSize: "2.2rem", fontWeight: 500, color: platedColor.first, letterSpacing: "-0.03em" }}>
          {report.data?.overdue?.length || 0}
        </Box>
        <SectionLabel>{Locale.label("tasks.workflowReports.perStep")}</SectionLabel>
        {(report.data?.stepCounts?.length || 0) > 0
          ? <Chart chartType="ColumnChart" data={perStepData()} width="100%" height="300px" />
          : <p style={{ color: platedColor.mute }}>{Locale.label("tasks.workflowReports.noData")}</p>}
        <SectionLabel>{Locale.label("tasks.workflowReports.throughput")}</SectionLabel>
        {(report.data?.throughput?.length || 0) > 0
          ? <Chart chartType="LineChart" data={throughputData()} width="100%" height="300px" />
          : <p style={{ color: platedColor.mute }}>{Locale.label("tasks.workflowReports.noData")}</p>}
      </Box>
    </DirectoryPage>
  );
};
