import React from "react";
import { ApiHelper, ArrayHelper, DateHelper, Loading, Locale, PageHeader, Permissions, UserHelper, type PersonInterface } from "@churchapps/apphelper";
import { type AssignmentInterface, type PositionInterface } from "@churchapps/helpers";
import { Alert, Box, Button, Card, Dialog, DialogContent, DialogTitle, FormControl, FormControlLabel, IconButton, InputLabel, MenuItem, Select, Snackbar, Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip } from "@mui/material";
import { Close as CloseIcon, Clear as ClearIcon, Email as EmailIcon, PublishedWithChanges as AutoScheduleIcon } from "@mui/icons-material";
import { ExportButton } from "../components/ui";
import { AssignmentEdit } from "./components/AssignmentEdit";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";

interface OverviewRow {
  serviceDate: string;
  ministryId: string;
  planId: string;
  planName: string;
  positionId: string;
  categoryName: string;
  positionName: string;
  groupId: string | null;
  needed: number;
  assignmentId: string | null;
  personId: string | null;
  status: string | null;
}

interface CellAssignment {
  assignmentId: string | null;
  personId: string;
  status: string | null;
}

interface CellSlot {
  positionId: string;
  planId: string;
  groupId: string | null;
  needed: number;
  assignments: CellAssignment[];
}

interface GridCell {
  needed: number;
  slots: CellSlot[];
}

interface GridRow {
  position: string;
  categoryName: string;
  positionName: string;
  cells: Record<string, GridCell>;
  activeDates: Set<string>;
}

const formatShortDate = (dateStr: string) => {
  if (!dateStr) return "";
  return DateHelper.toDate(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const cellFilled = (cell: GridCell) => cell.slots.reduce((s, slot) => s + slot.assignments.length, 0);
const cellPersonIds = (cell: GridCell) => cell.slots.flatMap((slot) => slot.assignments.map((a) => a.personId));

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
  const canEdit = UserHelper.checkAccess(Permissions.membershipApi.plans.edit);

  const [editingKey, setEditingKey] = React.useState<{ rowKey: string; date: string } | null>(null);
  const [highlightPersonId, setHighlightPersonId] = React.useState("");
  const [gapsOnly, setGapsOnly] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [snack, setSnack] = React.useState("");

  const planType = useQuery<{ id: string; name: string }>({
    queryKey: [`/planTypes/${planTypeId}`, "DoingApi"],
    enabled: !!planTypeId
  });

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

  // Build the grid: rows = positions (keyed by name), columns = dates.
  // A cell holds one slot per distinct positionId so two same-named positions in
  // one plan stay editable independently instead of collapsing to the first.
  const { dates, rows } = React.useMemo(() => {
    const dateSet = new Set<string>();
    const positionMap = new Map<string, GridRow>();

    (overviewData.data || []).forEach(r => {
      const dateKey = r.serviceDate?.split("T")[0] || r.serviceDate;
      dateSet.add(dateKey);

      const posKey = r.categoryName ? `${r.categoryName}: ${r.positionName}` : r.positionName;
      let row = positionMap.get(posKey);
      if (!row) {
        row = { position: posKey, categoryName: r.categoryName, positionName: r.positionName, cells: {}, activeDates: new Set() };
        positionMap.set(posKey, row);
      }
      row.activeDates.add(dateKey);

      let cell = row.cells[dateKey];
      if (!cell) { cell = { needed: 0, slots: [] }; row.cells[dateKey] = cell; }

      let slot = cell.slots.find(s => s.positionId === r.positionId);
      if (!slot) {
        slot = { positionId: r.positionId, planId: r.planId, groupId: r.groupId, needed: r.needed || 0, assignments: [] };
        cell.slots.push(slot);
        cell.needed += r.needed || 0;
      }
      if (r.personId) slot.assignments.push({ assignmentId: r.assignmentId, personId: r.personId, status: r.status });
    });

    const sortedDates = Array.from(dateSet).sort();
    const gridRows = Array.from(positionMap.values());
    return { dates: sortedDates, rows: gridRows };
  }, [overviewData.data]);

  const displayRows = React.useMemo(() => {
    if (!gapsOnly) return rows;
    return rows.filter(row => dates.some(d => row.activeDates.has(d) && cellFilled(row.cells[d]) < (row.cells[d]?.needed || 0)));
  }, [rows, dates, gapsOnly]);

  // Build CSV export data
  const csvData = React.useMemo(() => {
    return rows.map(row => {
      const obj: Record<string, string> = { Position: row.position };
      dates.forEach(d => {
        const cell = row.cells[d];
        const names = cell ? cellPersonIds(cell).map(id => getDisplayName(id)) : [];
        obj[formatShortDate(d)] = names.join("; ");
      });
      return obj;
    });
  }, [rows, dates, people.data]);

  const csvHeaders = React.useMemo(() => {
    const headers = [{ label: Locale.label("plans.servingOverviewPage.position"), key: "Position" }];
    dates.forEach(d => {
      const label = formatShortDate(d);
      headers.push({ label, key: label });
    });
    return headers;
  }, [dates]);

  const editingRow = editingKey ? rows.find(r => r.position === editingKey.rowKey) : null;
  const editingCell = editingRow && editingKey ? editingRow.cells[editingKey.date] : null;

  const removeAssignment = (assignmentId: string | null) => {
    if (!assignmentId) return;
    ApiHelper.delete("/assignments/" + assignmentId, "DoingApi").then(() => overviewData.refetch());
  };

  const handleAutoSchedule = async () => {
    setBusy(true);
    try {
      const planSlots = new Map<string, CellSlot[]>();
      const groupIds = new Set<string>();
      rows.forEach(row => dates.forEach(d => {
        const cell = row.cells[d];
        if (!cell) return;
        cell.slots.forEach(slot => {
          if (!slot.planId) return;
          if (!planSlots.has(slot.planId)) planSlots.set(slot.planId, []);
          planSlots.get(slot.planId)!.push(slot);
          if (slot.groupId) groupIds.add(slot.groupId);
        });
      }));

      const groupMembers = groupIds.size > 0
        ? await ApiHelper.get("/groupMembers/?groupIds=" + Array.from(groupIds).join(","), "MembershipApi")
        : [];

      let filled = 0;
      const total = planSlots.size;
      // Sequential: each /autofill reads same-date assignments from the DB, so a
      // parallel run would double-book people serving the same day across plans.
      for (const [planId, slots] of planSlots) {
        const teams = slots.map(s => ({ positionId: s.positionId, personIds: ArrayHelper.getAll(groupMembers, "groupId", s.groupId).map((m: any) => m.personId) }));
        try {
          const res = await ApiHelper.post("/plans/autofill/" + planId, { teams }, "DoingApi");
          if (res?.created > 0) filled++;
        } catch { /* plan skipped (e.g. no edit access) */ }
      }
      await overviewData.refetch();
      setSnack(Locale.label("plans.servingOverviewPage.autoScheduleResult").replace("{filled}", String(filled)).replace("{total}", String(total)));
    } finally {
      setBusy(false);
    }
  };

  const handleEmailAll = async () => {
    setBusy(true);
    try {
      const res = await ApiHelper.post("/plans/notifyRange", { startDate, endDate, ministryId, planTypeId }, "DoingApi");
      if ((res?.sent || 0) + (res?.failed || 0) === 0) setSnack(Locale.label("plans.servingOverviewPage.emailEmpty"));
      else setSnack(Locale.label("plans.servingOverviewPage.emailResult").replace("{sent}", String(res?.sent || 0)).replace("{failed}", String(res?.failed || 0)));
    } finally {
      setBusy(false);
    }
  };

  if (overviewData.isLoading) return <Loading />;

  return (
    <>
      <PageHeader title={planType.data?.name ? `${planType.data.name} ${Locale.label("plans.servingOverviewPage.overviewSuffix")}` : Locale.label("plans.servingOverviewPage.title")} subtitle={Locale.label("plans.servingOverviewPage.subtitle")} />
      <Box sx={{ p: 3 }}>
        {/* Filters */}
        <Card sx={{ mb: 3, p: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center" useFlexGap flexWrap="wrap">
            <TextField label={Locale.label("plans.servingOverviewPage.startDate")} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} size="small" InputLabelProps={{ shrink: true }} />
            <TextField label={Locale.label("plans.servingOverviewPage.endDate")} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} size="small" InputLabelProps={{ shrink: true }} />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>{Locale.label("plans.servingOverviewPage.highlightPerson")}</InputLabel>
              <Select label={Locale.label("plans.servingOverviewPage.highlightPerson")} value={highlightPersonId} onChange={(e) => setHighlightPersonId(e.target.value)} data-testid="highlight-person-select">
                <MenuItem value="">{Locale.label("plans.servingOverviewPage.highlightAll")}</MenuItem>
                {personIds.map(id => <MenuItem key={id} value={id}>{getDisplayName(id)}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControlLabel control={<Switch checked={gapsOnly} onChange={(e) => setGapsOnly(e.target.checked)} data-testid="gaps-only-toggle" />} label={Locale.label("plans.servingOverviewPage.gapsOnly")} />
            <ExportButton data={csvData} customHeaders={csvHeaders} filename={Locale.label("plans.servingOverviewPage.filename")} text={Locale.label("plans.servingOverviewPage.exportCsv")} />
            {canEdit && (
              <Button variant="outlined" size="small" startIcon={<AutoScheduleIcon />} disabled={busy || rows.length === 0} onClick={handleAutoSchedule} data-testid="matrix-auto-schedule">
                {Locale.label("plans.servingOverviewPage.autoSchedule")}
              </Button>
            )}
            {canEdit && (
              <Button variant="outlined" size="small" startIcon={<EmailIcon />} disabled={busy || !ministryId || rows.length === 0} onClick={handleEmailAll} data-testid="matrix-email-all">
                {Locale.label("plans.servingOverviewPage.emailAll")}
              </Button>
            )}
          </Stack>
        </Card>

        {/* Grid Table */}
        {displayRows.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>{Locale.label("plans.servingOverviewPage.noData")}</Box>
        ) : (
          <Card>
            <TableContainer sx={{ maxHeight: "70vh", overflowX: "auto" }}>
              <Table size="small">
                <TableHead sx={{ backgroundColor: "background.subtle" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, position: "sticky", left: 0, zIndex: 3, backgroundColor: "background.subtle", minWidth: 200 }}>{Locale.label("plans.servingOverviewPage.position")}</TableCell>
                    {dates.map(d => (
                      <TableCell key={d} sx={{ fontWeight: 700, textAlign: "center", whiteSpace: "nowrap" }}>{formatShortDate(d)}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayRows.map(row => (
                    <TableRow key={row.position}>
                      <TableCell sx={{ fontWeight: 600, position: "sticky", left: 0, backgroundColor: "background.paper", zIndex: 1 }}>
                        <span style={{ color: "var(--text-muted)" }}>{row.categoryName ? row.categoryName + ": " : ""}</span>{row.positionName}
                      </TableCell>
                      {dates.map(d => {
                        const cell = row.cells[d];
                        const isActive = row.activeDates.has(d);
                        const filled = cell ? cellFilled(cell) : 0;
                        const isGap = isActive && cell && filled < cell.needed;
                        const ids = cell ? cellPersonIds(cell) : [];
                        const isHighlight = !!highlightPersonId && ids.includes(highlightPersonId);
                        const content = isActive ? (ids.map(id => getDisplayName(id)).join(", ") || "—") : "";
                        return (
                          <TableCell
                            key={d}
                            onClick={isActive && canEdit ? () => setEditingKey({ rowKey: row.position, date: d }) : undefined}
                            data-testid={isActive ? `matrix-cell-${row.position}-${d}` : undefined}
                            sx={{
                              textAlign: "center",
                              backgroundColor: isHighlight ? "warning.light" : isGap ? "error.light" : undefined,
                              color: isHighlight ? "warning.contrastText" : isGap ? "error.contrastText" : undefined,
                              whiteSpace: "nowrap",
                              fontSize: "0.8rem",
                              cursor: isActive && canEdit ? "pointer" : undefined
                            }}
                          >
                            {content}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        )}
      </Box>

      {/* Cell editor: one AssignmentEdit per slot, with remove for current people */}
      <Dialog open={!!editingCell} onClose={() => setEditingKey(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {editingRow ? `${editingRow.positionName} — ${editingKey ? formatShortDate(editingKey.date) : ""}` : ""}
          <IconButton onClick={() => setEditingKey(null)} sx={{ position: "absolute", right: 8, top: 8 }} data-testid="matrix-cell-close"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {editingCell?.slots.map(slot => (
            <Box key={slot.positionId} sx={{ mb: 2 }}>
              {slot.assignments.map(a => (
                <Stack key={a.assignmentId} direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                  <span>{getDisplayName(a.personId)}</span>
                  <Tooltip title={Locale.label("plans.servingOverviewPage.remove")}>
                    <IconButton size="small" onClick={() => removeAssignment(a.assignmentId)} data-testid={"matrix-remove-" + a.personId}><ClearIcon fontSize="small" /></IconButton>
                  </Tooltip>
                </Stack>
              ))}
              <AssignmentEdit
                key={slot.positionId}
                position={{ id: slot.positionId, groupId: slot.groupId, count: slot.needed, name: editingRow?.positionName } as PositionInterface}
                assignment={{ positionId: slot.positionId } as AssignmentInterface}
                peopleNeeded={slot.needed - slot.assignments.length}
                updatedFunction={(done: boolean) => { overviewData.refetch(); if (done) setEditingKey(null); }}
              />
            </Box>
          ))}
        </DialogContent>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack("")} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert onClose={() => setSnack("")} severity="info" variant="filled" sx={{ width: "100%" }}>{snack}</Alert>
      </Snackbar>
    </>
  );
};
