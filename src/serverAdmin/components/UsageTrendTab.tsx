import { Locale } from "@churchapps/apphelper";
import { Box, Typography } from "@mui/material";
import { ReportWithFilter } from "../../components/reporting/ReportWithFilter";
import { SettingsPanel } from "../../settings/components/SettingsPanel";

export const UsageTrendsTab = () => (
  <>
    <ReportWithFilter keyName="usageTrends" autoRun={true} />
    <Box sx={{ mt: 3 }}>
      <SettingsPanel headerText={Locale.label("serverAdmin.adminPage.valueNotes")}>
        <Typography variant="h3" component="h3" sx={{ mb: 1 }}>{Locale.label("serverAdmin.adminPage.notes")}</Typography>
        <Box component="ul" sx={{ m: 0, pl: 3, "& li": { mb: 1 } }}>
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
    </Box>
  </>
);
