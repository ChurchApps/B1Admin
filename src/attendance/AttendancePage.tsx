import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import { Locale, ApiHelper, UserHelper, Permissions } from "@churchapps/apphelper";
import { AttendanceSetup } from "./components/AttendanceSetup";
import { HeadcountEntry } from "./components/HeadcountEntry";
import { AttendanceIdentity, ThisWeekSlice, type AttendanceView } from "./components/AttendancePlate";
import { ReportWithFilter } from "../components/reporting";
import { BackVerb, PageContainer, PillTabs, RecordLayout, TextAction, VerbRow, YearLedger, useRecordView } from "../components/ui";
import { KioskThemeEdit } from "../mobile/KioskThemeEdit";
import { useCampuses } from "../hooks/useCampuses";

const REPORTS: Record<string, string> = { attendance: "attendanceTrend", headcountTrend: "headcountTrend", groups: "groupAttendance" };

// Boxed editors and reports reused inside the record; the record is already the one surface.
const flatSliceSx = { "& .MuiPaper-root": { border: 0, boxShadow: "none", bgcolor: "transparent" }, "& .MuiPaper-root > .MuiCardContent-root, & .MuiPaper-root > .MuiBox-root": { px: 0 } } as const;

export const AttendancePage = () => {
  const { view: requestedView, setView, searchParams } = useRecordView("view");
  const campuses = useCampuses();
  const [stats, setStats] = React.useState({ serviceTimes: 0, scheduledGroups: 0, unscheduledGroups: 0, totalGroups: 0 });

  const canKiosk = UserHelper.checkAccess(Permissions.membershipApi.settings.edit) || UserHelper.checkAccess(Permissions.attendanceApi.attendance.edit);
  const canHeadcount = UserHelper.checkAccess(Permissions.attendanceApi.attendance.edit);
  const canYears = UserHelper.checkAccess(Permissions.attendanceApi.attendance.view);
  const allowed: Record<string, boolean> = { setup: true, kiosk: canKiosk, headcount: canHeadcount, years: canYears };
  const view = (allowed[requestedView] ? requestedView : "") as AttendanceView;
  const kind = REPORTS[searchParams.get("kind") || ""] ? searchParams.get("kind")! : "attendance";

  const loadStats = React.useCallback(async () => {
    try {
      const [attendanceData, groupsData, groupServiceTimes] = await Promise.all([
        ApiHelper.get("/attendancerecords/tree", "AttendanceApi"),
        ApiHelper.get("/groups", "MembershipApi"),
        ApiHelper.get("/groupservicetimes", "AttendanceApi")
      ]);
      const serviceTimes = attendanceData.filter((a: any) => a.serviceTime).length;
      const trackingGroups = groupsData.filter((g: any) => g.trackAttendance);
      const assignedGroupIds = new Set(groupServiceTimes.map((gst: any) => gst.groupId));
      setStats({
        serviceTimes,
        scheduledGroups: trackingGroups.filter((g: any) => assignedGroupIds.has(g.id)).length,
        unscheduledGroups: trackingGroups.filter((g: any) => !assignedGroupIds.has(g.id)).length,
        totalGroups: groupsData.length
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  }, []);

  React.useEffect(() => {
    if (view === "setup") loadStats();
  }, [view, loadStats]);

  const back = (
    <Box>
      <BackVerb name={Locale.label("attendance.attendancePage.att")} onClick={() => setView("")} data-testid="attendance-back" />
    </Box>
  );

  const setupStats = [
    { label: Locale.label("attendance.attendancePage.campuses"), value: campuses.length },
    { label: Locale.label("attendance.attendancePage.serviceTimes"), value: stats.serviceTimes },
    { label: Locale.label("attendance.attendancePage.scheduled"), value: stats.scheduledGroups },
    { label: Locale.label("attendance.attendancePage.unscheduled"), value: stats.unscheduledGroups },
    { label: Locale.label("attendance.attendancePage.totalGroups"), value: stats.totalGroups }
  ];

  const slice = () => {
    switch (view) {
      case "setup":
        return (
          <>
            {back}
            <VerbRow sx={{ typography: "body2" }}>
              {setupStats.map((st) => (
                <span key={st.label}><span>{st.label}</span> <Box component="strong" sx={{ color: "text.primary", fontVariantNumeric: "tabular-nums" }}>{st.value}</Box></span>
              ))}
            </VerbRow>
            <Box sx={flatSliceSx}><AttendanceSetup /></Box>
          </>
        );
      case "kiosk":
        return (
          <>
            {back}
            <Box sx={flatSliceSx}><KioskThemeEdit /></Box>
            <Typography variant="body2">
              <TextAction small to="/mobile/checkin" component={RouterLink}>{Locale.label("settings.checkinSettingsEdit.kioskLink")}</TextAction>
            </Typography>
          </>
        );
      case "headcount":
        return <>{back}<Box sx={flatSliceSx}><HeadcountEntry /></Box></>;
      case "years":
        return (
          <YearLedger
            title={Locale.label("attendance.plate.allYears", "All years")}
            summary={Locale.label("attendance.plate.yearsSummary", "Trends, headcounts and group attendance across every year. Use the filters to narrow the dates.")}
            years={[]}
            year={null}
            onYearChange={() => { /* the reports carry their own date filters */ }}
            back={<BackVerb name={Locale.label("attendance.attendancePage.att")} onClick={() => setView("")} data-testid="attendance-back" />}
            data-testid="attendance-years">
            <PillTabs
              tabs
              aria-label={Locale.label("attendance.plate.reports", "Reports")}
              value={kind}
              onChange={(k) => setView("years", { kind: k })}
              sx={{ mb: 3 }}
              options={[
                { value: "attendance", label: Locale.label("attendance.tabs.attTrend"), "data-testid": "attendance-tab-trend" },
                { value: "headcountTrend", label: Locale.label("attendance.tabs.headcountTrend"), "data-testid": "attendance-tab-headcount-trend" },
                { value: "groups", label: Locale.label("attendance.tabs.groupAtt"), "data-testid": "attendance-tab-groups" }
              ]}
            />
            <Box sx={flatSliceSx}><ReportWithFilter key={kind} keyName={REPORTS[kind]} autoRun={true} /></Box>
          </YearLedger>
        );
      default:
        return <ThisWeekSlice onView={setView} canYears={canYears} />;
    }
  };

  return (
    <PageContainer>
      <RecordLayout
        spacing={view ? 3 : 5}
        data-testid="attendance-record"
        identity={<AttendanceIdentity view={view} onView={setView} canSetup={allowed.setup} canKiosk={canKiosk} canHeadcount={canHeadcount} canYears={canYears} />}>
        {slice()}
      </RecordLayout>
    </PageContainer>
  );
};
