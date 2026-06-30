import React, { memo, useMemo, useState } from "react";
import { type AttendanceRecordInterface, type GroupInterface } from "@churchapps/helpers";
import { ArrayHelper, DateHelper, UniqueIdHelper, Loading, Locale } from "@churchapps/apphelper";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Box, Button, Card, FormControl, InputLabel, MenuItem, Select, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { EventAvailable as EventIcon, Print as PrintIcon } from "@mui/icons-material";
import { EmptyState } from "../../components/ui/EmptyState";
import { CountChip } from "../../components/ui/CountChip";
import { useCampuses } from "../../hooks/useCampuses";

interface Props {
  personId: string;
  personName?: string;
  updatedFunction?: () => void;
}

const Dash = <Typography component="span" variant="body2" color="text.disabled">—</Typography>;

export const PersonAttendance: React.FC<Props> = memo((props) => {
  const [serviceFilter, setServiceFilter] = useState("");
  const [serviceTimeFilter, setServiceTimeFilter] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  // Campuses are mastered in the membership module; resolve the campus name by id.
  const campuses = useCampuses();
  const attendanceRecords = useQuery<AttendanceRecordInterface[]>({
    queryKey: ["/attendancerecords?personId=" + props.personId, "AttendanceApi"],
    enabled: !UniqueIdHelper.isMissing(props.personId),
    placeholderData: []
  });

  const groups = useQuery<GroupInterface[]>({
    queryKey: ["/groups", "MembershipApi"],
    placeholderData: []
  });

  const serviceNames = useMemo(() => {
    if (!attendanceRecords.data) return [];
    return [...new Set(attendanceRecords.data.flatMap(r => (r.service?.name ? [r.service.name] : [])))].sort();
  }, [attendanceRecords.data]);

  const serviceTimeNames = useMemo(() => {
    if (!attendanceRecords.data) return [];
    return [...new Set(attendanceRecords.data.flatMap(r => (r.serviceTime?.name ? [r.serviceTime.name] : [])))].sort();
  }, [attendanceRecords.data]);

  const groupOptions = useMemo(() => {
    if (!attendanceRecords.data || !groups.data) return [];
    const ids = [...new Set(attendanceRecords.data.flatMap(r => (r.groupId ? [r.groupId] : [])))];
    return ids
      .map(id => ({ id, name: ArrayHelper.getOne(groups.data, "id", id)?.name as string }))
      .filter(g => g.name)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [attendanceRecords.data, groups.data]);

  const records = useMemo(() => {
    return (attendanceRecords.data || []).filter(r =>
      (!serviceFilter || r.service?.name === serviceFilter) &&
      (!serviceTimeFilter || r.serviceTime?.name === serviceTimeFilter) &&
      (!groupFilter || r.groupId === groupFilter));
  }, [attendanceRecords.data, serviceFilter, serviceTimeFilter, groupFilter]);

  const table = useMemo(() => {
    if (!groups.data) return null;
    if (records.length === 0) {
      return <Box sx={{ p: 2 }}><EmptyState icon={<EventIcon />} title={Locale.label("people.personAttendance.noAttMsg")} /></Box>;
    }

    const resolveCampus = (r: AttendanceRecordInterface) => campuses.find(c => c.id === r.campus?.id)?.name || r.campus?.name || "";
    // Only render columns that actually carry data — a person with only group
    // sessions shouldn't get four empty service/campus columns, and vice versa.
    const hasCampus = records.some(r => resolveCampus(r));
    const hasService = records.some(r => r.service?.name);
    const hasTime = records.some(r => r.serviceTime?.name);
    const hasGroup = records.some(r => !!ArrayHelper.getOne(groups.data, "id", r.groupId));

    const grouped = records.reduce(
      (acc, record) => {
        const key = DateHelper.formatHtml5Date(record.visitDate);
        (acc[key] ||= []).push(record);
        return acc;
      },
      {} as Record<string, AttendanceRecordInterface[]>
    );
    const dates = Object.entries(grouped).sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime());

    const headCell = (label: string, key: string) => (
      <TableCell key={key}><Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{label}</Typography></TableCell>
    );

    return (
      <Table>
        <TableHead sx={{ backgroundColor: "grey.50", "& .MuiTableCell-root": { borderBottom: "2px solid", borderBottomColor: "divider" } }}>
          <TableRow>
            {headCell("Date", "date")}
            {hasCampus && headCell("Campus", "campus")}
            {hasService && headCell("Service", "service")}
            {hasTime && headCell("Time", "time")}
            {hasGroup && headCell("Group", "group")}
          </TableRow>
        </TableHead>
        <TableBody>
          {dates.map(([date, dateRecords]) => {
            const day = new Date(date + "T00:00:00");
            return dateRecords.map((record, index) => {
              const group = ArrayHelper.getOne(groups.data, "id", record.groupId);
              const campusName = resolveCampus(record);
              return (
                <TableRow key={`${date}-${index}`} hover sx={{ "& > td": { verticalAlign: "top" } }}>
                  {index === 0 && (
                    <TableCell rowSpan={dateRecords.length} sx={{ whiteSpace: "nowrap", borderRight: "1px solid", borderColor: "divider", verticalAlign: "top" }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{day.toLocaleDateString(undefined, { weekday: "long" })}</Typography>
                      <Typography variant="caption" color="text.secondary">{DateHelper.prettyDate(day)}</Typography>
                    </TableCell>
                  )}
                  {hasCampus && <TableCell>{campusName ? <Typography variant="body2">{campusName}</Typography> : Dash}</TableCell>}
                  {hasService && <TableCell>{record.service?.name ? <Typography variant="body2">{record.service.name}</Typography> : Dash}</TableCell>}
                  {hasTime && <TableCell>{record.serviceTime?.name ? <Typography variant="body2">{record.serviceTime.name}</Typography> : Dash}</TableCell>}
                  {hasGroup && (
                    <TableCell>
                      {group
                        ? <Box component={Link} to={`/groups/${group.id}`} sx={{ color: "primary.main", fontWeight: 500, textDecoration: "none", fontSize: "0.875rem", "&:hover": { textDecoration: "underline" } }}>{group.name}</Box>
                        : Dash}
                    </TableCell>
                  )}
                </TableRow>
              );
            });
          })}
        </TableBody>
      </Table>
    );
  }, [records, groups.data, campuses]);

  // Only surface a filter when there's more than one value to choose between.
  const filterDefs = [
    { label: "Service", all: "All Services", value: serviceFilter, set: setServiceFilter, options: serviceNames.map(n => ({ value: n, label: n })) },
    { label: "Time", all: "All Times", value: serviceTimeFilter, set: setServiceTimeFilter, options: serviceTimeNames.map(n => ({ value: n, label: n })) },
    { label: "Group", all: "All Groups", value: groupFilter, set: setGroupFilter, options: groupOptions.map(g => ({ value: g.id, label: g.name })) }
  ];
  const filterControls = filterDefs
    .filter(f => f.options.length > 1)
    .map(f => (
      <FormControl key={f.label} size="small" sx={{ minWidth: 150 }}>
        <InputLabel>{f.label}</InputLabel>
        <Select value={f.value} label={f.label} onChange={e => f.set(e.target.value)}>
          <MenuItem value="">{f.all}</MenuItem>
          {f.options.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </Select>
      </FormControl>
    ));

  if (attendanceRecords.isLoading || groups.isLoading) return <Loading size="sm" />;

  return (
    <Box className="attendance-print">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .attendance-print, .attendance-print * { visibility: visible !important; }
          .attendance-print { position: absolute; left: 0; top: 0; width: 100%; }
          .attendance-no-print { display: none !important; }
          .attendance-print-only { display: block !important; }
          .attendance-print .MuiCard-root { box-shadow: none !important; border: none !important; }
        }
      `}</style>
      <Typography variant="h5" className="attendance-print-only" sx={{ display: "none", mb: 1, fontWeight: 500 }}>
        {props.personName ? `${props.personName} — Attendance` : "Attendance"}
      </Typography>
      <Card>
        <Box className="attendance-no-print" sx={{ p: 2, borderBottom: 1, borderColor: "var(--border-light)" }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
            <Stack direction="row" spacing={1} alignItems="center">
              <EventIcon sx={{ color: "primary.main", fontSize: 20 }} />
              <Typography variant="h6">Attendance</Typography>
              {records.length > 0 && <CountChip count={records.length} />}
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              {filterControls}
              <Button variant="outlined" size="small" startIcon={<PrintIcon />} onClick={() => window.print()}>
                {Locale.label("common.print")}
              </Button>
            </Stack>
          </Stack>
        </Box>
        {table}
      </Card>
    </Box>
  );
});
