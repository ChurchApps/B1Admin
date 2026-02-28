import React, { useState, useCallback, useMemo } from "react";
import { UserHelper, Permissions, ApiHelper, Loading, ExportLink, PageHeader } from "@churchapps/apphelper";
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination,
  TextField, Select, MenuItem, FormControl, InputLabel, Button, Card, Stack, Chip, Typography
} from "@mui/material";
import { History as HistoryIcon, FileDownload as ExportIcon, Search as SearchIcon } from "@mui/icons-material";

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
  created: string;
}

interface AuditLogResponse {
  logs: AuditLog[];
  count: number;
  limit: number;
  offset: number;
}

const CATEGORIES = [
  { value: "", label: "All Categories" },
  { value: "login", label: "Login" },
  { value: "person", label: "People" },
  { value: "permission", label: "Permissions" },
  { value: "donation", label: "Donations" },
  { value: "group", label: "Groups" },
  { value: "form", label: "Forms" },
  { value: "settings", label: "Settings" },
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

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [category, setCategory] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchLogs = useCallback(async (pageNum: number, limit: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
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
  }, [category, startDate, endDate]);

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
      Category: l.category,
      Action: formatAction(l.action),
      "Entity Type": l.entityType || "",
      "Entity ID": l.entityId || "",
      "User ID": l.userId || "",
      "IP Address": l.ipAddress || "",
      Details: l.details || ""
    }))
  , [logs]);

  if (!UserHelper.checkAccess(Permissions.membershipApi.server.admin)) return <></>;

  return (
    <>
      <PageHeader icon={<HistoryIcon />} title="Audit Log" subtitle="Track changes and activity across your church" />

      <Box sx={{ p: 3 }}>
        <Card sx={{ mb: 3, p: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Category</InputLabel>
              <Select value={category} label="Category" onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField size="small" type="date" label="Start Date" value={startDate} onChange={(e) => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField size="small" type="date" label="End Date" value={endDate} onChange={(e) => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} />
            <Button variant="contained" startIcon={<SearchIcon />} onClick={handleSearch}>Search</Button>
            {logs.length > 0 && (
              <Button variant="outlined" startIcon={<ExportIcon />} component={ExportLink} data={exportData} filename="audit-log.csv">Export CSV</Button>
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
                      <TableCell>Date</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Action</TableCell>
                      <TableCell>Entity</TableCell>
                      <TableCell>IP Address</TableCell>
                      <TableCell>Details</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>No audit log entries found</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map((log) => (
                        <TableRow key={log.id} hover>
                          <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDate(log.created)}</TableCell>
                          <TableCell><Chip label={log.category} color={categoryColor(log.category)} size="small" /></TableCell>
                          <TableCell>{formatAction(log.action)}</TableCell>
                          <TableCell>
                            {log.entityType && <Typography variant="caption" color="text.secondary">{log.entityType}</Typography>}
                            {log.entityId && <Typography variant="body2">{log.entityId}</Typography>}
                          </TableCell>
                          <TableCell><Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{log.ipAddress}</Typography></TableCell>
                          <TableCell sx={{ maxWidth: 300 }}>
                            <Typography variant="body2" noWrap title={log.details}>{log.details}</Typography>
                          </TableCell>
                        </TableRow>
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
