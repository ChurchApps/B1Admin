import React from "react";
import { ApiHelper, ArrayHelper, DateHelper, Loading, Locale, Permissions, UserHelper, type PersonInterface } from "@churchapps/apphelper";
import { type AssignmentInterface, type BlockoutDateInterface, type GroupMemberInterface, type PositionInterface } from "@churchapps/helpers";
import { Alert, Box, Dialog, DialogContent, DialogTitle, FormControl, IconButton, InputLabel, MenuItem, Select, Snackbar, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip } from "@mui/material";
import { ArrowBack as BackIcon, AutoFixHigh as AutoIcon, Block as DeclinedIcon, Close as CloseIcon, Clear as ClearIcon, HourglassEmpty as PendingIcon, MailOutline as EmailIcon, Sms as SmsIcon } from "@mui/icons-material";
import { EmptyState, ExportButton, HeaderPrimaryButton, HeaderSecondaryButton, HeaderTextButton, PageContainer, PageHeader, PillTabs, StatusBadge, Surface } from "../components/ui";
import { hasPlansEditAccess } from "../helpers";
import { useConfirmDelete, useTextingEnabled } from "../hooks";
import { AssignmentEdit } from "./components/AssignmentEdit";
import { SendTextDialog } from "../groups/components/SendTextDialog";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { AppDatePicker } from "../components";
import { findBlockout, loadUpcomingBlockouts } from "./helpers/blockoutHelper";
import { UnavailableBadge } from "./components/UnavailableBadge";

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
  return DateHelper.toDate(dateStr).toLocaleDateString(DateHelper.locale, { month: "short", day: "numeric" });
};

// A declined assignment stays on the grid so staff can see who said no, but its slot counts as open.
const isDeclined = (a: CellAssignment) => a.status === "Declined";
const isPending = (a: CellAssignment) => a.status !== "Accepted" && !isDeclined(a);
const activeCount = (slot: CellSlot) => slot.assignments.filter((a) => !isDeclined(a)).length;
const cellFilled = (cell: GridCell) => cell.slots.reduce((s, slot) => s + activeCount(slot), 0);
const cellAssignments = (cell: GridCell) => cell.slots.flatMap((slot) => slot.assignments);
const cellPersonIds = (cell: GridCell) => cellAssignments(cell).map((a) => a.personId);

const statusLabel = (a: CellAssignment) => isDeclined(a)
  ? Locale.label("plans.servingOverviewPage.declined", "Declined")
  : isPending(a) ? Locale.label("plans.servingOverviewPage.pending", "Pending") : "";

// Shape and text, not just color: an icon with a spoken/hover label, and declined names struck through.
const StatusMark: React.FC<{ assignment: CellAssignment }> = ({ assignment }) => {
  const label = statusLabel(assignment);
  if (!label) return null;
  const Icon = isDeclined(assignment) ? DeclinedIcon : PendingIcon;
  return <Icon titleAccess={label} data-testid={isDeclined(assignment) ? "assignment-declined" : "assignment-pending"} sx={{ fontSize: 14, ml: 0.25, verticalAlign: "-2px", color: isDeclined(assignment) ? "var(--b1-danger)" : "text.secondary" }} />;
};

const nameSx = (a: CellAssignment) => (isDeclined(a) ? { textDecoration: "line-through", color: "text.secondary" } : undefined);

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
  const canEdit = hasPlansEditAccess();

  const [editingKey, setEditingKey] = React.useState<{ rowKey: string; date: string } | null>(null);
  const [highlightPersonId, setHighlightPersonId] = React.useState("");
  const [gapsOnly, setGapsOnly] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [snack, setSnack] = React.useState("");
  const [showText, setShowText] = React.useState(false);
  const textingEnabled = useTextingEnabled();
  const canText = textingEnabled && UserHelper.checkAccess(Permissions.messagingApi.texting.send);
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

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

  // /plans/overview leaves declined assignments out, so load them for the same plans to show who declined.
  const planIds = React.useMemo(() => Array.from(new Set((overviewData.data || []).map(r => r.planId).filter(Boolean))).sort(), [overviewData.data]);
  const declined = useQuery<AssignmentInterface[]>({
    queryKey: ["/assignments/plan/ids", "DoingApi", planIds],
    enabled: planIds.length > 0,
    placeholderData: [],
    queryFn: async () => {
      const all: AssignmentInterface[] = await ApiHelper.get("/assignments/plan/ids?planIds=" + planIds.join(","), "DoingApi");
      return (all || []).filter(a => a.status === "Declined" && !!a.personId);
    }
  });
  const refreshGrid = () => { overviewData.refetch(); declined.refetch(); };

  const blockouts = useQuery<BlockoutDateInterface[]>({
    queryKey: ["/blockoutDates/upcoming", "DoingApi"],
    placeholderData: [],
    queryFn: loadUpcomingBlockouts
  });

  const blockoutBadge = (personId: string, date: string | undefined, compact?: boolean) => {
    const blockout = findBlockout(blockouts.data, personId, date);
    return blockout ? <UnavailableBadge blockout={blockout} compact={compact} /> : null;
  };

  const personIds = React.useMemo(() => {
    const ids = new Set<string>();
    (overviewData.data || []).forEach(r => { if (r.personId) ids.add(r.personId); });
    (declined.data || []).forEach(a => { if (a.personId) ids.add(a.personId); });
    return Array.from(ids);
  }, [overviewData.data, declined.data]);

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

  const rank = React.useMemo(() => new Map((people.data || []).map((p, i) => [p.id, i])), [people.data]);
  const byName = (a: string, b: string) => (rank.get(a) ?? Infinity) - (rank.get(b) ?? Infinity);

  // Slot per distinct positionId keeps same-named positions independently editable.
  const { dates, rows } = React.useMemo(() => {
    const dateSet = new Set<string>();
    const positionMap = new Map<string, GridRow>();
    const slotsById = new Map<string, CellSlot>();

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
        slotsById.set(r.positionId, slot);
      }
      if (r.personId) slot.assignments.push({ assignmentId: r.assignmentId, personId: r.personId, status: r.status });
    });

    (declined.data || []).forEach(a => {
      const slot = a.positionId ? slotsById.get(a.positionId) : undefined;
      if (slot && a.personId && !slot.assignments.some(x => x.assignmentId === a.id)) slot.assignments.push({ assignmentId: a.id || null, personId: a.personId, status: "Declined" });
    });

    const sortedDates = Array.from(dateSet).sort();
    const gridRows = Array.from(positionMap.values());
    return { dates: sortedDates, rows: gridRows };
  }, [overviewData.data, declined.data]);

  const displayRows = React.useMemo(() => {
    if (!gapsOnly) return rows;
    return rows.filter(row => dates.some(d => row.activeDates.has(d) && cellFilled(row.cells[d]) < (row.cells[d]?.needed || 0)));
  }, [rows, dates, gapsOnly]);

  // The export is the grid as shown, so Unfilled only carries over.
  const csvData = React.useMemo(() => {
    return displayRows.map(row => {
      const obj: Record<string, string> = { Position: row.position };
      dates.forEach(d => {
        const cell = row.cells[d];
        const names = cell ? [...cellAssignments(cell)].sort((a, b) => byName(a.personId, b.personId)).map(a => statusLabel(a) ? `${getDisplayName(a.personId)} (${statusLabel(a)})` : getDisplayName(a.personId)) : [];
        obj[formatShortDate(d)] = names.join("; ");
      });
      return obj;
    });
  }, [displayRows, dates, people.data]);

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

  const removeAssignment = async (assignmentId: string | null, personName: string) => {
    if (!assignmentId) return;
    const ok = await confirm(Locale.label("plans.servingOverviewPage.removeConfirm").replace("{name}", personName), { confirmLabel: Locale.label("plans.servingOverviewPage.remove") });
    if (!ok) return;
    await ApiHelper.delete("/assignments/" + assignmentId, "DoingApi");
    refreshGrid();
  };

  const handleAutoSchedule = async () => {
    const ok = await confirm(Locale.label("plans.servingOverviewPage.autoScheduleConfirm"), { destructive: false, confirmLabel: Locale.label("plans.servingOverviewPage.autoSchedule") });
    if (!ok) return;
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
        const teams = slots.map(s => ({ positionId: s.positionId, personIds: ArrayHelper.getAll(groupMembers, "groupId", s.groupId).map((m: GroupMemberInterface) => m.personId) }));
        try {
          const res = await ApiHelper.post("/plans/autofill/" + planId, { teams }, "DoingApi");
          if (res?.created > 0) filled++;
        } catch { /* plan skipped (e.g. no edit access) */ }
      }
      await Promise.all([overviewData.refetch(), declined.refetch()]);
      setSnack(Locale.label("plans.servingOverviewPage.autoScheduleResult").replace("{filled}", String(filled)).replace("{total}", String(total)));
    } finally {
      setBusy(false);
    }
  };

  const handleEmailAll = async () => {
    const ok = await confirm(Locale.label("plans.servingOverviewPage.emailAllConfirm"), { destructive: false, confirmLabel: Locale.label("plans.servingOverviewPage.emailAll") });
    if (!ok) return;
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
      <PageHeader title={planType.data?.name ? `${planType.data.name} ${Locale.label("plans.servingOverviewPage.overviewSuffix")}` : Locale.label("plans.servingOverviewPage.title")} subtitle={Locale.label("plans.servingOverviewPage.subtitle")}>
        <HeaderTextButton component={Link} to={planTypeId ? `/serving/planTypes/${planTypeId}` : "/serving/plans"} startIcon={<BackIcon />} data-testid="overview-back-link">
          {planType.data?.name || Locale.label("components.wrapper.plans", "Plans")}
        </HeaderTextButton>
        {displayRows.length > 0 && <ExportButton data={csvData} customHeaders={csvHeaders} filename={Locale.label("plans.servingOverviewPage.filename")} text={Locale.label("plans.servingOverviewPage.exportCsv")} />}
        {canEdit && (
          <HeaderSecondaryButton startIcon={<EmailIcon />} disabled={busy || !ministryId || rows.length === 0} onClick={handleEmailAll} data-testid="matrix-email-all">
            {Locale.label("plans.servingOverviewPage.emailAll")}
          </HeaderSecondaryButton>
        )}
        {canEdit && canText && (
          <HeaderSecondaryButton startIcon={<SmsIcon />} disabled={busy || !ministryId || rows.length === 0} onClick={() => setShowText(true)} data-testid="matrix-text-all">
            {Locale.label("plans.servingOverviewPage.textAll")}
          </HeaderSecondaryButton>
        )}
        {canEdit && (
          <HeaderPrimaryButton startIcon={<AutoIcon />} disabled={busy || rows.length === 0} onClick={handleAutoSchedule} data-testid="matrix-auto-schedule">
            {Locale.label("plans.servingOverviewPage.autoSchedule")}
          </HeaderPrimaryButton>
        )}
      </PageHeader>
      <PageContainer>
        <Surface disablePadding>
          <Stack spacing={3} sx={{ p: 3 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }} useFlexGap flexWrap="wrap">
              <PillTabs
                aria-label={Locale.label("plans.servingOverviewPage.gapsOnly")}
                value={gapsOnly ? "gaps" : "all"}
                onChange={(v) => setGapsOnly(v === "gaps")}
                options={[
                  { value: "all", label: Locale.label("plans.servingOverviewPage.allPositions", "All positions"), "data-testid": "all-positions-toggle" },
                  { value: "gaps", label: Locale.label("plans.servingOverviewPage.gapsOnly"), "data-testid": "gaps-only-toggle" }
                ]}
              />
              <AppDatePicker label={Locale.label("plans.servingOverviewPage.startDate")} value={startDate} onChange={(e) => setStartDate(e.target.value)} size="small" InputLabelProps={{ shrink: true }} />
              <AppDatePicker label={Locale.label("plans.servingOverviewPage.endDate")} value={endDate} onChange={(e) => setEndDate(e.target.value)} size="small" InputLabelProps={{ shrink: true }} />
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>{Locale.label("plans.servingOverviewPage.highlightPerson")}</InputLabel>
                <Select displayEmpty label={Locale.label("plans.servingOverviewPage.highlightPerson")} value={highlightPersonId} onChange={(e) => setHighlightPersonId(e.target.value)} data-testid="highlight-person-select">
                  <MenuItem value="">{Locale.label("plans.servingOverviewPage.highlightAll")}</MenuItem>
                  {[...personIds].sort(byName).map(id => <MenuItem key={id} value={id}>{getDisplayName(id)}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
            {displayRows.length === 0 && <EmptyState variant="plain" title={Locale.label("plans.servingOverviewPage.noData")} />}
            {displayRows.length > 0 && (
              <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap" sx={{ color: "text.secondary", fontSize: 13 }} data-testid="matrix-status-legend">
                <span><PendingIcon aria-hidden sx={{ fontSize: 14, verticalAlign: "-2px", mr: 0.5 }} />{Locale.label("plans.servingOverviewPage.pendingLegend", "Pending: not answered yet")}</span>
                <span><DeclinedIcon aria-hidden sx={{ fontSize: 14, verticalAlign: "-2px", mr: 0.5, color: "var(--b1-danger)" }} />{Locale.label("plans.servingOverviewPage.declinedLegend", "Declined: the slot is open again")}</span>
              </Stack>
            )}
          </Stack>
          {displayRows.length > 0 && (
            <TableContainer sx={{ maxHeight: "70vh", overflowX: "auto", borderTop: 1, borderColor: "divider" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ position: "sticky", left: 0, zIndex: 3, backgroundColor: "background.paper", minWidth: 200 }}>{Locale.label("plans.servingOverviewPage.position")}</TableCell>
                    {dates.map(d => (
                      <TableCell key={d} sx={{ textAlign: "center", whiteSpace: "nowrap" }}>{formatShortDate(d)}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayRows.map(row => (
                    <TableRow key={row.position}>
                      <TableCell sx={{ fontWeight: 600, position: "sticky", left: 0, backgroundColor: "background.paper", zIndex: 1 }}>
                        <span style={{ color: "var(--b1-muted)" }}>{row.categoryName ? row.categoryName + ": " : ""}</span>{row.positionName}
                      </TableCell>
                      {dates.map(d => {
                        const cell = row.cells[d];
                        const isActive = row.activeDates.has(d);
                        const filled = cell ? cellFilled(cell) : 0;
                        const isGap = isActive && cell && filled < cell.needed;
                        const ids = cell ? cellPersonIds(cell) : [];
                        const isHighlight = !!highlightPersonId && ids.includes(highlightPersonId);
                        const sorted = cell ? [...cellAssignments(cell)].sort((a, b) => byName(a.personId, b.personId)) : [];
                        const content = !isActive ? "" : sorted.length === 0 ? "—" : sorted.map((a, i) => (
                          <React.Fragment key={a.assignmentId || a.personId + i}>
                            {i > 0 && ", "}
                            <Box component="span" sx={nameSx(a)}>{getDisplayName(a.personId)}</Box><StatusMark assignment={a} />{blockoutBadge(a.personId, d, true)}
                          </React.Fragment>
                        ));
                        return (
                          <TableCell
                            key={d}
                            onClick={isActive && canEdit ? () => setEditingKey({ rowKey: row.position, date: d }) : undefined}
                            data-testid={isActive ? `matrix-cell-${row.position}-${d}` : undefined}
                            sx={{
                              textAlign: "center",
                              backgroundColor: isHighlight ? "var(--b1-warning-bg)" : isGap ? "var(--b1-danger-bg)" : undefined,
                              color: isHighlight ? "var(--b1-warning)" : isGap ? "var(--b1-danger)" : undefined,
                              whiteSpace: "nowrap",
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
          )}
        </Surface>
      </PageContainer>

      <Dialog open={!!editingCell} onClose={() => setEditingKey(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {editingRow ? `${editingRow.positionName} — ${editingKey ? formatShortDate(editingKey.date) : ""}` : ""}
          <IconButton onClick={() => setEditingKey(null)} sx={{ position: "absolute", right: 8, top: 8 }} data-testid="matrix-cell-close"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {editingCell?.slots.map(slot => (
            <Box key={slot.positionId} sx={{ mb: 2 }}>
              {[...slot.assignments].sort((a, b) => byName(a.personId, b.personId)).map(a => (
                <Stack key={a.assignmentId} direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Box component="span" sx={nameSx(a)}>{getDisplayName(a.personId)}</Box>
                    {statusLabel(a) && <StatusBadge tone={isDeclined(a) ? "danger" : "neutral"} data-testid={"matrix-status-" + a.personId}>{statusLabel(a)}</StatusBadge>}
                    {blockoutBadge(a.personId, editingKey?.date)}
                  </Stack>
                  <Tooltip title={Locale.label("plans.servingOverviewPage.remove")}>
                    <IconButton size="small" onClick={() => removeAssignment(a.assignmentId, getDisplayName(a.personId))} data-testid={"matrix-remove-" + a.personId}><ClearIcon fontSize="small" /></IconButton>
                  </Tooltip>
                </Stack>
              ))}
              <AssignmentEdit
                key={slot.positionId}
                position={{ id: slot.positionId, groupId: slot.groupId, count: slot.needed, name: editingRow?.positionName } as PositionInterface}
                assignment={{ positionId: slot.positionId } as AssignmentInterface}
                peopleNeeded={slot.needed - activeCount(slot)}
                assignedPersonIds={slot.assignments.map((a) => a.personId)}
                blockoutDates={blockouts.data}
                serviceDate={editingKey?.date}
                updatedFunction={(done: boolean) => { refreshGrid(); if (done) setEditingKey(null); }}
              />
            </Box>
          ))}
        </DialogContent>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack("")} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert onClose={() => setSnack("")} severity="info" variant="filled" sx={{ width: "100%" }}>{snack}</Alert>
      </Snackbar>
      {showText && <SendTextDialog range={{ startDate, endDate, ministryId, planTypeId }} onClose={() => setShowText(false)} />}
      {ConfirmDialogElement}
    </>
  );
};
