import React from "react";
import { useQuery } from "@tanstack/react-query";
import { ApiHelper, DateHelper, DisplayBox, Locale } from "@churchapps/apphelper";
import { Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { useConfirmDelete } from "../../hooks";

interface ModuleStatus {
  module: string;
  applied: number;
  pending: string[];
  lastApplied?: { name: string; at: string };
  noHistory?: boolean;
  error?: string;
}

interface MigrationsResponse {
  environment: string;
  modules: ModuleStatus[];
}

interface DetectedMigration {
  name: string;
  state: "applied" | "missing" | "partial" | "unknown";
  checks: number;
  failing: string[];
}

interface ModuleDetection {
  module: string;
  migrations: DetectedMigration[];
  suggested: string[];
  blocked?: string;
  error?: string;
}

interface ModuleRun {
  module: string;
  applied: string[];
  failed?: string;
  error?: string;
}

// Deploys do not run database migrations. This tab runs them from inside the Api,
// which is the only place that can reach the production databases.
export const MigrationsTab = () => {
  const { data, isLoading: loading, refetch } = useQuery<MigrationsResponse>({ queryKey: ["/serverHealth/migrations", "MembershipApi"] });
  const { confirm, ConfirmDialogElement } = useConfirmDelete();
  const [running, setRunning] = React.useState<string | null>(null);
  const [runs, setRuns] = React.useState<ModuleRun[]>([]);
  const [detection, setDetection] = React.useState<ModuleDetection | null>(null);
  const [detecting, setDetecting] = React.useState<string | null>(null);
  const [baselineError, setBaselineError] = React.useState("");

  // A module with no history: compare each migration's fingerprint with the live schema
  // (read-only), then record the ones that are provably there so only real gaps stay pending.
  const checkSchema = async (moduleName: string) => {
    setDetecting(moduleName);
    setBaselineError("");
    try {
      setDetection(await ApiHelper.get("/serverHealth/migrations/" + moduleName + "/detect", "MembershipApi"));
    } catch (e: any) {
      setDetection({ module: moduleName, migrations: [], suggested: [], error: e?.message || String(e) });
    }
    setDetecting(null);
  };

  const recordBaseline = async () => {
    if (!detection) return;
    const msg = Locale.label("serverAdmin.migrationsTab.baselineConfirm")
      .replace("{count}", String(detection.suggested.length))
      .replace("{module}", detection.module)
      .replace("{environment}", data?.environment || "");
    if (!(await confirm(msg, { title: Locale.label("serverAdmin.migrationsTab.baseline"), confirmLabel: Locale.label("serverAdmin.migrationsTab.baseline") }))) return;
    try {
      const result: { recorded: string[]; error?: string } = await ApiHelper.post("/serverHealth/migrations/" + detection.module + "/baseline", { names: detection.suggested }, "MembershipApi");
      if (result.error) { setBaselineError(result.error); return; }
      setDetection(null);
      await refetch();
    } catch (e: any) {
      setBaselineError(e?.message || String(e));
    }
  };

  const stateChip = (d: DetectedMigration) => {
    const color = d.state === "applied" ? "success" : d.state === "missing" ? "warning" : d.state === "partial" ? "error" : "default";
    return <Chip label={Locale.label("serverAdmin.migrationsTab.state_" + d.state)} size="small" color={color} variant={d.state === "unknown" ? "outlined" : "filled"} />;
  };

  // A module with no migration history is never run from here: its "pending" list is every
  // migration since the initial schema, and the Api refuses it too.
  const pendingModules = (data?.modules || []).filter((m) => m.pending.length > 0 && !m.noHistory && !m.error);
  const untracked = (data?.modules || []).filter((m) => m.noHistory);
  const pendingCount = pendingModules.reduce((n, m) => n + m.pending.length, 0);

  const runAll = async () => {
    const msg = Locale.label("serverAdmin.migrationsTab.confirm")
      .replace("{count}", String(pendingCount))
      .replace("{environment}", data?.environment || "");
    if (!(await confirm(msg, { title: Locale.label("serverAdmin.migrationsTab.run"), confirmLabel: Locale.label("serverAdmin.migrationsTab.run"), destructive: true }))) return;
    const out: ModuleRun[] = [];
    // One request per module keeps each call short; stop at the first failure.
    for (const m of pendingModules) {
      setRunning(m.module);
      try {
        const run: ModuleRun = await ApiHelper.post("/serverHealth/migrations/" + m.module + "/run", {}, "MembershipApi");
        out.push(run);
        if (run.error) break;
      } catch (e: any) {
        out.push({ module: m.module, applied: [], error: e?.message || String(e) });
        break;
      }
    }
    setRuns(out);
    setRunning(null);
    await refetch();
  };

  const statusCell = (m: ModuleStatus) => {
    if (m.error) return <Chip label={Locale.label("serverAdmin.migrationsTab.error")} size="small" color="error" />;
    if (m.noHistory) return <Chip label={Locale.label("serverAdmin.migrationsTab.noHistory")} size="small" color="default" variant="outlined" />;
    if (m.pending.length === 0) return <Chip label={Locale.label("serverAdmin.migrationsTab.upToDate")} size="small" color="success" />;
    return <Chip label={Locale.label("serverAdmin.migrationsTab.pendingCount").replace("{count}", String(m.pending.length))} size="small" color="warning" />;
  };

  return (
    <DisplayBox headerIcon="storage" headerText={Locale.label("serverAdmin.migrationsTab.title")}>
      {ConfirmDialogElement}
      {loading && <Typography>{Locale.label("common.loading")}</Typography>}
      {!loading && !data && <Typography color="error">{Locale.label("serverAdmin.migrationsTab.loadError")}</Typography>}
      {!loading && data && (
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            {Locale.label("serverAdmin.serverHealth.environment")}: <strong>{data.environment || "—"}</strong>. {Locale.label("serverAdmin.migrationsTab.subtitle")}
          </Typography>
          <Paper sx={{ width: "100%", overflowX: "auto" }}>
            <Table size="small" id="adminMigrationsTable">
              <TableHead>
                <TableRow>
                  <TableCell>{Locale.label("serverAdmin.migrationsTab.module")}</TableCell>
                  <TableCell>{Locale.label("serverAdmin.serverHealth.status")}</TableCell>
                  <TableCell>{Locale.label("serverAdmin.migrationsTab.applied")}</TableCell>
                  <TableCell>{Locale.label("serverAdmin.migrationsTab.pending")}</TableCell>
                  <TableCell>{Locale.label("serverAdmin.migrationsTab.lastApplied")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.modules.map((m) => (
                  <TableRow key={m.module} data-testid={"migration-row-" + m.module}>
                    <TableCell>{m.module}</TableCell>
                    <TableCell>
                      {statusCell(m)}
                      {m.noHistory && (
                        <Button size="small" sx={{ ml: 1 }} disabled={!!detecting} onClick={() => checkSchema(m.module)} data-testid={"check-schema-" + m.module}>
                          {detecting === m.module ? Locale.label("common.loading") : Locale.label("serverAdmin.migrationsTab.checkSchema")}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>{m.applied}</TableCell>
                    <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>{m.error || (m.noHistory ? "—" : m.pending.join(", ")) || "—"}</TableCell>
                    <TableCell sx={{ color: "text.secondary" }}>
                      {m.lastApplied ? m.lastApplied.name + " · " + DateHelper.prettyDateTime(new Date(m.lastApplied.at)) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
          {untracked.length > 0 && (
            <Alert severity="warning" data-testid="migrations-no-history">
              {Locale.label("serverAdmin.migrationsTab.noHistoryNote").replace("{modules}", untracked.map((m) => m.module).join(", "))}
            </Alert>
          )}
          <Stack direction="row" spacing={2} alignItems="center">
            <Button variant="contained" color="warning" disabled={pendingCount === 0 || !!running} onClick={runAll} data-testid="run-migrations-button">
              {running ? Locale.label("serverAdmin.migrationsTab.running").replace("{module}", running) : Locale.label("serverAdmin.migrationsTab.run")}
            </Button>
            {pendingCount === 0 && <Typography variant="body2" color="text.secondary">{Locale.label("serverAdmin.migrationsTab.nothingPending")}</Typography>}
          </Stack>
          {runs.map((r) => (
            <Alert key={r.module} severity={r.error ? "error" : "success"} data-testid={"migration-result-" + r.module}>
              <strong>{r.module}</strong>: {r.applied.length ? r.applied.join(", ") : Locale.label("serverAdmin.migrationsTab.noneApplied")}
              {r.error && <> — {r.failed ? r.failed + ": " : ""}{r.error}</>}
            </Alert>
          ))}
        </Stack>
      )}
      <Dialog open={!!detection} onClose={() => setDetection(null)} maxWidth="md" fullWidth data-testid="migrations-detect-dialog">
        {detection && (
          <>
            <DialogTitle>{Locale.label("serverAdmin.migrationsTab.detectTitle").replace("{module}", detection.module)}</DialogTitle>
            <DialogContent>
              <Stack spacing={2}>
                <Typography variant="body2" color="text.secondary">{Locale.label("serverAdmin.migrationsTab.detectSubtitle")}</Typography>
                {detection.error && <Alert severity="error">{detection.error}</Alert>}
                {detection.blocked && <Alert severity="error">{detection.blocked}</Alert>}
                {baselineError && <Alert severity="error">{baselineError}</Alert>}
                <Table size="small">
                  <TableBody>
                    {detection.migrations.map((d) => (
                      <TableRow key={d.name} data-testid={"detect-row-" + d.name}>
                        <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>{d.name}</TableCell>
                        <TableCell>{stateChip(d)}</TableCell>
                        <TableCell sx={{ color: "text.secondary", fontSize: 12 }}>{d.failing.join("; ")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {!detection.error && !detection.blocked && (
                  <Typography variant="body2">
                    {Locale.label("serverAdmin.migrationsTab.detectSummary")
                      .replace("{count}", String(detection.suggested.length))
                      .replace("{pending}", String(detection.migrations.length - detection.suggested.length))}
                  </Typography>
                )}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetection(null)}>{Locale.label("common.cancel")}</Button>
              <Button variant="contained" disabled={!!detection.error || !!detection.blocked || detection.suggested.length === 0} onClick={recordBaseline} data-testid="record-baseline-button">
                {Locale.label("serverAdmin.migrationsTab.baseline")}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </DisplayBox>
  );
};
