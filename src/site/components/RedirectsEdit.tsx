import { useEffect, useState } from "react";
import { Alert, Box, Button, Card, Icon, IconButton, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import type { GenericSettingInterface } from "@churchapps/helpers";

interface RedirectInterface { id?: string; fromPath?: string; toPath?: string; }

const parseError = (err: any): string => {
  const raw = err?.message || "";
  try { const json = JSON.parse(raw); if (json?.error) return json.error; } catch { /* not json */ }
  return raw || Locale.label("site.redirects.errSave");
};

export const RedirectsEdit: React.FC = () => {
  const [redirects, setRedirects] = useState<RedirectInterface[]>([]);
  const [fromPath, setFromPath] = useState("");
  const [toPath, setToPath] = useState("");
  const [error, setError] = useState("");

  const [settings, setSettings] = useState<GenericSettingInterface[]>([]);
  const [ga4, setGa4] = useState("");
  const [gaSaved, setGaSaved] = useState(false);

  const loadData = () => {
    ApiHelper.get("/redirects", "ContentApi").then((data: RedirectInterface[]) => setRedirects(data || []));
    ApiHelper.get("/settings", "ContentApi").then((data: GenericSettingInterface[]) => {
      setSettings(data || []);
      const s = (data || []).find((d) => d.keyName === "ga4MeasurementId");
      if (s?.value) setGa4(s.value);
    });
  };

  useEffect(loadData, []);

  const handleAdd = () => {
    setError("");
    ApiHelper.post("/redirects", [{ fromPath, toPath }], "ContentApi").then(() => {
      setFromPath("");
      setToPath("");
      loadData();
    }).catch((err) => setError(parseError(err)));
  };

  const handleDelete = (id: string) => {
    ApiHelper.delete("/redirects/" + id, "ContentApi").then(loadData);
  };

  const handleSaveGa4 = () => {
    const existing = settings.find((s) => s.keyName === "ga4MeasurementId");
    const setting: GenericSettingInterface = existing ? { ...existing, value: ga4.trim() } : { keyName: "ga4MeasurementId", value: ga4.trim(), public: 1 } as GenericSettingInterface;
    ApiHelper.post("/settings", [setting], "ContentApi").then((data: GenericSettingInterface[]) => {
      setSettings((prev) => {
        const next = [...prev];
        (data || []).forEach((d) => { const idx = next.findIndex((s) => s.keyName === d.keyName); if (idx >= 0) next[idx] = d; else next.push(d); });
        return next;
      });
      setGaSaved(true);
      window.setTimeout(() => setGaSaved(false), 2500);
    });
  };

  return (
    <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "grey.200", mb: 3 }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: "var(--border-light)" }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Icon sx={{ color: "primary.main", fontSize: 20 }}>alt_route</Icon>
          <Typography variant="h6">{Locale.label("site.redirects.title")}</Typography>
        </Stack>
      </Box>
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{Locale.label("site.redirects.description")}</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }} data-testid="redirect-error">{error}</Alert>}
        {redirects.length > 0 && (
          <Table size="small" sx={{ mb: 2 }}>
            <TableHead>
              <TableRow>
                <TableCell><Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{Locale.label("site.redirects.fromPath")}</Typography></TableCell>
                <TableCell><Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{Locale.label("site.redirects.toPath")}</Typography></TableCell>
                <TableCell sx={{ width: 48 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {redirects.map((r) => (
                <TableRow key={r.id} data-testid="redirect-row">
                  <TableCell><Typography variant="body2" sx={{ fontFamily: "monospace" }}>{r.fromPath}</Typography></TableCell>
                  <TableCell><Typography variant="body2" sx={{ fontFamily: "monospace" }}>{r.toPath}</Typography></TableCell>
                  <TableCell className="rowActions"><IconButton size="small" onClick={() => handleDelete(r.id!)} data-testid="redirect-delete"><Icon fontSize="small">delete</Icon></IconButton></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }}>
          <TextField size="small" label={Locale.label("site.redirects.fromPath")} placeholder="/old-page" value={fromPath} onChange={(e) => setFromPath(e.target.value)} data-testid="redirect-from-input" />
          <TextField size="small" label={Locale.label("site.redirects.toPath")} placeholder="/new-page" value={toPath} onChange={(e) => setToPath(e.target.value)} data-testid="redirect-to-input" />
          <Button variant="contained" startIcon={<Icon>add</Icon>} onClick={handleAdd} disabled={!fromPath || !toPath} data-testid="redirect-add">{Locale.label("common.add")}</Button>
        </Stack>
        <Typography variant="caption" color="text.secondary">{Locale.label("site.redirects.normalizeHint")}</Typography>

        <Box sx={{ borderTop: "1px solid var(--border-light)", mt: 3, pt: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{Locale.label("site.redirects.analytics")}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{Locale.label("site.redirects.analyticsDesc")}</Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField size="small" label={Locale.label("site.redirects.ga4")} placeholder="G-XXXXXXXXXX" value={ga4} onChange={(e) => setGa4(e.target.value)} helperText={Locale.label("site.redirects.ga4Hint")} data-testid="ga4-input" />
            <Button variant="contained" onClick={handleSaveGa4} data-testid="ga4-save">{Locale.label("common.save")}</Button>
            {gaSaved && <Typography variant="body2" color="success.main">{Locale.label("site.siteWidgets.saved")}</Typography>}
          </Stack>
        </Box>
      </Box>
    </Card>
  );
};
