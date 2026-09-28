import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Locale, Permissions } from "@churchapps/apphelper";
import { Box, Container, Card, CardContent, Skeleton, Chip, Stack } from "@mui/material";
import { ReportWithFilter } from "../components/reporting/ReportWithFilter";
import { type ReportInterface } from "@churchapps/helpers";
import { useRequirePermission } from "../hooks";
import { SettingsPage } from "../settings/components/SettingsPage";
import { SettingsHeader } from "../settings/components/SettingsHeader";

export const ReportPage = () => {
  const params = useParams();
  const reportQuery = useQuery<ReportInterface>({ queryKey: ["/reports/" + params.keyName, "ReportingApi"], enabled: !!params.keyName });
  const report = reportQuery.data;
  const loading = reportQuery.isLoading;

  const denied = useRequirePermission(Permissions.membershipApi.server.admin);
  if (denied) return denied;

  return (
    <SettingsPage>
      <SettingsHeader
        backTo="/admin" backLabel={Locale.label("serverAdmin.adminPage.servAdmin")}
        title={report?.displayName || Locale.label("serverAdmin.reportPage.report")}
        subtitle={!loading && report?.description ? report.description : undefined}>
        <Chip label={Locale.label("serverAdmin.reportPage.adminOnly")} size="small" color="error" variant="outlined" />
      </SettingsHeader>

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
                  <ReportWithFilter keyName={params.keyName || ""} autoRun={false} />
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      </Container>
    </SettingsPage>
  );
};
