import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Locale, Permissions } from "@churchapps/apphelper";
import { Box, Skeleton, Stack } from "@mui/material";
import { ReportWithFilter } from "../components/reporting/ReportWithFilter";
import { type ReportInterface } from "@churchapps/helpers";
import { useRequirePermission } from "../hooks";
import { DirectoryPage } from "./components/plate";

export const ReportPage = () => {
  const params = useParams();
  const reportQuery = useQuery<ReportInterface>({ queryKey: ["/reports/" + params.keyName, "ReportingApi"], enabled: !!params.keyName });
  const report = reportQuery.data;
  const loading = reportQuery.isLoading;

  const denied = useRequirePermission(Permissions.membershipApi.server.admin);
  if (denied) return denied;

  return (
    <DirectoryPage
      title={report?.displayName || Locale.label("serverAdmin.reportPage.report")}
      lede={!loading && report?.description ? report.description : Locale.label("serverAdmin.reportPage.adminOnly")}
      wide>
      {loading ? (
        <Box sx={{ py: 2 }}>
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
    </DirectoryPage>
  );
};
