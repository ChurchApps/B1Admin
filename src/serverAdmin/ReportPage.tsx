import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Locale, Permissions } from "@churchapps/apphelper";
import { Box, Skeleton, Stack } from "@mui/material";
import { ReportWithFilter } from "../components/reporting/ReportWithFilter";
import { type ReportInterface } from "@churchapps/helpers";
import { useRequirePermission } from "../hooks";
import { PageContainer, PageHeader, StatusBadge, Surface, TextAction } from "../components/ui";

export const ReportPage = () => {
  const params = useParams();
  const reportQuery = useQuery<ReportInterface>({ queryKey: ["/reports/" + params.keyName, "ReportingApi"], enabled: !!params.keyName });
  const report = reportQuery.data;
  const loading = reportQuery.isLoading;

  const denied = useRequirePermission(Permissions.membershipApi.server.admin);
  if (denied) return denied;

  const title = report?.displayName || Locale.label("serverAdmin.reportPage.report");

  return (
    <>
      <PageHeader
        title={title}
        subtitle={!loading && report?.description ? report.description : undefined}
        breadcrumbs={<TextAction small to="/admin" component={Link} data-testid="report-back-to-admin">{"← " + Locale.label("common.backTo", "Back to {name}").replace("{name}", Locale.label("serverAdmin.adminPage.servAdmin"))}</TextAction>}
        chips={<StatusBadge tone="danger">{Locale.label("serverAdmin.reportPage.adminOnly")}</StatusBadge>}
      />
      <PageContainer>
        <Surface disablePadding sx={{ minHeight: 400 }}>
          {loading ? (
            <Box sx={{ p: 3 }}>
              <Stack spacing={3}>
                <Skeleton variant="rectangular" height={60} />
                <Skeleton variant="rectangular" height={200} />
              </Stack>
            </Box>
          ) : (
            <Box sx={{ "& .report-container": { p: 0 } }}>
              <ReportWithFilter keyName={params.keyName || ""} autoRun={false} />
            </Box>
          )}
        </Surface>
      </PageContainer>
    </>
  );
};
