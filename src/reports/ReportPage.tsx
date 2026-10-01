import { memo } from "react";
import { useParams } from "react-router-dom";
import { Locale } from "@churchapps/apphelper";
import { BarChart as BarChartIcon } from "@mui/icons-material";
import { Skeleton, Stack } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { PageContainer, PageHeader, Surface } from "../components/ui";
import { ReportWithFilter } from "../components/reporting/ReportWithFilter";
import { type ReportInterface } from "@churchapps/helpers";

export const ReportPage = memo(() => {
  const params = useParams();

  const report = useQuery<ReportInterface>({
    queryKey: ["/reports/" + params.keyName, "ReportingApi"],
    enabled: !!params.keyName
  });

  return (
    <>
      <PageHeader
        icon={<BarChartIcon />}
        title={report.data?.displayName || Locale.label("reports.reportPage.report")}
        subtitle={!report.isLoading && report.data?.description ? report.data.description : undefined}
      />

      <PageContainer>
        {report.isLoading ? (
          <Surface sx={{ minHeight: 400 }}>
            <Stack spacing={3}>
              <Skeleton variant="rectangular" height={60} />
              <Skeleton variant="rectangular" height={200} />
              <Stack direction="row" spacing={2}>
                <Skeleton variant="rectangular" width={120} height={40} />
                <Skeleton variant="rectangular" width={120} height={40} />
              </Stack>
            </Stack>
          </Surface>
        ) : (
          <ReportWithFilter keyName={params.keyName || ""} autoRun={false} />
        )}
      </PageContainer>
    </>
  );
});
