import React, { useState, useCallback } from "react";
import { UserHelper, Permissions, ApiHelper, Loading, Locale } from "@churchapps/apphelper";
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Chip, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Alert
} from "@mui/material";

import { Plate, h1Sx, ledeSx, verbSx } from "./plated";
import { PermissionDenied } from "../components";

interface Batch {
  id: string;
  label?: string;
  source?: string;
  status?: string;
  itemCount?: number;
  created?: string;
  userId?: string;
}

interface AuditRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  created: string;
}

interface UndoResult {
  restored: number;
  skippedConflicts: Array<{ entityType?: string; entityId?: string }>;
  failed: Array<{ entityType?: string; entityId?: string; reason?: string }>;
  status: string;
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleString();
};

const formatAction = (action: string) => (action || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const statusColor = (status?: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
  switch (status) {
    case "open": return "info";
    case "completed": return "primary";
    case "undone": return "success";
    case "partial": return "warning";
    case "failed": return "error";
    default: return "default";
  }
};

export const BatchesPage: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false);

  const [resultsBatch, setResultsBatch] = useState<Batch | null>(null);
  const [resultsRows, setResultsRows] = useState<AuditRow[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);

  const [undoBatch, setUndoBatch] = useState<Batch | null>(null);
  const [undoing, setUndoing] = useState(false);
  const [undoReport, setUndoReport] = useState<UndoResult | null>(null);

  const hasAccess = UserHelper.checkAccess(Permissions.membershipApi.settings.edit);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const data: Batch[] = await ApiHelper.get("/batches", "MembershipApi");
      setBatches(data || []);
    } catch (e) {
      console.error("Failed to load batches:", e);
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { if (hasAccess) fetchBatches(); }, [hasAccess, fetchBatches]);

  const openResults = useCallback(async (batch: Batch) => {
    setResultsBatch(batch);
    setResultsRows([]);
    setResultsLoading(true);
    try {
      const data: { batch: Batch; rows: AuditRow[] } = await ApiHelper.get(`/batches/${batch.id}/results`, "MembershipApi");
      setResultsRows(data?.rows || []);
    } catch (e) {
      console.error("Failed to load batch results:", e);
    } finally {
      setResultsLoading(false);
    }
  }, []);

  const runUndo = useCallback(async () => {
    if (!undoBatch) return;
    setUndoing(true);
    try {
      const result: UndoResult = await ApiHelper.post(`/batches/${undoBatch.id}/undo`, {}, "MembershipApi");
      setUndoReport(result);
      fetchBatches();
    } catch (e) {
      console.error("Failed to undo batch:", e);
      setUndoReport({ restored: 0, skippedConflicts: [], failed: [{ reason: Locale.label("settings.batches.undoError") }], status: "failed" });
    } finally {
      setUndoing(false);
    }
  }, [undoBatch, fetchBatches]);

  const closeUndo = useCallback(() => {
    setUndoBatch(null);
    setUndoReport(null);
  }, []);

  if (!hasAccess) return <PermissionDenied permissions={[Permissions.membershipApi.settings.edit]} />;

  return (
    <Plate directory>
      <Box component="h1" sx={h1Sx}>{Locale.label("settings.batches.title")}</Box>
      <Box sx={ledeSx}>{Locale.label("settings.batches.subtitle")}</Box>
      {loading ? <Loading /> : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{Locale.label("settings.batches.label")}</TableCell>
                <TableCell>{Locale.label("settings.batches.source")}</TableCell>
                <TableCell>{Locale.label("settings.batches.status")}</TableCell>
                <TableCell align="right">{Locale.label("settings.batches.items")}</TableCell>
                <TableCell>{Locale.label("settings.batches.created")}</TableCell>
                <TableCell>{Locale.label("settings.batches.creator")}</TableCell>
                <TableCell align="right">{Locale.label("settings.batches.actions")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {batches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>{Locale.label("settings.batches.noEntries")}</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                batches.map((batch) => (
                  <TableRow key={batch.id} hover>
                    <TableCell>{batch.label || "—"}</TableCell>
                    <TableCell>{batch.source || "—"}</TableCell>
                    <TableCell><Chip label={batch.status} color={statusColor(batch.status)} size="small" /></TableCell>
                    <TableCell align="right">{batch.itemCount ?? 0}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDate(batch.created)}</TableCell>
                    <TableCell><Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{batch.userId}</Typography></TableCell>
                    <TableCell align="right" className="rowActions">
                      <Box component="button" type="button" onClick={() => openResults(batch)} sx={verbSx}>{Locale.label("settings.batches.viewResults")}</Box>
                      {batch.status === "completed" && (
                        <Box component="button" type="button" onClick={() => setUndoBatch(batch)} sx={{ ...verbSx, ml: 2 }}>{Locale.label("settings.batches.undo")}</Box>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={!!resultsBatch} onClose={() => setResultsBatch(null)} maxWidth="md" fullWidth>
        <DialogTitle>{Locale.label("settings.batches.resultsTitle")}{resultsBatch?.label ? `: ${resultsBatch.label}` : ""}</DialogTitle>
        <DialogContent dividers>
          {resultsLoading ? <Loading /> : (
            resultsRows.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>{Locale.label("settings.batches.noResults")}</Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{Locale.label("settings.batches.date")}</TableCell>
                    <TableCell>{Locale.label("settings.batches.action")}</TableCell>
                    <TableCell>{Locale.label("settings.batches.entityType")}</TableCell>
                    <TableCell>{Locale.label("settings.batches.entityId")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {resultsRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDate(row.created)}</TableCell>
                      <TableCell>{formatAction(row.action)}</TableCell>
                      <TableCell>{row.entityType}</TableCell>
                      <TableCell><Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{row.entityId}</Typography></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setResultsBatch(null)}>{Locale.label("common.close")}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!undoBatch} onClose={undoing ? undefined : closeUndo} maxWidth="sm" fullWidth>
        <DialogTitle>{Locale.label("settings.batches.undoTitle")}</DialogTitle>
        <DialogContent dividers>
          {undoReport ? (
            <>
              <Alert severity={undoReport.status === "undone" ? "success" : "warning"} sx={{ mb: 2 }}>
                {Locale.label("settings.batches.restored").replace("{count}", String(undoReport.restored))}
              </Alert>
              {undoReport.skippedConflicts.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">{Locale.label("settings.batches.skipped").replace("{count}", String(undoReport.skippedConflicts.length))}</Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>{Locale.label("settings.batches.skippedHelp")}</Typography>
                  {undoReport.skippedConflicts.map((s, i) => (
                    <Typography key={i} variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{s.entityType} {s.entityId}</Typography>
                  ))}
                </Box>
              )}
              {undoReport.failed.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" color="error">{Locale.label("settings.batches.failed").replace("{count}", String(undoReport.failed.length))}</Typography>
                  {undoReport.failed.map((f, i) => (
                    <Typography key={i} variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{f.entityType} {f.entityId} — {f.reason}</Typography>
                  ))}
                </Box>
              )}
            </>
          ) : (
            <>
              <Alert severity="warning" sx={{ mb: 2 }}>{Locale.label("settings.batches.undoWarning")}</Alert>
              <Typography variant="body2">{Locale.label("settings.batches.undoConfirm").replace("{label}", undoBatch?.label || "")}</Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          {undoReport ? (
            <Button variant="contained" onClick={closeUndo}>{Locale.label("common.close")}</Button>
          ) : (
            <>
              <Button onClick={closeUndo} disabled={undoing}>{Locale.label("common.cancel")}</Button>
              <Button variant="contained" color="warning" onClick={runUndo} disabled={undoing}>
                {undoing ? Locale.label("settings.batches.undoing") : Locale.label("settings.batches.undo")}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Plate>
  );
};
