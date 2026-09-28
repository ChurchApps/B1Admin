import React from "react";
import { useQuery } from "@tanstack/react-query";
import { ApiHelper, DateHelper, DisplayBox, Locale } from "@churchapps/apphelper";
import { Alert, Button, Chip, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { useConfirmDelete } from "../../hooks";

interface ModuleStatus {
  module: string;
  applied: number;
  pending: string[];
  lastApplied?: { name: string; at: string };
  error?: string;
}

interface MigrationsResponse {
  environment: string;
  modules: ModuleStatus[];
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

  const pendingModules = (data?.modules || []).filter((m) => m.pending.length > 0);
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
                    <TableCell>{statusCell(m)}</TableCell>
                    <TableCell>{m.applied}</TableCell>
                    <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>{m.error || m.pending.join(", ") || "—"}</TableCell>
                    <TableCell sx={{ color: "text.secondary" }}>
                      {m.lastApplied ? m.lastApplied.name + " · " + DateHelper.prettyDateTime(new Date(m.lastApplied.at)) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
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
    </DisplayBox>
  );
};
