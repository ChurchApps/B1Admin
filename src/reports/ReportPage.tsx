import { memo } from "react";
import { useParams } from "react-router-dom";
import { Locale } from "@churchapps/apphelper";
import { Box, Skeleton, Stack } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { ReportWithFilter } from "../components/reporting/ReportWithFilter";
import { type ReportInterface } from "@churchapps/helpers";
import { Plate, Record, h1Sx, ledeSx } from "./plated";

export const ReportPage = memo(() => {
  const params = useParams();

  const report = useQuery<ReportInterface>({
    queryKey: ["/reports/" + params.keyName, "ReportingApi"],
    enabled: !!params.keyName
  });

  return (
    <Plate>
      <Record
        who={(
          <>
            <Box component="h1" sx={h1Sx}>{report.data?.displayName || Locale.label("reports.reportPage.report")}</Box>
            {report.data?.description && <Box sx={ledeSx}>{report.data.description}</Box>}
          </>
        )}
        rest={(
          report.isLoading ? (
            <Stack spacing={3}>
              <Skeleton variant="rectangular" height={60} />
              <Skeleton variant="rectangular" height={200} />
            </Stack>
          ) : (
            <Box sx={{ "& .report-container": { p: 0 } }}>
              <ReportWithFilter keyName={params.keyName || ""} autoRun={false} />
            </Box>
          )
        )}
      />
    </Plate>
  );
});
