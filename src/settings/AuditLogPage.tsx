import React, { useState, useCallback, useMemo } from "react";
import { UserHelper, Permissions, ApiHelper, Loading, PageHeader, Locale } from "@churchapps/apphelper";
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, Select, MenuItem, FormControl, InputLabel, Button, Card, Stack, Chip, Typography,
  IconButton, Collapse, CircularProgress
} from "@mui/material";
import { Search as SearchIcon, KeyboardArrowDown as ExpandIcon, KeyboardArrowUp as CollapseIcon, History as HistoryIcon } from "@mui/icons-material";
import { ExportButton } from "../components/ui";
import { AppDatePicker } from "../components";

interface AuditLog {
  id: string;
  churchId: string;
  userId: string;
  category: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  ipAddress: string;
  module: string;
  batchId: string;
  created: string;
}

interface AuditLogResponse {
  logs: AuditLog[];
  count: number;
  limit: number;
  offset: number;
}

const getCategories = () => [
  { value: "", label: Locale.label("settings.auditLogPage.allCategories") },
  { value: "login", label: Locale.label("settings.auditLogPage.categoryLogin") },
  { value: "person", label: Locale.label("settings.auditLogPage.categoryPerson") },
  { value: "permission", label: Locale.label("settings.auditLogPage.categoryPermission") },
  { value: "donation", label: Locale.label("settings.auditLogPage.categoryDonation") },
  { value: "group", label: Locale.label("settings.auditLogPage.categoryGroup") },
  { value: "form", label: Locale.label("settings.auditLogPage.categoryForm") },
  { value: "settings", label: Locale.label("settings.auditLogPage.categorySettings") }
];

const getModules = () => [
  { value: "", label: Locale.label("settings.auditLogPage.allModules") },
  { value: "membership", label: Locale.label("settings.auditLogPage.moduleMembership") },
  { value: "giving", label: Locale.label("settings.auditLogPage.moduleGiving") },
  { value: "attendance", label: Locale.label("settings.auditLogPage.moduleAttendance") },
  { value: "messaging", label: Locale.label("settings.auditLogPage.moduleMessaging") },
  { value: "content", label: Locale.label("settings.auditLogPage.moduleContent") },
  { value: "doing", label: Locale.label("settings.auditLogPage.moduleDoing") },
  { value: "lessons", label: Locale.label("settings.auditLogPage.moduleLessons") }
];

const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleString();
};

const formatAction = (action: string) => action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const categoryColor = (category: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
  switch (category) {
    case "login": return "info";
    case "permission": return "error";
    case "donation": return "success";
    case "person": return "primary";
    case "group": return "secondary";
    case "form": return "warning";
    case "settings": return "default";
    default: return "default";
  }
};

const parseDetails = (details: string): any => {
  if (!details) return null;
  try { return JSON.parse(details); } catch { return null; }
};

const displayValue = (v: any): string => {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

const isDelete = (action: string) => (action || "").toLowerCase().includes("delet");

const AuditLogDetails: React.FC<{ log: AuditLog }> = ({ log }) => {
  const [loading, setLoading] = useState(true);
  const [oldValues, setOldValues] = useState<any>(null);
  const [newValues, setNewValues] = useState<any>(null);
  const [before, setBefore] = useState<any>(null);
  const [truncated, setTruncated] = useState(false);

  React.useEffect(() => {
    let active = true;
    const resolve = async () => {
      setLoading(true);
      const parsed = parseDetails(log.details);
      if (parsed?.truncated) setTruncated(true);

      if (isDelete(log.action)) {
        if (active) { setBefore(parsed?.before ?? null); setLoading(false); }
        return;
      }

      const after = parsed?.after ?? null;
      if (active) setNewValues(after);

      // Reconstruct old values from this entity's previous audit entry.
      if (log.entityType && log.entityId) {
        try {
          const params = new URLSearchParams();
          params.set("entityType", log.entityType);
          params.set("entityId", log.entityId);
          params.set("limit", "10");
          const data: AuditLogResponse = await ApiHelper.get(`/auditlogs?${params.toString()}`, "MembershipApi");
          const thisCreated = new Date(log.created).getTime();
          const prev = (data.logs || []).find((l) => l.id !== log.id && new Date(l.created).getTime() < thisCreated);
          const prevAfter = prev ? parseDetails(prev.details)?.after ?? null : null;
          if (active) setOldValues(prevAfter);
        } catch (e) {
          console.error("Failed to load previous audit entry:", e);
        }
      }
      if (active) setLoading(false);
    };
    resolve();
    return () => { active = false; };
  }, [log]);

  if (loading) return <Box sx={{ py: 2, px: 3 }}><CircularProgress size={20} /></Box>;

  if (isDelete(log.action)) {
    if (!before) return <Typography variant="body2" color="text.secondary" sx={{ py: 2, px: 3 }}>{Locale.label("settings.auditLogPage.noDetails")}</Typography>;
    const keys = Object.keys(before);
    return (
      <Box sx={{ py: 2, px: 3 }}>
        <Typography variant="subtitle2" gutterBottom>{Locale.label("settings.auditLogPage.deletedRecord")}</Typography>
        {truncated && <Typography variant="caption" color="warning.main" display="block" sx={{ mb: 1 }}>{Locale.label("settings.auditLogPage.truncated")}</Typography>}
        <Table size="small">
          <TableBody>
            {keys.map((k) => (
              <TableRow key={k}>
                <TableCell sx={{ fontWeight: 500, width: "30%" }}>{k}</TableCell>
                <TableCell><Typography variant="body2" sx={{ wordBreak: "break-word" }}>{displayValue(before[k])}</Typography></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    );
  }

  if (!newValues) return <Typography variant="body2" color="text.secondary" sx={{ py: 2, px: 3 }}>{Locale.label("settings.auditLogPage.noDetails")}</Typography>;

  const keys = Array.from(new Set([...Object.keys(oldValues || {}), ...Object.keys(newValues || {})]));
  return (
    <Box sx={{ py: 2, px: 3 }}>
      <Typography variant="subtitle2" gutterBottom>{Locale.label("settings.auditLogPage.changes")}</Typography>
      {truncated && <Typography variant="caption" color="warning.main" display="block" sx={{ mb: 1 }}>{Locale.label("settings.auditLogPage.truncated")}</Typography>}
      {!oldValues && <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>{Locale.label("settings.auditLogPage.noPrevious")}</Typography>}
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 500 }}>{Locale.label("settings.auditLogPage.field")}</TableCell>
            <TableCell sx={{ fontWeight: 500 }}>{Locale.label("settings.auditLogPage.oldValue")}</TableCell>
            <TableCell sx={{ fontWeight: 500 }}>{Locale.label("settings.auditLogPage.newValue")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {keys.map((k) => {
            const oldV = displayValue(oldValues?.[k]);
            const newV = displayValue(newValues?.[k]);
            const changed = oldV !== newV;
            return (
              <TableRow key={k} sx={changed ? { backgroundColor: "action.hover" } : undefined}>
                <TableCell sx={{ fontWeight: 500, width: "25%" }}>{k}</TableCell>
                <TableCell><Typography variant="body2" color={changed ? "error.main" : "text.secondary"} sx={{ wordBreak: "break-word" }}>{oldV}</Typography></TableCell>
                <TableCell><Typography variant="body2" color={changed ? "success.main" : "text.secondary"} sx={{ wordBreak: "break-word" }}>{newV}</Typography></TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );
};

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [category, setCategory] = useState("");
  const [module, setModule] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async (pageNum: number, limit: number) => {
    setLoading(true);
    setExpandedId(null);
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (module) params.set("module", module);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      params.set("limit", limit.toString());
      params.set("offset", (pageNum * limit).toString());

      const data: AuditLogResponse = await ApiHelper.get(`/auditlogs?${params.toString()}`, "MembershipApi");
      setLogs(data.logs || []);
      setTotalCount(data.count || 0);
    } catch (e) {
      console.error("Failed to load audit logs:", e);
      setLogs([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [category, module, startDate, endDate]);

  const handleSearch = useCallback(() => {
    setPage(0);
    fetchLogs(0, rowsPerPage);
  }, [fetchLogs, rowsPerPage]);

  const handlePageChange = useCallback((_: unknown, newPage: number) => {
    setPage(newPage);
    fetchLogs(newPage, rowsPerPage);
  }, [fetchLogs, rowsPerPage]);

  const handleRowsPerPageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newLimit = parseInt(e.target.value, 10);
    setRowsPerPage(newLimit);
    setPage(0);
    fetchLogs(0, newLimit);
  }, [fetchLogs]);

  React.useEffect(() => { fetchLogs(0, rowsPerPage); }, []);

  const exportData = useMemo(() =>
    logs.map((l) => ({
      Date: formatDate(l.created),
      Module: l.module || "",
      Category: l.category,
      Action: formatAction(l.action),
      "Entity Type": l.entityType || "",
      "Entity ID": l.entityId || "",
      "User ID": l.userId || "",
      "IP Address": l.ipAddress || "",
      Details: l.details || ""
    }))
  , [logs]);

  if (!UserHelper.checkAccess(Permissions.membershipApi.settings.edit)) return <></>;

  return (
    <>
      <PageHeader icon={<HistoryIcon />} title={Locale.label("settings.auditLogPage.title")} subtitle={Locale.label("settings.auditLogPage.subtitle")} />

      <Box sx={{ p: 3 }}>
        <Card sx={{ mb: 3, p: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>{Locale.label("settings.auditLogPage.module")}</InputLabel>
              <Select displayEmpty value={module} label={Locale.label("settings.auditLogPage.module")} onChange={(e) => setModule(e.target.value)}>
                {getModules().map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>{Locale.label("settings.auditLogPage.category")}</InputLabel>
              <Select displayEmpty value={category} label={Locale.label("settings.auditLogPage.category")} onChange={(e) => setCategory(e.target.value)}>
                {getCategories().map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
              </Select>
            </FormControl>
            <AppDatePicker size="small"  label={Locale.label("settings.auditLogPage.startDate")} value={startDate} onChange={(e) => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} />
            <AppDatePicker size="small"  label={Locale.label("settings.auditLogPage.endDate")} value={endDate} onChange={(e) => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} />
            <Button variant="contained" startIcon={<SearchIcon />} onClick={handleSearch}>{Locale.label("settings.auditLogPage.search")}</Button>
            {logs.length > 0 && (
              <ExportButton data={exportData} filename="audit-log.csv" text={Locale.label("settings.auditLogPage.exportCsv")} />
            )}
          </Stack>
        </Card>

        <Card>
          {loading ? <Loading /> : (
            <>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: 40 }} />
                      <TableCell>{Locale.label("settings.auditLogPage.date")}</TableCell>
                      <TableCell>{Locale.label("settings.auditLogPage.module")}</TableCell>
                      <TableCell>{Locale.label("settings.auditLogPage.category")}</TableCell>
                      <TableCell>{Locale.label("settings.auditLogPage.action")}</TableCell>
                      <TableCell>{Locale.label("settings.auditLogPage.entity")}</TableCell>
                      <TableCell>{Locale.label("settings.auditLogPage.ipAddress")}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>{Locale.label("settings.auditLogPage.noEntries")}</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map((log) => (
                        <React.Fragment key={log.id}>
                          <TableRow hover>
                            <TableCell>
                              <IconButton size="small" onClick={() => setExpandedId(expandedId === log.id ? null : log.id)} aria-label={Locale.label("settings.auditLogPage.details")}>
                                {expandedId === log.id ? <CollapseIcon /> : <ExpandIcon />}
                              </IconButton>
                            </TableCell>
                            <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDate(log.created)}</TableCell>
                            <TableCell>{log.module && <Typography variant="body2">{log.module}</Typography>}</TableCell>
                            <TableCell><Chip label={log.category} color={categoryColor(log.category)} size="small" /></TableCell>
                            <TableCell>{formatAction(log.action)}</TableCell>
                            <TableCell>
                              {log.entityType && <Typography variant="caption" color="text.secondary">{log.entityType}</Typography>}
                              {log.entityId && <Typography variant="body2">{log.entityId}</Typography>}
                            </TableCell>
                            <TableCell><Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{log.ipAddress}</Typography></TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell colSpan={7} sx={{ py: 0, borderBottom: expandedId === log.id ? undefined : "none" }}>
                              <Collapse in={expandedId === log.id} timeout="auto" unmountOnExit>
                                {expandedId === log.id && <AuditLogDetails log={log} />}
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        </React.Fragment>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={totalCount}
                page={page}
                onPageChange={handlePageChange}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleRowsPerPageChange}
                rowsPerPageOptions={[25, 50, 100]}
              />
            </>
          )}
        </Card>
      </Box>
    </>
  );
};
