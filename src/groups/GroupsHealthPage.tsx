import { useQuery } from "@tanstack/react-query";
import { Link as RouterLink } from "react-router-dom";
import { Box, Link, Table, TableBody, TableCell, TableRow } from "@mui/material";
import { Loading, Locale } from "@churchapps/apphelper";
import { ArrowBack as BackIcon } from "@mui/icons-material";
import { HeaderTextButton, PageContainer, PageHeader, SortableTableHead, Surface, numericCellSx, tableScrollSx } from "../components/ui";
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
      <PageHeader title={Locale.label("groups.groupHealth.title")} subtitle={Locale.label("groups.groupHealth.subtitle")}>
        <HeaderTextButton component={RouterLink} to="/groups" startIcon={<BackIcon />} data-testid="groups-back">{Locale.label("groups.groupsPage.groups")}</HeaderTextButton>
      </PageHeader>
      <PageContainer>
        {health.isLoading ? (
          <Loading />
        ) : (
          <Surface disablePadding>
            <Box sx={tableScrollSx} role="region" aria-label={Locale.label("groups.groupHealth.title")} tabIndex={0}>
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
                        <Link component={RouterLink} to={"/groups/" + r.groupId} underline="hover" sx={{ fontWeight: 600 }}>{r.name}</Link>
                      </TableCell>
                      <TableCell>{r.categoryName}</TableCell>
                      <TableCell sx={numericCellSx}>{r.memberCount}</TableCell>
                      <TableCell sx={numericCellSx}>{r.joins90}</TableCell>
                      <TableCell sx={numericCellSx}>{r.leaves90}</TableCell>
                      <TableCell sx={numericCellSx}>{r.churnRate90}%</TableCell>
                      <TableCell sx={numericCellSx}>{r.averageAttendance === null ? "-" : r.averageAttendance}</TableCell>
                      <TableCell sx={numericCellSx}>{r.averageAge === null ? "-" : r.averageAge}</TableCell>
                      <TableCell sx={numericCellSx}>{r.femaleCount}</TableCell>
                      <TableCell sx={numericCellSx}>{r.maleCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Surface>
        )}
      </PageContainer>
    </>
  );
};

export default GroupsHealthPage;
