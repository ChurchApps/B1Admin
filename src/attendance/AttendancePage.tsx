import React from "react";
import { Grid, Icon, Card, CardContent } from "@mui/material";
import { CalendarMonth as CalendarIcon, Group as GroupIcon, EventNote as EventNoteIcon } from "@mui/icons-material";
import { Locale, ApiHelper, PageHeader } from "@churchapps/apphelper";
import { AttendanceSetup } from "./components/AttendanceSetup";
import { HeadcountEntry } from "./components/HeadcountEntry";
import { AttendanceNavigation } from "./components/AttendanceNavigation";
import { ReportWithFilter } from "../components/reporting";
import { PageContainer } from "../components/ui/PageContainer";
import { useCampuses } from "../hooks/useCampuses";

export const AttendancePage = () => {
  const [selectedTab, setSelectedTab] = React.useState("setup");
  const campuses = useCampuses();
  const [stats, setStats] = React.useState({
    serviceTimes: 0,
    scheduledGroups: 0,
    unscheduledGroups: 0,
    totalGroups: 0
  });

  const getCurrentTab = () => {
    let currentTab = null;
    switch (selectedTab) {
      case "setup": currentTab = <AttendanceSetup />; break;
      case "headcounts": currentTab = <HeadcountEntry />; break;
      case "attendance": currentTab = <ReportWithFilter keyName="attendanceTrend" autoRun={true} />; break;
      case "headcountTrend": currentTab = <ReportWithFilter keyName="headcountTrend" autoRun={true} />; break;
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

      let serviceTimes = 0;

      attendanceData.forEach((a: any) => {
        if (a.serviceTime) serviceTimes++;
      });

      const trackingGroups = groupsData.filter((g: any) => g.trackAttendance);
      const assignedGroupIds = new Set(groupServiceTimes.map((gst: any) => gst.groupId));
      const scheduledGroups = trackingGroups.filter((g: any) => assignedGroupIds.has(g.id)).length;
      const unscheduledGroups = trackingGroups.filter((g: any) => !assignedGroupIds.has(g.id)).length;

      setStats({
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
        icon={<EventNoteIcon />}
        title={Locale.label("attendance.attendancePage.att")}
        subtitle={Locale.label("attendance.attendancePage.subtitle")}
        statistics={[
          { icon: <Icon>church</Icon>, value: campuses.length.toString(), label: Locale.label("attendance.attendancePage.campuses") },
          { icon: <CalendarIcon />, value: stats.serviceTimes.toString(), label: Locale.label("attendance.attendancePage.services") },
          { icon: <Icon>schedule</Icon>, value: stats.scheduledGroups.toString(), label: Locale.label("attendance.attendancePage.scheduled") },
          { icon: <Icon>groups</Icon>, value: stats.unscheduledGroups.toString(), label: Locale.label("attendance.attendancePage.unscheduled") },
          { icon: <GroupIcon />, value: stats.totalGroups.toString(), label: Locale.label("attendance.attendancePage.totalGroups") }
        ]}
        tabs={<AttendanceNavigation selectedTab={selectedTab} onTabChange={setSelectedTab} onHeader />}
      />

      <PageContainer>
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
      </PageContainer>
    </>
  );
};
