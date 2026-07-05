import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Locale, PageHeader, Permissions } from "@churchapps/apphelper";
import { BarChart as BarChartIcon } from "@mui/icons-material";
import { Box, Container, Card, CardContent, Skeleton, Chip, Stack } from "@mui/material";
import { ReportWithFilter } from "../components/reporting/ReportWithFilter";
import { type ReportInterface } from "@churchapps/helpers";
import { useRequirePermission } from "../hooks";

export const ReportPage = () => {
  const params = useParams();
  const reportQuery = useQuery<ReportInterface>({ queryKey: ["/reports/" + params.keyName, "ReportingApi"], enabled: !!params.keyName });
  const report = reportQuery.data;
  const loading = reportQuery.isLoading;

  const denied = useRequirePermission(Permissions.membershipApi.server.admin);
  if (denied) return denied;

  return (
    <>
      <PageHeader
        icon={<BarChartIcon />}
        title={report?.displayName || Locale.label("serverAdmin.reportPage.report")}
        subtitle={!loading && report?.description ? report.description : undefined}>
        <Chip
          label={Locale.label("serverAdmin.reportPage.adminOnly")}
          size="small"
          color="error"
          sx={{
            fontWeight: 600,
            fontSize: "0.75rem",
            backgroundColor: "#FFF",
            color: "error.main"
          }}
        />
      </PageHeader>

      <Container maxWidth="xl">
        <Box sx={{ py: 3 }}>
          <Card
            elevation={2}
            sx={{
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              minHeight: 400
            }}>
            <CardContent sx={{ p: 0 }}>
              {loading ? (
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
};
