import React from "react";
import { DisplayBox, DateHelper, Locale } from "@churchapps/apphelper";
import {
  Box, Button, Chip, Collapse, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography
} from "@mui/material";
import { NavigationTabs, type NavigationTab } from "../../components/ui";
import { useConfirmDelete } from "../../hooks";
import {
  CommonsApi, REJECT_REASONS, RESOLUTIONS, RESOLVE_ACTIONS, REMOVE_REASONS,
  type CommonsTypeDef, type CommonsQueueRow, type CommonsReport, type CommonsAsset, type CommonsQualityDetail, type CommonsSubmitterStats,
  type RejectReason, type ReportResolution, type ReportAction, type RemovedReason, type AssetStatus
} from "../commonsApi";
import { CommonsReviewDrawer } from "./CommonsReviewDrawer";

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

const badgeLabel = (row: CommonsQueueRow) => {
  if (row.isNewAsset) return Locale.label("serverAdmin.commonsTab.badgeNew");
  if (row.isThirdParty) return Locale.label("serverAdmin.commonsTab.badgeEditBy").replace("{name}", row.submittedByName || "");
  return Locale.label("serverAdmin.commonsTab.badgeEditByAuthor");
};

const RejectDialog = (props: { row: CommonsQueueRow | null; onClose: () => void; onRejected: (id: string) => void }) => {
  const { row, onClose, onRejected } = props;
  const [reason, setReason] = React.useState<RejectReason>("quality");
  const [note, setNote] = React.useState("");

  React.useEffect(() => { setReason("quality"); setNote(""); }, [row?.id]);

  const submit = async () => {
    if (!row || !note.trim()) return;
    await CommonsApi.post(`/admin/submissions/${row.id}/reject`, { reason, note: note.trim() });
    onRejected(row.id);
  };

  return (
    <Dialog open={!!row} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{Locale.label("serverAdmin.commonsTab.confirmReject")}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <FormControl size="small">
            <InputLabel id="commons-quick-reject-reason-label">{Locale.label("serverAdmin.commonsTab.reason")}</InputLabel>
            <Select
              labelId="commons-quick-reject-reason-label"
              label={Locale.label("serverAdmin.commonsTab.reason")}
              value={reason}
              onChange={(e) => setReason(e.target.value as RejectReason)}
              data-testid="commons-reject-reason"
            >
              {REJECT_REASONS.map((r) => <MenuItem key={r} value={r}>{Locale.label(`serverAdmin.commonsTab.rejectReason.${r}`)}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField
            size="small"
            multiline
            minRows={2}
            label={Locale.label("serverAdmin.commonsTab.note")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            data-testid="commons-reject-note"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{Locale.label("common.cancel")}</Button>
        <Button variant="contained" color="error" disabled={!note.trim()} onClick={submit} data-testid="commons-reject-confirm">
          {Locale.label("serverAdmin.commonsTab.reject")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const QueueView = () => {
  const [types, setTypes] = React.useState<CommonsTypeDef[]>([]);
  const [rows, setRows] = React.useState<CommonsQueueRow[]>([]);
  const [product, setProduct] = React.useState("");
  const [assetType, setAssetType] = React.useState("");
  const [reviewId, setReviewId] = React.useState<string | null>(null);
  const [rejectRow, setRejectRow] = React.useState<CommonsQueueRow | null>(null);

  React.useEffect(() => { CommonsApi.get("/admin/types").then((data: CommonsTypeDef[]) => setTypes(data || [])); }, []);

  const load = React.useCallback(() => {
    const params = new URLSearchParams({ status: "pending" });
    if (assetType) params.set("assetType", assetType);
    if (product) params.set("product", product);
    CommonsApi.get(`/admin/submissions?${params.toString()}`).then((data: CommonsQueueRow[]) => setRows(data || []));
  }, [assetType, product]);

  React.useEffect(() => { load(); }, [load]);

  const products = React.useMemo(() => {
    const seen = new Map<string, string>();
    types.forEach((t) => seen.set(t.product, t.productLabel));
    return Array.from(seen.entries());
  }, [types]);
  const typesForProduct = React.useMemo(() => types.filter((t) => !product || t.product === product), [types, product]);
  const queueIds = React.useMemo(() => rows.map((r) => r.id), [rows]);

  const removeRow = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));

  const changesSummary = (row: CommonsQueueRow) => {
    if (!row.filesChanged?.length) return Locale.label("serverAdmin.commonsTab.detailsUpdated");
    return row.filesChanged.map((f) => `${changeSymbol(f.action)}${f.name}`).join(" ");
  };

  return (
    <DisplayBox headerIcon="inventory_2" headerText={Locale.label("serverAdmin.commonsTab.tabQueue")}>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 220, "& .MuiInputLabel-root": { overflow: "visible" } }}>
          <InputLabel id="commons-product-label" shrink>{Locale.label("serverAdmin.commonsTab.product")}</InputLabel>
          <Select
            labelId="commons-product-label"
            label={Locale.label("serverAdmin.commonsTab.product")}
            displayEmpty
            notched
            value={product}
            onChange={(e) => { setProduct(e.target.value); setAssetType(""); }}
            data-testid="commons-filter-product"
          >
            <MenuItem value="">{Locale.label("serverAdmin.commonsTab.allProducts")}</MenuItem>
            {products.map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 240, "& .MuiInputLabel-root": { overflow: "visible" } }}>
          <InputLabel id="commons-type-label" shrink>{Locale.label("serverAdmin.commonsTab.assetType")}</InputLabel>
          <Select
            labelId="commons-type-label"
            label={Locale.label("serverAdmin.commonsTab.assetType")}
            displayEmpty
            notched
            value={assetType}
            onChange={(e) => setAssetType(e.target.value)}
            data-testid="commons-filter-type"
          >
            <MenuItem value="">{Locale.label("serverAdmin.commonsTab.allTypes")}</MenuItem>
            {typesForProduct.map((t) => <MenuItem key={t.key} value={t.key}>{t.label}</MenuItem>)}
          </Select>
        </FormControl>
      </Stack>

      {rows.length === 0 ? (
        <Typography variant="body2">{Locale.label("serverAdmin.commonsTab.noSubmissions")}</Typography>
      ) : (
        <Table size="small" id="commonsQueueTable">
          <TableHead>
            <TableRow>
              <TableCell>{Locale.label("serverAdmin.commonsTab.colType")}</TableCell>
              <TableCell>{Locale.label("serverAdmin.commonsTab.colAsset")}</TableCell>
              <TableCell>{Locale.label("serverAdmin.commonsTab.colSubmitter")}</TableCell>
              <TableCell>{Locale.label("serverAdmin.commonsTab.colChanges")}</TableCell>
              <TableCell>{Locale.label("serverAdmin.commonsTab.colAge")}</TableCell>
              <TableCell>{Locale.label("serverAdmin.commonsTab.colScore")}</TableCell>
              <TableCell align="right">{Locale.label("serverAdmin.commonsTab.colActions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const submittedDate = row.submittedAt ? DateHelper.toDate(row.submittedAt) : null;
              const age = submittedDate ? queueAge(submittedDate) : "-";
              const overdue = !!submittedDate && Date.now() - submittedDate.getTime() > OVERDUE_MS;
              const score = row.triageScore;
              return (
                <TableRow key={row.id} data-testid={`commons-queue-row-${row.id}`}>
                  <TableCell>
                    {row.typeLabel}
                    <br />
                    <Chip size="small" label={row.productLabel} />
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "normal", wordBreak: "break-word", maxWidth: 280 }}>
                    {row.assetName}
                    <br />
                    <Chip size="small" label={badgeLabel(row)} />
                  </TableCell>
                  <TableCell>
                    {row.submittedByName || "-"}
                    {row.submitterStats && (
                      <>
                        <br />
                        <Typography variant="caption" color="text.secondary">{submitterRecord(row.submitterStats)}</Typography>
                      </>
                    )}
                  </TableCell>
                  <TableCell>{changesSummary(row)}</TableCell>
                  <TableCell sx={overdue ? { color: "error.main" } : undefined}>{age}</TableCell>
                  <TableCell>
                    {score == null ? "-" : (
                      <Tooltip title={scoreTooltip(score, row.qualityDetail)}>
                        <Typography variant="body2" component="span" sx={{ borderBottom: "1px dotted", cursor: "help" }}>{score}</Typography>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => setReviewId(row.id)} data-testid={`commons-review-${row.id}`}>
                      {Locale.label("serverAdmin.commonsTab.review")}
                    </Button>
                    <Button size="small" color="error" onClick={() => setRejectRow(row)} data-testid={`commons-reject-${row.id}`}>
                      {Locale.label("serverAdmin.commonsTab.reject")}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <RejectDialog row={rejectRow} onClose={() => setRejectRow(null)} onRejected={(id) => { removeRow(id); setRejectRow(null); }} />

      {reviewId && (
        <CommonsReviewDrawer
          submissionId={reviewId}
          queueIds={queueIds}
          onClose={() => setReviewId(null)}
          onSelect={setReviewId}
          onApproved={(id) => { removeRow(id); setReviewId(null); }}
          onRejected={(id) => { removeRow(id); setReviewId(null); }}
        />
      )}
    </DisplayBox>
  );
};

const ReportsView = () => {
  const [reports, setReports] = React.useState<CommonsReport[]>([]);
  const [expanded, setExpanded] = React.useState<string | null>(null);
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
    const res = resolution[r.id] || "dismissed";
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
        <TableCell>{r.reason}</TableCell>
        <TableCell><Chip size="small" label={r.status} color={r.status === "open" ? "warning" : "info"} /></TableCell>
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
                    value={resolution[r.id] || "dismissed"}
                    onChange={(e) => setResolution((p) => ({ ...p, [r.id]: e.target.value as ReportResolution }))}
                    data-testid={`commons-resolution-${r.id}`}
                  >
                    {RESOLUTIONS.map((res) => <MenuItem key={res} value={res}>{Locale.label(`serverAdmin.commonsTab.resolution.${res}`)}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <Select
                    value={resolveAction[r.id] || "none"}
                    onChange={(e) => setResolveAction((p) => ({ ...p, [r.id]: e.target.value as ReportAction }))}
                    data-testid={`commons-resolve-action-${r.id}`}
                  >
                    {RESOLVE_ACTIONS.map((a) => <MenuItem key={a} value={a}>{Locale.label(`serverAdmin.commonsTab.resolveAction.${a}`)}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField
                  size="small"
                  placeholder={Locale.label("serverAdmin.commonsTab.note")}
                  value={resolveNote[r.id] || ""}
                  onChange={(e) => setResolveNote((p) => ({ ...p, [r.id]: e.target.value }))}
                  data-testid={`commons-resolve-note-${r.id}`}
                />
                <Button size="small" variant="contained" onClick={() => resolve(r)} data-testid={`commons-resolve-${r.id}`}>
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
                  <TableCell>{r.reason}</TableCell>
                  <TableCell>{r.resolution ? Locale.label(`serverAdmin.commonsTab.resolution.${r.resolution}`) : "-"}</TableCell>
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
            {REMOVE_REASONS.map((r) => <MenuItem key={r} value={r}>{Locale.label(`serverAdmin.commonsTab.removeReason.${r}`)}</MenuItem>)}
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

const AssetsView = () => {
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [assets, setAssets] = React.useState<CommonsAsset[]>([]);
  const [removeAsset, setRemoveAsset] = React.useState<CommonsAsset | null>(null);
  const { ConfirmDialogElement } = useConfirmDelete();

  const load = React.useCallback(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    CommonsApi.get(`/admin/assets?${params.toString()}`).then((data: CommonsAsset[]) => setAssets(data || []));
  }, [q, status]);

  React.useEffect(() => { load(); }, [load]);

  const unpublish = async (a: CommonsAsset) => {
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
            {ASSET_STATUSES.map((s) => <MenuItem key={s} value={s}>{Locale.label(`serverAdmin.commonsTab.assetStatus.${s}`)}</MenuItem>)}
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
                <TableCell><Chip size="small" label={Locale.label(`serverAdmin.commonsTab.assetStatus.${a.status}`)} /></TableCell>
                <TableCell>{a.downloadCount ?? 0}</TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    color={a.featured ? "warning" : "inherit"}
                    onClick={() => feature(a)}
                    data-testid={`commons-asset-feature-${a.id}`}
                  >
                    {a.featured ? Locale.label("serverAdmin.commonsTab.featured") : Locale.label("serverAdmin.commonsTab.feature")}
                  </Button>
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

export const CommonsTab = () => {
  const [subTab, setSubTab] = React.useState("queue");

  const tabs: NavigationTab[] = [
    { value: "queue", label: Locale.label("serverAdmin.commonsTab.tabQueue"), testId: "commons-tab-queue" },
    { value: "reports", label: Locale.label("serverAdmin.commonsTab.tabReports"), testId: "commons-tab-reports" },
    { value: "assets", label: Locale.label("serverAdmin.commonsTab.tabAssets"), testId: "commons-tab-assets" }
  ];

  return (
    <>
      <NavigationTabs selectedTab={subTab} onTabChange={setSubTab} tabs={tabs} testId="commonsTabs" />
      <Box sx={{ mt: 2 }}>
        {subTab === "queue" && <QueueView />}
        {subTab === "reports" && <ReportsView />}
        {subTab === "assets" && <AssetsView />}
      </Box>
    </>
  );
};
