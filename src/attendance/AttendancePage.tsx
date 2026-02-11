import React from "react";
import { Grid, Icon, Box, Card, CardContent, Container, Stack, Typography } from "@mui/material";
import { CalendarMonth as CalendarIcon, Group as GroupIcon } from "@mui/icons-material";
import { Locale, ApiHelper, PageHeader } from "@churchapps/apphelper";
import { AttendanceSetup } from "./components/AttendanceSetup";
import { AttendanceNavigation } from "./components/AttendanceNavigation";
import { ReportWithFilter } from "../components/reporting";

export const AttendancePage = () => {
  const [selectedTab, setSelectedTab] = React.useState("setup");
  const [stats, setStats] = React.useState({
    campuses: 0,
    serviceTimes: 0,
    scheduledGroups: 0,
    unscheduledGroups: 0,
    totalGroups: 0
  });

  const getCurrentTab = () => {
    let currentTab = null;
    switch (selectedTab) {
      case "setup": currentTab = <AttendanceSetup />; break;
      case "attendance": currentTab = <ReportWithFilter keyName="attendanceTrend" autoRun={true} />; break;
      case "groups": currentTab = <ReportWithFilter keyName="groupAttendance" autoRun={true} />; break;
    }
    return currentTab;
  };

  const loadStats = React.useCallback(async () => {
    try {
      const [attendanceData, groupsData, groupServiceTimes] = await Promise.all([
        ApiHelper.get("/attendancerecords/tree", "AttendanceApi"),
        ApiHelper.get("/groups", "MembershipApi"),
        ApiHelper.get("/groupservicetimes", "AttendanceApi")
      ]);

      const campuses = new Set();
      let serviceTimes = 0;

      attendanceData.forEach((a: any) => {
        if (a.campus?.name) campuses.add(a.campus.name);
        if (a.serviceTime) serviceTimes++;
      });

      const trackingGroups = groupsData.filter((g: any) => g.trackAttendance);
      const assignedGroupIds = new Set(groupServiceTimes.map((gst: any) => gst.groupId));
      const scheduledGroups = trackingGroups.filter((g: any) => assignedGroupIds.has(g.id)).length;
      const unscheduledGroups = trackingGroups.filter((g: any) => !assignedGroupIds.has(g.id)).length;

      setStats({
        campuses: campuses.size,
        serviceTimes,
        scheduledGroups,
        unscheduledGroups,
        totalGroups: groupsData.length
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  }, []);

  React.useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <>
      <PageHeader
        icon={<CalendarIcon />}
        title={Locale.label("attendance.attendancePage.att")}
        subtitle={Locale.label("attendance.attendancePage.subtitle")}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={{ xs: 2, sm: 2, md: 4 }}
          sx={{
            position: { xs: "static", md: "absolute" },
            left: { md: "50%" },
            top: { md: "50%" },
            transform: { md: "translateY(-50%)" },
            right: { md: "24px" },
            justifyContent: { md: "space-between" },
            flexWrap: "wrap"
          }}
        >
          <Stack spacing={0.5} alignItems="center" sx={{ minWidth: 80 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Icon sx={{ color: "#FFF", fontSize: 24 }}>church</Icon>
              <Typography variant="h5" sx={{ color: "#FFF", fontWeight: 700 }}>{stats.campuses}</Typography>
            </Stack>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.5 }}>{Locale.label("attendance.attendancePage.campuses")}</Typography>
          </Stack>
          <Stack spacing={0.5} alignItems="center" sx={{ minWidth: 80 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <CalendarIcon sx={{ color: "#FFF", fontSize: 24 }} />
              <Typography variant="h5" sx={{ color: "#FFF", fontWeight: 700 }}>{stats.serviceTimes}</Typography>
            </Stack>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.5 }}>{Locale.label("attendance.attendancePage.services")}</Typography>
          </Stack>
          <Stack spacing={0.5} alignItems="center" sx={{ minWidth: 80 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Icon sx={{ color: "#FFF", fontSize: 24 }}>schedule</Icon>
              <Typography variant="h5" sx={{ color: "#FFF", fontWeight: 700 }}>{stats.scheduledGroups}</Typography>
            </Stack>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.5 }}>{Locale.label("attendance.attendancePage.scheduled")}</Typography>
          </Stack>
          <Stack spacing={0.5} alignItems="center" sx={{ minWidth: 80 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Icon sx={{ color: "#FFF", fontSize: 24 }}>groups</Icon>
              <Typography variant="h5" sx={{ color: "#FFF", fontWeight: 700 }}>{stats.unscheduledGroups}</Typography>
            </Stack>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.5 }}>{Locale.label("attendance.attendancePage.unscheduled")}</Typography>
          </Stack>
          <Stack spacing={0.5} alignItems="center" sx={{ minWidth: 80 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <GroupIcon sx={{ color: "#FFF", fontSize: 24 }} />
              <Typography variant="h5" sx={{ color: "#FFF", fontWeight: 700 }}>{stats.totalGroups}</Typography>
            </Stack>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.5 }}>{Locale.label("attendance.attendancePage.totalGroups")}</Typography>
          </Stack>
        </Stack>
      </PageHeader>
      <AttendanceNavigation selectedTab={selectedTab} onTabChange={setSelectedTab} />

      {/* Main Content */}
      <Container maxWidth="xl">
        <Box sx={{ py: 3 }}>
          <Grid container spacing={3}>
            <Grid size={12}>
              {selectedTab === "setup" ? (
                <Card sx={{ borderRadius: 2, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
                  <CardContent sx={{ p: 0 }}>{getCurrentTab()}</CardContent>
                </Card>
              ) : (
                getCurrentTab()
              )}
            </Grid>
          </Grid>
        </Box>
      </Container>
    </>
  );
};
