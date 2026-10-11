import { Loading, Locale } from "@churchapps/apphelper";
import { Box, Grid, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { type ReportInterface } from "@churchapps/helpers";
import { ReportOutput } from "../../components/reporting/ReportOutput";
import { SettingsPanel } from "../../settings/components/SettingsPanel";

export const UsageTrendsTab = () => {
  const report = useQuery<ReportInterface>({ queryKey: ["/reports/usageTrends", "ReportingApi"] });

  return (
    <Grid container spacing={3} alignItems="flex-start">
      <Grid size={{ xs: 12, lg: 8 }}>
        {report.data ? <ReportOutput keyName="usageTrends" report={report.data} /> : <Loading />}
      </Grid>
      <Grid size={{ xs: 12, lg: 4 }}>
        <SettingsPanel headerText={Locale.label("serverAdmin.adminPage.valueNotes")}>
          <Typography variant="h3" component="h3" sx={{ mb: 1 }}>{Locale.label("serverAdmin.adminPage.notes")}</Typography>
          <Box component="ul" sx={{ m: 0, pl: 3, typography: "body2", "& li": { mb: 1 } }}>
            <li key="b1admin">
              <b>B1Admin</b> - {Locale.label("serverAdmin.adminPage.noteOne")}
            </li>
            <li key="b1">
              <b>B1</b> - {Locale.label("serverAdmin.adminPage.noteTwo")}
            </li>
            <li key="lessons">
              <b>Lessons</b> - {Locale.label("serverAdmin.adminPage.noteThree")}
            </li>
            <li key="freeshow">
              <b>FreeShow</b> - {Locale.label("serverAdmin.adminPage.noteFour")}
            </li>
          </Box>
        </SettingsPanel>
      </Grid>
    </Grid>
  );
};
