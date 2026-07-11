import { useQuery } from "@tanstack/react-query";
import { DisplayBox, DateHelper, Locale } from "@churchapps/apphelper";
import { Box, Chip, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";

interface JobRun {
  id: string;
  jobName: string;
  status: string;
  startedAt: string;
  durationMs?: number;
  errorMessage?: string;
}

interface JobsResponse {
  latest: JobRun[];
  recentFailures: JobRun[];
}

export const JobsTab = () => {
  const { data, isLoading: loading } = useQuery<JobsResponse>({ queryKey: ["/serverHealth/jobs", "MembershipApi"] });

  const prettyDate = (value?: string) => (value ? DateHelper.prettyDateTime(DateHelper.toDate(value)) : "-");
  const prettyDuration = (ms?: number) => (ms === null || ms === undefined ? "-" : ms < 1000 ? ms + "ms" : (ms / 1000).toFixed(1) + "s");

  const statusChip = (run: JobRun) => (
    <Chip label={run.status === "success" ? Locale.label("serverAdmin.jobsTab.success") : Locale.label("serverAdmin.jobsTab.failed")} size="small" color={run.status === "success" ? "success" : "error"} />
  );

  return (
    <DisplayBox headerIcon="schedule" headerText={Locale.label("serverAdmin.jobsTab.title")}>
      {loading && <Typography>{Locale.label("common.loading")}</Typography>}
      {!loading && !data && <Typography color="error">{Locale.label("serverAdmin.jobsTab.loadError")}</Typography>}
      {!loading && data && (
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">{Locale.label("serverAdmin.jobsTab.subtitle")}</Typography>
          {data.latest.length === 0 ? (
            <Typography>{Locale.label("serverAdmin.jobsTab.noRuns")}</Typography>
          ) : (
            <Paper sx={{ width: "100%", overflowX: "auto" }}>
              <Table size="small" id="adminJobsTable">
                <TableHead>
                  <TableRow>
                    <TableCell>{Locale.label("serverAdmin.jobsTab.job")}</TableCell>
                    <TableCell>{Locale.label("serverAdmin.serverHealth.status")}</TableCell>
                    <TableCell>{Locale.label("serverAdmin.jobsTab.lastRun")}</TableCell>
                    <TableCell>{Locale.label("serverAdmin.jobsTab.duration")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.latest.map((run) => (
                    <TableRow key={run.jobName}>
                      <TableCell>{run.jobName}</TableCell>
                      <TableCell>{statusChip(run)}</TableCell>
                      <TableCell>{prettyDate(run.startedAt)}</TableCell>
                      <TableCell>{prettyDuration(run.durationMs)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )}
          {data.recentFailures.length > 0 && (
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>{Locale.label("serverAdmin.jobsTab.recentFailures")}</Typography>
              <Stack spacing={1}>
                {data.recentFailures.map((run) => (
                  <Paper key={run.id} sx={{ p: 1.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {run.jobName} — {prettyDate(run.startedAt)}
                    </Typography>
                    <Typography variant="caption" component="pre" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word", color: "text.secondary", m: 0 }}>
                      {run.errorMessage}
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            </Box>
          )}
        </Stack>
      )}
    </DisplayBox>
  );
};
