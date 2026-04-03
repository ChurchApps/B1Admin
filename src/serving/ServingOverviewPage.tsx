import React from "react";
import { ApiHelper, ArrayHelper, DateHelper, ExportLink, Loading, PageHeader, type PersonInterface } from "@churchapps/apphelper";
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";

interface OverviewRow {
  serviceDate: string;
  ministryId: string;
  categoryName: string;
  positionName: string;
  needed: number;
  personId: string | null;
  status: string | null;
}

interface GridRow {
  position: string;
  cells: Record<string, string[]>; // date -> personIds
  activeDates: Set<string>; // dates where this position exists in a plan
  needed: number;
}

const formatShortDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const getDefaultDates = () => {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 84); // 12 weeks
  return {
    startDate: DateHelper.formatHtml5Date(start),
    endDate: DateHelper.formatHtml5Date(end)
  };
};

export const ServingOverviewPage = () => {
  const [searchParams] = useSearchParams();
  const defaults = getDefaultDates();
  const [startDate, setStartDate] = React.useState(defaults.startDate);
  const [endDate, setEndDate] = React.useState(defaults.endDate);
  const ministryId = searchParams.get("ministryId") || "";
  const planTypeId = searchParams.get("planTypeId") || "";

  const overviewData = useQuery<OverviewRow[]>({
    queryKey: ["/plans/overview", "DoingApi", startDate, endDate, ministryId, planTypeId],
    enabled: !!startDate && !!endDate,
    placeholderData: [],
    queryFn: async () => {
      let url = `/plans/overview?startDate=${startDate}&endDate=${endDate}`;
      if (ministryId) url += `&ministryId=${ministryId}`;
      if (planTypeId) url += `&planTypeId=${planTypeId}`;
      return ApiHelper.get(url, "DoingApi");
    }
  });

  // Collect unique personIds and fetch their names
  const personIds = React.useMemo(() => {
    const ids = new Set<string>();
    (overviewData.data || []).forEach(r => { if (r.personId) ids.add(r.personId); });
    return Array.from(ids);
  }, [overviewData.data]);

  const people = useQuery<PersonInterface[]>({
    queryKey: ["/people/ids", "MembershipApi", personIds],
    enabled: personIds.length > 0,
    placeholderData: [],
    queryFn: async () => {
      if (personIds.length === 0) return [];
      return ApiHelper.get("/people/ids?ids=" + personIds.join(","), "MembershipApi");
    }
  });

  const getDisplayName = (personId: string) => {
    const person = ArrayHelper.getOne(people.data || [], "id", personId);
    if (!person) return "";
    const first = person.name?.first || "";
    const last = person.name?.last || "";
    return last ? `${first} ${last.charAt(0)}.` : first;
  };

  // Build the grid: rows = positions, columns = dates
  const { dates, rows } = React.useMemo(() => {
    const dateSet = new Set<string>();
    const positionMap = new Map<string, GridRow>();

    (overviewData.data || []).forEach(r => {
      const dateKey = r.serviceDate?.split("T")[0] || r.serviceDate;
      dateSet.add(dateKey);

      const posKey = r.categoryName ? `${r.categoryName}: ${r.positionName}` : r.positionName;
      if (!positionMap.has(posKey)) {
        positionMap.set(posKey, { position: posKey, cells: {}, activeDates: new Set(), needed: r.needed || 0 });
      }
      const row = positionMap.get(posKey)!;
      row.activeDates.add(dateKey);
      if (!row.cells[dateKey]) row.cells[dateKey] = [];
      if (r.personId) row.cells[dateKey].push(r.personId);
    });

    const sortedDates = Array.from(dateSet).sort();
    const gridRows = Array.from(positionMap.values());
    return { dates: sortedDates, rows: gridRows };
  }, [overviewData.data]);

  // Build CSV export data
  const csvData = React.useMemo(() => {
    return rows.map(row => {
      const obj: Record<string, string> = { Position: row.position };
      dates.forEach(d => {
        const names = (row.cells[d] || []).map(id => getDisplayName(id));
        obj[formatShortDate(d)] = names.join("; ");
      });
      return obj;
    });
  }, [rows, dates, people.data]);

  const csvHeaders = React.useMemo(() => {
    const headers = [{ label: "Position", key: "Position" }];
    dates.forEach(d => {
      const label = formatShortDate(d);
      headers.push({ label, key: label });
    });
    return headers;
  }, [dates]);

  if (overviewData.isLoading) return <Loading />;

  return (
    <>
      <PageHeader title="Serving Overview" subtitle="Positions by date with assigned volunteers" />
      <Box sx={{ p: 3 }}>
        {/* Filters */}
        <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap", alignItems: "center" }}>
          <TextField label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} size="small" />
          <TextField label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} size="small" />
          <ExportLink data={csvData} customHeaders={csvHeaders} filename="serving-overview.csv" text="Export CSV" />
        </Box>

        {/* Grid Table */}
        {rows.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>No serving data found for the selected date range.</Box>
        ) : (
          <TableContainer component={Paper} sx={{ maxHeight: "70vh", overflowX: "auto" }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, position: "sticky", left: 0, zIndex: 3, backgroundColor: "background.paper", minWidth: 200 }}>Position</TableCell>
                  {dates.map(d => (
                    <TableCell key={d} sx={{ fontWeight: 700, textAlign: "center", whiteSpace: "nowrap" }}>{formatShortDate(d)}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map(row => (
                  <TableRow key={row.position}>
                    <TableCell sx={{ fontWeight: 600, position: "sticky", left: 0, backgroundColor: "background.paper", zIndex: 1 }}>{row.position}</TableCell>
                    {dates.map(d => {
                      const assigned = row.cells[d] || [];
                      const isActive = row.activeDates.has(d);
                      const isGap = isActive && assigned.length === 0;
                      return (
                        <TableCell
                          key={d}
                          sx={{
                            textAlign: "center",
                            backgroundColor: isGap ? "error.light" : undefined,
                            color: isGap ? "error.contrastText" : undefined,
                            whiteSpace: "nowrap",
                            fontSize: "0.8rem"
                          }}
                        >
                          {isActive ? (assigned.map(id => getDisplayName(id)).join(", ") || "\u2014") : ""}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </>
  );
};
