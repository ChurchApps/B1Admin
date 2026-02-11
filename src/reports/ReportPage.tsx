import React, { memo } from "react";
import { useParams } from "react-router-dom";
import { Locale, PageHeader } from "@churchapps/apphelper";
import { Box, Container, Card, CardContent, Skeleton } from "@mui/material";
import { Summarize as SummarizeIcon, ArrowBack as BackIcon } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { ReportWithFilter } from "../components/reporting/ReportWithFilter";
import { type ReportInterface } from "@churchapps/helpers";

export const ReportPage = memo(() => {
  const params = useParams();

  const report = useQuery<ReportInterface>({
    queryKey: ["/reports/" + params.keyName, "ReportingApi"],
    placeholderData: null,
    enabled: !!params.keyName
  });

  return (
    <>
      <PageHeader
        icon={<SummarizeIcon />}
        title={report.isLoading ? <Skeleton width={300} /> : report.data?.displayName || Locale.label("reports.reportPage.report")}
        subtitle={!report.isLoading && report.data?.description ? report.data.description : undefined}
        breadcrumbs={[
          {
            href: "/reports",
            text: Locale.label("reports.reportsPage.reports"),
            icon: <BackIcon />
          }
        ]}
      />

      <Container maxWidth="xl">
        <Box sx={{ py: 3 }}>
          {/* Report Content */}
          <Card
            elevation={2}
            sx={{
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              minHeight: 400
            }}>
            <CardContent sx={{ p: 0 }}>
              {report.isLoading ? (
                <Box sx={{ p: 4 }}>
                  <Stack spacing={3}>
                    <Skeleton variant="rectangular" height={60} />
                    <Skeleton variant="rectangular" height={200} />
                    <Stack direction="row" spacing={2}>
                      <Skeleton variant="rectangular" width={120} height={40} />
                      <Skeleton variant="rectangular" width={120} height={40} />
                    </Stack>
                  </Stack>
                </Box>
              ) : (
                <Box sx={{ "& .report-container": { p: 0 } }}>
                  <ReportWithFilter keyName={params.keyName} autoRun={false} />
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      </Container>
    </>
  );
});
