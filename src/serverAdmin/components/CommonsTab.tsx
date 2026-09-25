import React from "react";
import { DisplayBox, DateHelper, Locale } from "@churchapps/apphelper";
import {
  Alert, Avatar, Box, Button, Checkbox, Chip, CircularProgress, Collapse, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormControlLabel, Icon, InputLabel, MenuItem, Paper, Select, Snackbar, Stack, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography
} from "@mui/material";
import { CountChip, NavigationTabs, type NavigationTab } from "../../components/ui";
import { useConfirmDelete } from "../../hooks";
import {
  CommonsApi, getWorshipCommonsOrigin, RESOLUTIONS, RESOLVE_ACTIONS, REMOVE_REASONS,
  type CommonsTypeDef, type CommonsQueueRow, type CommonsReport, type CommonsAsset, type CommonsQualityDetail, type CommonsSubmitterStats, type CommonsSongDetail,
  type ReportResolution, type ReportAction, type RemovedReason, type AssetStatus, type Confidence
} from "../commonsApi";
import { CommonsReviewDrawer } from "./CommonsReviewDrawer";
import { assetStatusLabel, confidenceLabel, removeReasonLabel, reportReasonLabel, reportStatusLabel, resolutionLabel, resolveActionLabel } from "../commonsLabels";

const OVERDUE_MS = 72 * 60 * 60 * 1000;

const changeSymbol = (action: string) => (action === "add" ? "+" : action === "remove" ? "−" : "~");

const queueAge = (d: Date) => {
  const ms = Date.now() - d.getTime();
  if (ms < 60 * 1000) return Locale.label("serverAdmin.commonsTab.justNow");
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return DateHelper.prettyDate(d);
};

const submitterRecord = (stats: CommonsSubmitterStats) => {
  if (stats.total === 0) return Locale.label("serverAdmin.commonsTab.firstSubmission");
  return `${stats.approved}/${stats.total} ${Locale.label("serverAdmin.commonsTab.approvedSuffix")}`;
};

const scoreTooltip = (score: number, detail?: CommonsQualityDetail) => {
  const bits = [String(score)];
  if (detail?.parts?.length) bits.push(detail.parts.join(" + "));
  if (detail?.notes) bits.push(detail.notes);
  else if (!detail?.llm) bits.push(Locale.label("serverAdmin.commonsTab.scoreHeuristicOnly"));
  return bits.join(" · ");
};


const ConfidenceChip = (props: { confidence?: Confidence | string; testId?: string }) => {
  if (!props.confidence) return null;
  const ready = props.confidence === "sunday-ready";
  return <Chip size="small" color={ready ? "success" : "default"} variant={ready ? "filled" : "outlined"} label={confidenceLabel(props.confidence)} data-testid={props.testId} data-confidence={props.confidence} />;
};

const badgeLabel = (row: CommonsQueueRow) => {
  if (row.isNewAsset) return Locale.label("serverAdmin.commonsTab.badgeNew");
  if (row.isThirdParty) return Locale.label("serverAdmin.commonsTab.badgeEditBy").replace("{name}", row.submittedByName || "");
  return Locale.label("serverAdmin.commonsTab.badgeEditByAuthor");
};

const fileIcon = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["mp3", "wav", "m4a", "ogg", "flac"].includes(ext)) return "graphic_eq";
  if (ext === "pdf") return "picture_as_pdf";
  if (["png", "jpg", "jpeg", "webp", "gif", "tif"].includes(ext)) return "image";
  if ([
    "mid", "midi", "abc", "musicxml", "xml", "mxl", "mscz", "ly"
  ].includes(ext)) return "music_note";
  if (ext === "zip") return "folder_zip";
  return "description";
};

const fileChipColor = (action: string) => (action === "add" ? "success" : action === "remove" ? "error" : "info");

const QueueCard = (props: { row: CommonsQueueRow; onReview: () => void }) => {
  const { row } = props;
  const submittedDate = row.submittedAt ? DateHelper.toDate(row.submittedAt) : null;
  const overdue = !!submittedDate && Date.now() - submittedDate.getTime() > OVERDUE_MS;
  const score = row.triageScore;
  const songMeta = [
    row.song?.writer,
    row.song?.songKey && Locale.label("serverAdmin.commonsTab.songKey").replace("{key}", row.song.songKey),
    row.song?.bpm && Locale.label("serverAdmin.commonsTab.bpm").replace("{bpm}", String(row.song.bpm))
  ].filter(Boolean).join(" · ");

  return (
    <Paper
      variant="outlined"
      onClick={props.onReview}
      data-testid={`commons-queue-row-${row.id}`}
      sx={{ p: 2, display: "flex", gap: 2, alignItems: "flex-start", cursor: "pointer", transition: "border-color .15s, box-shadow .15s", "&:hover": { borderColor: "primary.main", boxShadow: 1 } }}
    >
      <Avatar variant="rounded" sx={{ width: 48, height: 48, bgcolor: "primary.main", display: { xs: "none", sm: "flex" } }}>
        <Icon>{row.assetType === "song" ? "music_note" : "description"}</Icon>
      </Avatar>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.3 }}>{row.assetName || "-"}</Typography>
          <Chip size="small" label={badgeLabel(row)} color={row.isNewAsset ? "primary" : "default"} variant="outlined" />
          {row.possibleDuplicate && (
            <Tooltip title={Locale.label("serverAdmin.commonsTab.possibleDuplicateTooltip")}>
              <Chip size="small" color="warning" label={Locale.label("serverAdmin.commonsTab.possibleDuplicate")} />
            </Tooltip>
          )}
          {row.rightsFlag && (
            <Tooltip title={Locale.label("serverAdmin.commonsTab.rightsFlagTooltip")}>
              <Chip size="small" color="warning" label={Locale.label("serverAdmin.commonsTab.rightsFlag")} />
            </Tooltip>
          )}
          <ConfidenceChip confidence={row.confidence} />
        </Stack>
        {songMeta && <Typography variant="body2" color="text.secondary">{songMeta}</Typography>}
        {row.song?.firstLine && (
          <Typography variant="body2" color="text.secondary" noWrap sx={{ fontStyle: "italic", mt: 0.25 }}>“{row.song.firstLine}”</Typography>
        )}

        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
          {row.filesChanged?.length ? row.filesChanged.map((f) => (
            <Chip
              key={f.name}
              size="small"
              variant="outlined"
              color={fileChipColor(f.action)}
              icon={<Icon sx={{ fontSize: 16 }}>{fileIcon(f.name)}</Icon>}
              label={`${changeSymbol(f.action)}${f.name}`}
              sx={f.action === "remove" ? { textDecoration: "line-through" } : undefined}
            />
          )) : (
            <Typography variant="caption" color="text.secondary">
              {row.isNewAsset ? Locale.label("serverAdmin.commonsTab.newNoFiles") : Locale.label("serverAdmin.commonsTab.detailsUpdated")}
            </Typography>
          )}
        </Stack>

        <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1 }}>
          <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>{row.submittedByName || "-"}</Box>
          {row.submitterStats && <> · {submitterRecord(row.submitterStats)}</>}
          {submittedDate && (
            <>
              {" · "}
              <Tooltip title={DateHelper.prettyDate(submittedDate)}>
                <Box component="span" sx={overdue ? { color: "error.main", fontWeight: 600 } : undefined}>{queueAge(submittedDate)}</Box>
              </Tooltip>
            </>
          )}
        </Typography>
      </Box>

      <Stack alignItems="flex-end" spacing={1} sx={{ flexShrink: 0 }}>
        {score != null && (
          <Tooltip title={scoreTooltip(score, row.qualityDetail)}>
            <Chip size="small" label={`${Locale.label("serverAdmin.commonsTab.colScore")} ${score}`} sx={{ fontWeight: 600, cursor: "help" }} />
          </Tooltip>
        )}
        <Button size="small" variant="contained" onClick={(e) => { e.stopPropagation(); props.onReview(); }} data-testid={`commons-review-${row.id}`}>
          {Locale.label("serverAdmin.commonsTab.review")}
        </Button>
      </Stack>
    </Paper>
  );
};

const QueueView = (props: { onPublished?: (assetId: string) => void; musicEditor?: boolean }) => {
  const [types, setTypes] = React.useState<CommonsTypeDef[]>([]);
  const [rows, setRows] = React.useState<CommonsQueueRow[] | null>(null);
  const [assetType, setAssetType] = React.useState("");
  const [reviewId, setReviewId] = React.useState<string | null>(null);

  React.useEffect(() => {
    CommonsApi.get("/admin/types").then((data: CommonsTypeDef[]) => setTypes(data || []));
    CommonsApi.get("/admin/submissions?status=pending").then((data: CommonsQueueRow[]) => setRows(data || []));
  }, []);

  const counts = React.useMemo(() => {
    const c: Record<string, number> = {};
    (rows || []).forEach((r) => { c[r.assetType] = (c[r.assetType] || 0) + 1; });
    return c;
  }, [rows]);
  const tabTypes = types.filter((t) => counts[t.key]);
  const selected = counts[assetType] ? assetType : tabTypes[0]?.key || "";
  const visible = React.useMemo(() => (rows || []).filter((r) => r.assetType === selected), [rows, selected]);
  const queueIds = React.useMemo(() => visible.map((r) => r.id), [visible]);

  const removeRow = (id: string) => setRows((prev) => (prev || []).filter((r) => r.id !== id));

  return (
    <DisplayBox headerIcon="inventory_2" headerText={Locale.label("serverAdmin.commonsTab.tabQueue")}>
      {tabTypes.length > 0 && (
        <Tabs value={selected} onChange={(_, v) => setAssetType(v)} variant="scrollable" sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }} data-testid="commons-type-tabs">
          {tabTypes.map((t) => (
            <Tab
              key={t.key}
              value={t.key}
              data-testid={`commons-type-tab-${t.key}`}
              sx={{ textTransform: "none", fontWeight: 600 }}
              label={<Stack direction="row" spacing={1} alignItems="center"><span>{t.label}</span><CountChip count={counts[t.key] || 0} /></Stack>}
            />
          ))}
        </Tabs>
      )}

      {rows === null ? <CircularProgress size={24} /> : visible.length === 0 ? (
        <Typography variant="body2">{Locale.label("serverAdmin.commonsTab.noSubmissions")}</Typography>
      ) : (
        <Stack spacing={1.5} id="commonsQueueTable">
          {visible.map((row) => <QueueCard key={row.id} row={row} onReview={() => setReviewId(row.id)} />)}
        </Stack>
      )}

      {reviewId && (
        <CommonsReviewDrawer
          submissionId={reviewId}
          queueIds={queueIds}
          musicEditor={props.musicEditor}
          onClose={() => setReviewId(null)}
          onSelect={setReviewId}
          onApproved={(id, assetId) => {
            removeRow(id);
            setReviewId(null);
            if (assetId) props.onPublished?.(assetId);
          }}
          onRejected={(id) => { removeRow(id); setReviewId(null); }}
          onChangesRequested={(id) => { removeRow(id); setReviewId(null); }}
        />
      )}
    </DisplayBox>
  );
};

const ReportsView = () => {
  const [reports, setReports] = React.useState<CommonsReport[]>([]);
  const [expanded, setExpanded] = React.useState<string | null>(null);
  // no default outcome: resolving without choosing would silently dismiss the report
  const [resolution, setResolution] = React.useState<Record<string, ReportResolution>>({});
  const [resolveAction, setResolveAction] = React.useState<Record<string, ReportAction>>({});
  const [resolveNote, setResolveNote] = React.useState<Record<string, string>>({});

  const load = () => CommonsApi.get("/admin/reports").then((data: CommonsReport[]) => setReports(data || []));
  React.useEffect(() => { load(); }, []);

  const claim = async (r: CommonsReport) => {
    await CommonsApi.post(`/admin/reports/${r.id}/claim`, {});
    setReports((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: "reviewing" } : x)));
  };

  const resolve = async (r: CommonsReport) => {
    const res = resolution[r.id];
    if (!res) return;
    const action = resolveAction[r.id] || "none";
    const note = resolveNote[r.id] || "";
    await CommonsApi.post(`/admin/reports/${r.id}/resolve`, { resolution: res, action, note });
    setReports((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: "resolved", resolution: res, resolutionNote: note } : x)));
    setExpanded(null);
  };

  const byDate = (a: CommonsReport, b: CommonsReport) => (a.createdAt || "").localeCompare(b.createdAt || "");
  const open = reports.filter((r) => r.status !== "resolved");
  const copyright = open.filter((r) => r.reason === "copyright").sort(byDate);
  const other = open.filter((r) => r.reason !== "copyright").sort(byDate);
  const resolved = reports.filter((r) => r.status === "resolved");

  const renderRow = (r: CommonsReport) => (
    <React.Fragment key={r.id}>
      <TableRow
        hover
        onClick={() => setExpanded(expanded === r.id ? null : r.id)}
        sx={{ cursor: "pointer" }}
        data-testid={`commons-report-${r.id}`}
      >
        <TableCell>{r.assetName || "-"}</TableCell>
        <TableCell>{reportReasonLabel(r.reason)}</TableCell>
        <TableCell><Chip size="small" label={reportStatusLabel(r.status)} color={r.status === "open" ? "warning" : "info"} /></TableCell>
        <TableCell>{DateHelper.prettyDate(DateHelper.toDate(r.createdAt))}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={4} sx={{ p: 0, border: 0 }}>
          <Collapse in={expanded === r.id}>
            <Box sx={{ p: 2 }}>
              <Typography variant="body2">{r.contentText || "-"}</Typography>
              {r.details && <Typography variant="body2" color="text.secondary">{r.details}</Typography>}
              {(r.name || r.email) && <Typography variant="body2">{r.name} {r.email && `<${r.email}>`}</Typography>}
              {r.reporterRole && <Typography variant="body2">{Locale.label("serverAdmin.commonsTab.reporterRole")}: {r.reporterRole}</Typography>}
              {r.signature && <Typography variant="body2">{Locale.label("serverAdmin.commonsTab.signature")}: {r.signature}</Typography>}

              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} alignItems="center" flexWrap="wrap" useFlexGap>
                {r.status === "open" && (
                  <Button size="small" variant="outlined" onClick={() => claim(r)} data-testid={`commons-claim-${r.id}`}>
                    {Locale.label("serverAdmin.commonsTab.claim")}
                  </Button>
                )}
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <Select
                    displayEmpty
                    value={resolution[r.id] || ""}
                    onChange={(e) => setResolution((p) => ({ ...p, [r.id]: e.target.value as ReportResolution }))}
                    data-testid={`commons-resolution-${r.id}`}
                  >
                    <MenuItem value="" disabled>{Locale.label("serverAdmin.commonsTab.chooseOutcome")}</MenuItem>
                    {RESOLUTIONS.map((res) => <MenuItem key={res} value={res}>{resolutionLabel(res)}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <Select
                    value={resolveAction[r.id] || "none"}
                    onChange={(e) => setResolveAction((p) => ({ ...p, [r.id]: e.target.value as ReportAction }))}
                    data-testid={`commons-resolve-action-${r.id}`}
                  >
                    {RESOLVE_ACTIONS.map((a) => <MenuItem key={a} value={a}>{resolveActionLabel(a)}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField
                  size="small"
                  placeholder={Locale.label("serverAdmin.commonsTab.note")}
                  value={resolveNote[r.id] || ""}
                  onChange={(e) => setResolveNote((p) => ({ ...p, [r.id]: e.target.value }))}
                  data-testid={`commons-resolve-note-${r.id}`}
                />
                <Button size="small" variant="contained" disabled={!resolution[r.id]} onClick={() => resolve(r)} data-testid={`commons-resolve-${r.id}`}>
                  {Locale.label("serverAdmin.commonsTab.resolve")}
                </Button>
              </Stack>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );

  const reportsTable = (list: CommonsReport[]) => (
    list.length === 0 ? <Typography variant="body2">{Locale.label("serverAdmin.commonsTab.noReports")}</Typography> : (
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{Locale.label("serverAdmin.commonsTab.colAsset")}</TableCell>
            <TableCell>{Locale.label("serverAdmin.commonsTab.reason")}</TableCell>
            <TableCell>{Locale.label("serverAdmin.commonsTab.status")}</TableCell>
            <TableCell>{Locale.label("serverAdmin.commonsTab.date")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>{list.map(renderRow)}</TableBody>
      </Table>
    )
  );

  return (
    <>
      <DisplayBox headerIcon="copyright" headerText={Locale.label("serverAdmin.commonsTab.copyrightReports")}>
        {reportsTable(copyright)}
      </DisplayBox>
      <DisplayBox headerIcon="flag" headerText={Locale.label("serverAdmin.commonsTab.policyReports")}>
        {reportsTable(other)}
      </DisplayBox>
      {resolved.length > 0 && (
        <DisplayBox headerIcon="history" headerText={Locale.label("serverAdmin.commonsTab.recentlyResolved")}>
          <Table size="small">
            <TableBody>
              {resolved.map((r) => (
                <TableRow key={r.id} data-testid={`commons-report-resolved-${r.id}`}>
                  <TableCell>{r.assetName || r.contentText || "-"}</TableCell>
                  <TableCell>{reportReasonLabel(r.reason)}</TableCell>
                  <TableCell>{r.resolution ? resolutionLabel(r.resolution) : "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DisplayBox>
      )}
    </>
  );
};

const ASSET_STATUSES: AssetStatus[] = ["pending", "published", "unpublished", "removed"];

const RemoveAssetDialog = (props: { asset: CommonsAsset | null; onClose: () => void; onRemoved: (id: string, reason: RemovedReason) => void }) => {
  const { asset, onClose, onRemoved } = props;
  const [reason, setReason] = React.useState<RemovedReason>("policy");
  React.useEffect(() => { setReason("policy"); }, [asset?.id]);

  const submit = async () => {
    if (!asset) return;
    await CommonsApi.post(`/admin/assets/${asset.id}/remove`, { reason });
    onRemoved(asset.id, reason);
  };

  return (
    <Dialog open={!!asset} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{Locale.label("serverAdmin.commonsTab.removeConfirm").replace("{name}", asset?.name || "")}</DialogTitle>
      <DialogContent>
        <FormControl size="small" fullWidth sx={{ mt: 1 }}>
          <InputLabel id="commons-remove-reason-label">{Locale.label("serverAdmin.commonsTab.reason")}</InputLabel>
          <Select
            labelId="commons-remove-reason-label"
            label={Locale.label("serverAdmin.commonsTab.reason")}
            value={reason}
            onChange={(e) => setReason(e.target.value as RemovedReason)}
            data-testid="commons-asset-remove-reason"
          >
            {REMOVE_REASONS.map((r) => <MenuItem key={r} value={r}>{removeReasonLabel(r)}</MenuItem>)}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{Locale.label("common.cancel")}</Button>
        <Button variant="contained" color="error" onClick={submit} data-testid="commons-asset-remove-confirm">
          {Locale.label("serverAdmin.commonsTab.remove")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Listen gate: tick each published key you listened through; the API flips confidence to sunday-ready
// once every key is covered and the package has a score, chords and slides.
const ListenDialog = (props: { asset: CommonsAsset | null; onClose: () => void; onSaved: (id: string, song: CommonsSongDetail) => void }) => {
  const { asset, onClose, onSaved } = props;
  const [song, setSong] = React.useState<CommonsSongDetail | null>(null);
  const [keys, setKeys] = React.useState<string[]>([]);
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    setSong(null); setKeys([]); setError("");
    if (!asset) return;
    let cancelled = false;
    CommonsApi.get(`/songs/${asset.id}`).then((data: CommonsSongDetail) => {
      if (cancelled) return;
      setSong(data || null);
      setKeys(Array.isArray(data?.listenedKeys) ? data.listenedKeys : []);
    }).catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); });
    return () => { cancelled = true; };
  }, [asset?.id]);

  const published: string[] = React.useMemo(() => {
    if (Array.isArray(song?.publishedKeys) && song.publishedKeys.length) return song.publishedKeys;
    return song?.songKey ? [song.songKey] : [];
  }, [song]);

  const toggle = (k: string) => setKeys((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));

  const save = async () => {
    if (!asset) return;
    setBusy(true); setError("");
    try {
      const result: CommonsSongDetail = await CommonsApi.post(`/admin/songs/${asset.id}/listen`, { keys });
      onSaved(asset.id, result || {});
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!asset} onClose={onClose} fullWidth maxWidth="xs" data-testid="commons-listen-dialog">
      <DialogTitle>{Locale.label("serverAdmin.commonsTab.listenTitle").replace("{name}", asset?.name || "")}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{Locale.label("serverAdmin.commonsTab.listenHelp")}</Typography>
        {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
        {!song && !error && <CircularProgress size={20} />}
        {song && published.length === 0 && <Typography variant="body2">{Locale.label("serverAdmin.commonsTab.noKeys")}</Typography>}
        {song && published.map((k) => (
          <FormControlLabel
            key={k}
            control={<Checkbox checked={keys.includes(k)} onChange={() => toggle(k)} inputProps={{ "data-testid": `commons-listen-key-${k}` } as React.InputHTMLAttributes<HTMLInputElement>} />}
            label={k}
          />
        ))}
        {song && (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            {[song.hasScore ? "score" : null, song.hasChords ? "chords" : null, song.hasSlides ? "slides" : null].filter(Boolean).join(" · ") || "-"}
            {song.sundayReadyAt ? ` · ${Locale.label("serverAdmin.commonsTab.sundayReady")} ${song.sundayReadyBy || ""} ${DateHelper.prettyDate(DateHelper.toDate(song.sundayReadyAt))}` : ""}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{Locale.label("common.cancel")}</Button>
        <Button variant="contained" disabled={busy || !song} onClick={save} data-testid="commons-listen-save">{Locale.label("common.save")}</Button>
      </DialogActions>
    </Dialog>
  );
};

const AssetsView = () => {
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [assets, setAssets] = React.useState<CommonsAsset[]>([]);
  const [removeAsset, setRemoveAsset] = React.useState<CommonsAsset | null>(null);
  const [listenAsset, setListenAsset] = React.useState<CommonsAsset | null>(null);
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  React.useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    const timer = setTimeout(() => {
      CommonsApi.get(`/admin/assets?${params.toString()}`).then((data: CommonsAsset[]) => { if (!cancelled) setAssets(data || []); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [q, status]);

  const unpublish = async (a: CommonsAsset) => {
    const ok = await confirm(Locale.label("serverAdmin.commonsTab.unpublishConfirm").replace("{name}", a.name || ""), { title: Locale.label("serverAdmin.commonsTab.unpublish"), confirmLabel: Locale.label("serverAdmin.commonsTab.unpublish"), destructive: true, "data-testid": "commons-unpublish-dialog" });
    if (!ok) return;
    await CommonsApi.post(`/admin/assets/${a.id}/unpublish`, {});
    setAssets((prev) => prev.map((x) => (x.id === a.id ? { ...x, status: "unpublished" } : x)));
  };
  const republish = async (a: CommonsAsset) => {
    await CommonsApi.post(`/admin/assets/${a.id}/republish`, {});
    setAssets((prev) => prev.map((x) => (x.id === a.id ? { ...x, status: "published" } : x)));
  };
  const feature = async (a: CommonsAsset) => {
    const result = await CommonsApi.post(`/admin/assets/${a.id}/feature`, {});
    setAssets((prev) => prev.map((x) => (x.id === a.id ? { ...x, featured: !!result?.featured } : x)));
  };

  return (
    <DisplayBox headerIcon="library_books" headerText={Locale.label("serverAdmin.commonsTab.tabAssets")}>
      {ConfirmDialogElement}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField
          size="small"
          label={Locale.label("serverAdmin.commonsTab.searchAssets")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          slotProps={{ htmlInput: { "data-testid": "commons-asset-search" } }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="commons-asset-status-label">{Locale.label("serverAdmin.commonsTab.status")}</InputLabel>
          <Select
            labelId="commons-asset-status-label"
            label={Locale.label("serverAdmin.commonsTab.status")}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            data-testid="commons-filter-status"
          >
            <MenuItem value="">{Locale.label("serverAdmin.commonsTab.allStatuses")}</MenuItem>
            {ASSET_STATUSES.map((s) => <MenuItem key={s} value={s}>{assetStatusLabel(s)}</MenuItem>)}
          </Select>
        </FormControl>
      </Stack>

      {assets.length === 0 ? (
        <Typography variant="body2">{Locale.label("serverAdmin.commonsTab.noAssets")}</Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{Locale.label("serverAdmin.commonsTab.name")}</TableCell>
              <TableCell>{Locale.label("serverAdmin.commonsTab.colType")}</TableCell>
              <TableCell>{Locale.label("serverAdmin.commonsTab.publisher")}</TableCell>
              <TableCell>{Locale.label("serverAdmin.commonsTab.status")}</TableCell>
              <TableCell>{Locale.label("serverAdmin.commonsTab.colConfidence")}</TableCell>
              <TableCell>{Locale.label("serverAdmin.commonsTab.downloads")}</TableCell>
              <TableCell align="right">{Locale.label("serverAdmin.commonsTab.colActions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {assets.map((a) => (
              <TableRow key={a.id} data-testid={`commons-asset-${a.id}`}>
                <TableCell>{a.name}</TableCell>
                <TableCell>{a.typeLabel || a.assetType}</TableCell>
                <TableCell>{a.publisherName || "-"}</TableCell>
                <TableCell><Chip size="small" label={assetStatusLabel(a.status)} /></TableCell>
                <TableCell>
                  {a.confidence === "sunday-ready" ? (
                    <Tooltip title={`${a.sundayReadyBy || ""} ${a.sundayReadyAt ? DateHelper.prettyDate(DateHelper.toDate(a.sundayReadyAt)) : ""}`.trim()}>
                      <span><ConfidenceChip confidence={a.confidence} testId={`commons-sunday-ready-${a.id}`} /></span>
                    </Tooltip>
                  ) : <ConfidenceChip confidence={a.confidence} testId={`commons-confidence-${a.id}`} />}
                </TableCell>
                <TableCell>{a.downloadCount ?? 0}</TableCell>
                <TableCell align="right">
                  <Tooltip title={Locale.label("serverAdmin.commonsTab.featureTooltip")}>
                    <Button
                      size="small"
                      color={a.featured ? "warning" : "inherit"}
                      onClick={() => feature(a)}
                      data-testid={`commons-asset-feature-${a.id}`}
                    >
                      {a.featured ? Locale.label("serverAdmin.commonsTab.featured") : Locale.label("serverAdmin.commonsTab.feature")}
                    </Button>
                  </Tooltip>
                  {a.assetType === "song" && a.status !== "removed" && (
                    <Button size="small" onClick={() => setListenAsset(a)} data-testid={`commons-asset-listen-${a.id}`}>
                      {Locale.label("serverAdmin.commonsTab.listened")}
                    </Button>
                  )}
                  {a.status === "published" && (
                    <Button size="small" onClick={() => unpublish(a)} data-testid={`commons-asset-unpublish-${a.id}`}>
                      {Locale.label("serverAdmin.commonsTab.unpublish")}
                    </Button>
                  )}
                  {a.status === "unpublished" && (
                    <Button size="small" onClick={() => republish(a)} data-testid={`commons-asset-republish-${a.id}`}>
                      {Locale.label("serverAdmin.commonsTab.republish")}
                    </Button>
                  )}
                  {a.status !== "removed" && (
                    <Button size="small" color="error" onClick={() => setRemoveAsset(a)} data-testid={`commons-asset-remove-${a.id}`}>
                      {Locale.label("serverAdmin.commonsTab.remove")}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ListenDialog
        asset={listenAsset}
        onClose={() => setListenAsset(null)}
        onSaved={(id, song) => {
          setAssets((prev) => prev.map((x) => (x.id === id ? { ...x, confidence: song.confidence ?? x.confidence, sundayReadyAt: song.sundayReadyAt ?? null, sundayReadyBy: song.sundayReadyBy ?? null } : x)));
          setListenAsset(null);
        }}
      />

      <RemoveAssetDialog
        asset={removeAsset}
        onClose={() => setRemoveAsset(null)}
        onRemoved={(id, reason) => {
          setAssets((prev) => prev.map((x) => (x.id === id ? { ...x, status: "removed", removedReason: reason } : x)));
          setRemoveAsset(null);
        }}
      />
    </DisplayBox>
  );
};

export const CommonsTab = (props: { musicEditor?: boolean }) => {
  const [subTab, setSubTab] = React.useState("queue");
  const [publishedAssetId, setPublishedAssetId] = React.useState<string | null>(null);

  const tabs: NavigationTab[] = [
    { value: "queue", label: Locale.label("serverAdmin.commonsTab.tabQueue"), testId: "commons-tab-queue" },
    { value: "reports", label: Locale.label("serverAdmin.commonsTab.tabReports"), testId: "commons-tab-reports" },
    { value: "assets", label: Locale.label("serverAdmin.commonsTab.tabAssets"), testId: "commons-tab-assets" }
  ];

  return (
    <>
      <NavigationTabs selectedTab={subTab} onTabChange={setSubTab} tabs={tabs} testId="commonsTabs" />
      <Box sx={{ mt: 2 }}>
        {subTab === "queue" && <QueueView onPublished={setPublishedAssetId} musicEditor={props.musicEditor} />}
        {subTab === "reports" && <ReportsView />}
        {subTab === "assets" && <AssetsView />}
      </Box>
      <Snackbar
        open={!!publishedAssetId}
        autoHideDuration={6000}
        onClose={() => setPublishedAssetId(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" variant="filled" onClose={() => setPublishedAssetId(null)} sx={{ width: "100%" }}>
          {Locale.label("serverAdmin.commonsTab.assetStatus.published")}
          {" · "}
          {publishedAssetId && (
            <Box
              component="a"
              href={`${getWorshipCommonsOrigin()}/songs/${publishedAssetId}`}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: "inherit", fontWeight: 600, textDecoration: "underline" }}
            >
              {Locale.label("serverAdmin.commonsTab.viewOnWorshipCommons")}
            </Box>
          )}
        </Alert>
      </Snackbar>
    </>
  );
};
