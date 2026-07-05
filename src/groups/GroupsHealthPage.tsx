import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Box, Card, Table, TableBody, TableCell, TableRow } from "@mui/material";
import { MonitorHeart as HealthIcon } from "@mui/icons-material";
import { Loading, Locale, PageHeader } from "@churchapps/apphelper";
import { SortableTableHead } from "../components/ui";
import { useSortableData } from "../hooks";

interface GroupHealthRow {
  groupId: string;
  name: string;
  categoryName: string;
  memberCount: number;
  averageAge: number | null;
  femaleCount: number;
  maleCount: number;
  joins90: number;
  leaves90: number;
  churnRate90: number;
}

interface AttendanceSummaryRow {
  groupId: string;
  sessionCount: number;
  averageAttendance: number;
}

const GroupsHealthPage = () => {
  const health = useQuery<GroupHealthRow[]>({ queryKey: ["/groups/health/summary", "MembershipApi"], placeholderData: [] });
  const attendance = useQuery<AttendanceSummaryRow[]>({ queryKey: ["/attendancerecords/groupsummary", "AttendanceApi"], placeholderData: [] });

  const mergedRows = (health.data || []).map((g) => {
    const att = (attendance.data || []).find((a) => a.groupId === g.groupId);
    return { ...g, averageAttendance: att?.averageAttendance ?? null, sessionCount: att?.sessionCount ?? 0 };
  });

  const { sorted: rows, sortBy, sortDirection, handleSort } = useSortableData(mergedRows, "name");

  const columns = [
    { key: "name", label: Locale.label("common.name"), sortable: true },
    { key: "categoryName", label: Locale.label("groups.groupsPage.cat"), sortable: true },
    { key: "memberCount", label: Locale.label("groups.groupHealth.members"), sortable: true, align: "right" as const },
    { key: "joins90", label: Locale.label("groups.groupHealth.joined90"), sortable: true, align: "right" as const },
    { key: "leaves90", label: Locale.label("groups.groupHealth.left90"), sortable: true, align: "right" as const },
    { key: "churnRate90", label: Locale.label("groups.groupHealth.churn90"), sortable: true, align: "right" as const },
    { key: "averageAttendance", label: Locale.label("groups.groupHealth.avgAttendance"), sortable: true, align: "right" as const },
    { key: "averageAge", label: Locale.label("groups.groupHealth.avgAge"), sortable: true, align: "right" as const },
    { key: "femaleCount", label: Locale.label("people.demographics.female"), sortable: true, align: "right" as const },
    { key: "maleCount", label: Locale.label("people.demographics.male"), sortable: true, align: "right" as const }
  ];

  return (
    <>
      <PageHeader icon={<HealthIcon />} title={Locale.label("groups.groupHealth.title")} subtitle={Locale.label("groups.groupHealth.subtitle")}>
        <HealthIcon sx={{ fontSize: 32, color: "rgba(255,255,255,0.8)", mr: 2 }} />
      </PageHeader>
      <Box sx={{ p: 3 }}>
        {health.isLoading ? (
          <Loading />
        ) : (
          <Card>
            <Box sx={{ overflowX: "auto" }}>
              <Table data-testid="groups-health-table">
                <SortableTableHead columns={columns} sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort} />
                <TableBody>
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={columns.length}>{Locale.label("groups.groupsPage.noGroupMsg")}</TableCell>
                    </TableRow>
                  )}
                  {rows.map((r) => (
                    <TableRow key={r.groupId} sx={{ whiteSpace: "nowrap" }}>
                      <TableCell>
                        <Link to={"/groups/" + r.groupId} style={{ color: "var(--link)", fontWeight: 500, textDecoration: "none" }}>{r.name}</Link>
                      </TableCell>
                      <TableCell>{r.categoryName}</TableCell>
                      <TableCell align="right">{r.memberCount}</TableCell>
                      <TableCell align="right">{r.joins90}</TableCell>
                      <TableCell align="right">{r.leaves90}</TableCell>
                      <TableCell align="right">{r.churnRate90}%</TableCell>
                      <TableCell align="right">{r.averageAttendance === null ? "-" : r.averageAttendance}</TableCell>
                      <TableCell align="right">{r.averageAge === null ? "-" : r.averageAge}</TableCell>
                      <TableCell align="right">{r.femaleCount}</TableCell>
                      <TableCell align="right">{r.maleCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Card>
        )}
      </Box>
    </>
  );
};

export default GroupsHealthPage;
