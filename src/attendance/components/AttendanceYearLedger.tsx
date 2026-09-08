import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Box, Button, FormControl, InputLabel, MenuItem, Select, TextField, useTheme } from "@mui/material";
import { Chart } from "react-google-charts";
import { ArrayHelper, DateHelper, Loading, Locale, Permissions, UserHelper } from "@churchapps/apphelper";
import { type GroupInterface, type PersonInterface, type ServiceInterface, type ServiceTimeInterface } from "@churchapps/helpers";
import { ExportButton } from "../../components/ui";
import { useCampuses } from "../../hooks/useCampuses";
import { YearLedger } from "../../omarchy";
import { CHART_PALETTE, getChartTheme } from "../../people/demographics/components/chartTheme";
import { type HeadcountInterface } from "./HeadcountEntry";
import { type LedgerKind } from "./AttendanceNavigation";
import { isoDate, parseDate, startOfSundayWeek, yearOf } from "../week";

interface TrendRow {
  week: string;
  visits?: number;
  count?: number;
}

interface GroupWeekRow {
  serviceName?: string;
  serviceTimeName?: string;
  groupId?: string;
  personId?: string;
}

interface Props {
  kind: LedgerKind;
  onKind: (kind: LedgerKind) => void;
}

export const AttendanceYearLedger = (props: Props) => {
  const { kind, onKind } = props;
  const theme = useTheme();
  const chartTheme = getChartTheme(theme.palette.mode === "dark");
  const campuses = useCampuses();
  const thisWeek = useMemo(() => startOfSundayWeek(), []);
  const [year, setYear] = useState(thisWeek.getFullYear());
  const [campusId, setCampusId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [serviceTimeId, setServiceTimeId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [selectedWeek, setSelectedWeek] = useState(isoDate(thisWeek));

  const canView = UserHelper.checkAccess(Permissions.attendanceApi.attendance.view);
  const canViewSummary = UserHelper.checkAccess(Permissions.attendanceApi.attendance.viewSummary);

  const services = useQuery<ServiceInterface[]>({ queryKey: ["/services", "AttendanceApi"], placeholderData: [] });
  const serviceTimes = useQuery<ServiceTimeInterface[]>({ queryKey: ["/servicetimes", "AttendanceApi"], placeholderData: [] });
  const groups = useQuery<GroupInterface[]>({ queryKey: ["/groups", "MembershipApi"], placeholderData: [] });

  const campusFilter = campusId || "0";
  const serviceFilter = serviceId || "0";
  const timeFilter = serviceTimeId || "0";
  const groupFilter = groupId || "0";

  const trend = useQuery<TrendRow[]>({
    queryKey: [`/attendancerecords/trend?campusId=${campusFilter}&serviceId=${serviceFilter}&serviceTimeId=${timeFilter}&groupId=${groupFilter}`, "AttendanceApi"],
    enabled: canViewSummary,
    placeholderData: []
  });

  const headcounts = useQuery<HeadcountInterface[]>({
    queryKey: ["/headcounts", "AttendanceApi"],
    enabled: canView,
    placeholderData: []
  });

  const groupWeek = useQuery<GroupWeekRow[]>({
    queryKey: [`/attendancerecords/groups?serviceId=${serviceFilter}&week=${selectedWeek}`, "AttendanceApi"],
    enabled: canView && kind === "groups",
    placeholderData: []
  });

  const trackingGroups = useMemo(() => (groups.data || []).filter((g) => g.trackAttendance), [groups.data]);
  const servicesForCampus = useMemo(() => (services.data || []).filter((s) => !campusId || s.campusId === campusId), [services.data, campusId]);
  const timesForService = useMemo(() => (serviceTimes.data || []).filter((st) => !serviceId || st.serviceId === serviceId), [serviceTimes.data, serviceId]);

  const headcountWeeks = useMemo(() => {
    const map = new Map<string, number>();
    (headcounts.data || []).forEach((h) => {
      const d = parseDate(h.headcountDate);
      if (!d) return;
      if (campusId && h.campusId && h.campusId !== campusId) return;
      if (serviceId && h.serviceId && h.serviceId !== serviceId) return;
      if (serviceTimeId && h.serviceTimeId && h.serviceTimeId !== serviceTimeId) return;
      if (groupId && h.groupId && h.groupId !== groupId) return;
      const key = isoDate(startOfSundayWeek(d));
      map.set(key, (map.get(key) || 0) + (h.value || 0));
    });
    return [...map.entries()].map(([week, value]) => ({ week, value })).sort((a, b) => a.week.localeCompare(b.week));
  }, [headcounts.data, campusId, serviceId, serviceTimeId, groupId]);

  const years = useMemo(() => {
    const set = new Set<number>();
    (trend.data || []).forEach((r) => { const y = yearOf(r.week); if (y) set.add(y); });
    headcountWeeks.forEach((r) => { const y = yearOf(r.week); if (y) set.add(y); });
    set.add(thisWeek.getFullYear());
    return [...set].sort((a, b) => b - a);
  }, [trend.data, headcountWeeks, thisWeek]);

  const attendanceRows = useMemo(() => {
    return (trend.data || [])
      .map((r) => ({ week: isoDate(parseDate(r.week) || new Date(0)), visits: Number(r.visits ?? r.count) || 0 }))
      .filter((r) => yearOf(r.week) === year)
      .sort((a, b) => a.week.localeCompare(b.week));
  }, [trend.data, year]);

  const headcountRows = useMemo(() => headcountWeeks.filter((r) => yearOf(r.week) === year), [headcountWeeks, year]);

  const yearTotal = kind === "headcount"
    ? headcountRows.reduce((sum, r) => sum + r.value, 0)
    : attendanceRows.reduce((sum, r) => sum + r.visits, 0);

  const chartRows = kind === "headcount"
    ? headcountRows.map((r) => [DateHelper.prettyDate(parseDate(r.week) || new Date()), r.value])
    : attendanceRows.map((r) => [DateHelper.prettyDate(parseDate(r.week) || new Date()), r.visits]);

  const personIds = useMemo(() => [...new Set((groupWeek.data || []).map((r) => r.personId).filter(Boolean))] as string[], [groupWeek.data]);
  const people = useQuery<PersonInterface[]>({
    queryKey: ["/people/ids?ids=" + personIds.join(","), "MembershipApi"],
    enabled: personIds.length > 0,
    placeholderData: []
  });

  const groupTree = useMemo(() => {
    const times: { name: string; groups: { id: string; name: string; people: PersonInterface[] }[] }[] = [];
    const timeMap = new Map<string, Map<string, PersonInterface[]>>();
    (groupWeek.data || []).forEach((r) => {
      const timeName = r.serviceTimeName || r.serviceName || "";
      const gid = r.groupId || "";
      if (!timeMap.has(timeName)) timeMap.set(timeName, new Map());
      const groupsMap = timeMap.get(timeName)!;
      if (!groupsMap.has(gid)) groupsMap.set(gid, []);
      const person = ArrayHelper.getOne(people.data || [], "id", r.personId || "") as PersonInterface | null;
      if (person && !groupsMap.get(gid)!.some((p) => p.id === person.id)) groupsMap.get(gid)!.push(person);
    });
    timeMap.forEach((groupsMap, name) => {
      times.push({
        name,
        groups: [...groupsMap.entries()].map(([id, list]) => ({
          id,
          name: (ArrayHelper.getOne(groups.data || [], "id", id) as GroupInterface | null)?.name || id,
          people: list.sort((a, b) => (a.name?.display || "").localeCompare(b.name?.display || ""))
        })).sort((a, b) => a.name.localeCompare(b.name))
      });
    });
    return times;
  }, [groupWeek.data, people.data, groups.data]);

  const groupExport = useMemo(() => {
    const rows: { serviceTime: string; group: string; person: string }[] = [];
    groupTree.forEach((t) => t.groups.forEach((g) => g.people.forEach((p) => rows.push({ serviceTime: t.name, group: g.name, person: p.name?.display || "" }))));
    return rows;
  }, [groupTree]);

  const groupLedgerRows = useMemo(() => {
    const rows: { id: string; cells: ReactNode[] }[] = [];
    groupTree.forEach((t) => {
      t.groups.forEach((g) => {
        if (g.people.length === 0) {
          rows.push({
            id: t.name + "-" + g.id,
            cells: [t.name, <Link key={g.id} to={"/groups/" + g.id}>{g.name}</Link>, ""]
          });
        } else {
          g.people.forEach((p) => {
            rows.push({
              id: t.name + "-" + g.id + "-" + p.id,
              cells: [
                t.name,
                <Link key={g.id} to={"/groups/" + g.id}>{g.name}</Link>,
                <Link key={p.id} to={"/people/" + p.id}>{p.name?.display}</Link>
              ]
            });
          });
        }
      });
    });
    return rows;
  }, [groupTree]);

  const chartData = [
    [Locale.label("groups.groupHealth.week"), kind === "headcount" ? Locale.label("attendance.headcountEntry.count") : Locale.label("attendance.attendancePage.att")],
    ...chartRows
  ];
  const chartOptions = {
    legend: { position: "none" },
    backgroundColor: chartTheme.backgroundColor,
    colors: CHART_PALETTE,
    chartArea: { width: "88%", height: "70%" },
    hAxis: { textStyle: chartTheme.textStyle },
    vAxis: { textStyle: chartTheme.textStyle, gridlines: { color: chartTheme.gridColor }, baselineColor: chartTheme.baselineColor, minValue: 0 }
  };

  const kinds: { value: LedgerKind; label: string; testId?: string }[] = [
    { value: "attendance", label: Locale.label("attendance.tabs.attTrend") },
    { value: "headcount", label: Locale.label("attendance.tabs.headcountTrend"), testId: "attendance-tab-headcount-trend" },
    { value: "groups", label: Locale.label("attendance.tabs.groupAtt") }
  ];

  const csvData = kind === "headcount"
    ? headcountRows.map((r) => ({ week: r.week, headcount: r.value }))
    : attendanceRows.map((r) => ({ week: r.week, visits: r.visits }));

  const yearMeta = years.map((y) => ({ year: y }));

  const handleYear = (y: number) => {
    setYear(y);
    const current = parseDate(selectedWeek);
    if (!current || current.getFullYear() !== y) setSelectedWeek(isoDate(startOfSundayWeek(new Date(y, 0, 7))));
  };

  const exportAction = kind === "groups"
    ? (groupExport.length > 0 ? <ExportButton data={groupExport} filename={"group-attendance-" + selectedWeek + ".csv"} text={Locale.label("reporting.summary")} /> : undefined)
    : (csvData.length > 0 ? <ExportButton data={csvData} filename={kind + "-" + year + ".csv"} text={Locale.label("reporting.summary")} /> : undefined);

  return (
    <div>
      <div className="om-kinds">
        {kinds.map((k) => (
          <button key={k.value} type="button" data-testid={k.testId} className={kind === k.value ? "on" : ""} onClick={() => onKind(k.value)}>{k.label}</button>
        ))}
      </div>

      <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel id="campusId">{Locale.label("attendance.attendancePage.campus")}</InputLabel>
          <Select labelId="campusId" id="mui-component-select-campusId" name="campusId" label={Locale.label("attendance.attendancePage.campus")} value={campusId} onChange={(e) => { setCampusId(e.target.value); setServiceId(""); setServiceTimeId(""); }}>
            <MenuItem value="">—</MenuItem>
            {campuses.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="serviceId">{Locale.label("attendance.attendancePage.service")}</InputLabel>
          <Select labelId="serviceId" id="mui-component-select-serviceId" name="serviceId" label={Locale.label("attendance.attendancePage.service")} value={serviceId} onChange={(e) => { setServiceId(e.target.value); setServiceTimeId(""); }}>
            <MenuItem value="">—</MenuItem>
            {servicesForCampus.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
          </Select>
        </FormControl>
        {kind !== "groups" && (
          <>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="serviceTimeId">{Locale.label("attendance.attendancePage.time")}</InputLabel>
              <Select labelId="serviceTimeId" id="mui-component-select-serviceTimeId" name="serviceTimeId" label={Locale.label("attendance.attendancePage.time")} value={serviceTimeId} onChange={(e) => setServiceTimeId(e.target.value)}>
                <MenuItem value="">—</MenuItem>
                {timesForService.map((st) => <MenuItem key={st.id} value={st.id}>{st.name}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="groupId">{Locale.label("attendance.attendancePage.group")}</InputLabel>
              <Select labelId="groupId" id="mui-component-select-groupId" name="groupId" label={Locale.label("attendance.attendancePage.group")} value={groupId} onChange={(e) => setGroupId(e.target.value)}>
                <MenuItem value="">—</MenuItem>
                {trackingGroups.map((g) => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
              </Select>
            </FormControl>
          </>
        )}
        {kind === "groups" && (
          <TextField
            size="small"
            type="date"
            name="week"
            label={Locale.label("groups.groupHealth.week")}
            value={selectedWeek}
            onChange={(e) => {
              const d = parseDate(e.target.value);
              if (!d) return;
              const sunday = startOfSundayWeek(d);
              setSelectedWeek(isoDate(sunday));
              setYear(sunday.getFullYear());
            }}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ minWidth: 160 }}
          />
        )}
        <Button type="button" variant="outlined" size="small" onClick={() => { trend.refetch(); headcounts.refetch(); groupWeek.refetch(); }} sx={{ textTransform: "none" }}>
          {Locale.label("reporting.runReport")}
        </Button>
      </Box>

      {kind !== "groups" && chartRows.length > 0 && (
        <Box sx={{ mb: 2 }} data-testid="attendance-year-chart">
          <Chart chartType={kind === "headcount" ? "LineChart" : "ColumnChart"} data={chartData} width="100%" height="240px" options={chartOptions} />
        </Box>
      )}

      <div id="reportsBox">
        {kind === "groups"
          ? (groupWeek.isLoading ? <Loading /> : (
            <YearLedger
              title={Locale.label("attendance.tabs.groupAtt")}
              years={yearMeta}
              selectedYear={year}
              onYearChange={handleYear}
              headline={personIds.length}
              summary={DateHelper.prettyDate(parseDate(selectedWeek) || new Date())}
              columns={[Locale.label("attendance.attendancePage.time"), Locale.label("attendance.attendancePage.group"), Locale.label("common.name")]}
              rows={groupLedgerRows}
              empty={Locale.label("attendance.attendancePage.groupAttMsg")}
              actions={exportAction}
            />
          ))
          : (trend.isLoading || headcounts.isLoading ? <Loading /> : (
            <YearLedger
              title={kind === "headcount" ? Locale.label("attendance.tabs.headcountTrend") : Locale.label("attendance.tabs.attTrend")}
              years={yearMeta}
              selectedYear={year}
              onYearChange={handleYear}
              headline={yearTotal}
              summary={String(year)}
              columns={[Locale.label("groups.groupHealth.week"), kind === "headcount" ? Locale.label("attendance.headcountEntry.count") : Locale.label("attendance.attendancePage.att")]}
              rows={kind === "headcount"
                ? headcountRows.map((r) => ({ id: r.week, cells: [DateHelper.prettyDate(parseDate(r.week) || new Date()), r.value] }))
                : attendanceRows.map((r) => ({
                  id: r.week,
                  cells: [
                    <button key={r.week} type="button" className="om-back" onClick={() => { setSelectedWeek(r.week); onKind("groups"); }}>{DateHelper.prettyDate(parseDate(r.week) || new Date())}</button>,
                    r.visits
                  ]
                }))}
              empty={Locale.label("people.demographics.noData")}
              actions={exportAction}
            />
          ))}
      </div>
    </div>
  );
};
