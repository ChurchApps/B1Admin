import React from "react";
import { DateHelper, Locale } from "@churchapps/apphelper";
import {
  Alert, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Drawer, FormControl, FormControlLabel, Grid,
  IconButton, InputLabel, MenuItem, Select, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import {
  CommonsApi, getWorshipCommonsOrigin, REJECT_REASONS,
  type CommonsDeclinedFile, type CommonsDetailField, type CommonsManifestRow, type CommonsSubmissionDetail, type CommonsSubmissionFile, type RejectReason, type SubmissionType
} from "../commonsApi";
import { ChordProHelper } from "../../helpers/ChordProHelper";
import { GRANT_PARTS, rejectReasonLabel, submissionTypeLabel } from "../commonsLabels";
import { hasChanges, lineDiff } from "../lineDiff";

const IMAGE_EXT = ["png", "jpg", "jpeg", "webp"];
const AUDIO_EXT = ["mp3", "wav", "m4a", "ogg"];
const TEXT_EXT = ["json", "abc", "chordpro", "txt"];
const LONG_TEXT_MIN = 120;
// shown in the Rights block instead of the field list
const SKIP_DETAIL = new Set([
  "chordPro", "certified", "recordingOwned", "proAnswer", "masterLicense", "contributionAgreed", "contributionAt", ...GRANT_PARTS.map((g) => g.key)
]);
const SKIP_NEW = new Set([...SKIP_DETAIL, "license"]);
const PRO_FLAG = /GEMA|publisher/i;
// Fields a music editor may not change (contract: license, layer ownership, recordingOwned) — approvals that touch them need a server admin.
const RIGHTS_KEY = /^(license|rights|detail\.(license|rights|recordingOwned|certified|proAnswer))/;

const extOf = (name: string): string => name.split(".").pop()?.toLowerCase() || "";

const TextFilePreview = (props: { url: string }) => {
  const [text, setText] = React.useState<string | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    fetch(props.url).then((r) => r.text()).then((t) => { if (!cancelled) setText(t); }).catch(() => { if (!cancelled) setText(null); });
    return () => { cancelled = true; };
  }, [props.url]);
  if (text === null) return null;
  return <Box component="pre" sx={{ maxHeight: 220, overflow: "auto", bgcolor: "action.hover", p: 1, fontSize: 12, whiteSpace: "pre-wrap" }}>{text}</Box>;
};

const FileCard = (props: { file: CommonsSubmissionFile; declined?: string; onDecline?: (reason: string | null) => void }) => {
  const { file, declined, onDecline } = props;
  const ext = extOf(file.name);
  const color = file.action === "remove" ? "error" : file.action === "replace" ? "warning" : "success";
  const isDeclined = declined !== undefined;
  return (
    <Box sx={{ mb: 2, opacity: isDeclined ? 0.6 : 1 }} data-testid={`commons-file-${file.name}`}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Chip size="small" color={color} label={file.action} />
        <Typography variant="body2" sx={isDeclined ? { textDecoration: "line-through" } : undefined}>{file.name}</Typography>
        {onDecline && (
          <FormControlLabel
            sx={{ ml: "auto", mr: 0 }}
            control={<Checkbox size="small" checked={isDeclined} onChange={(e) => onDecline(e.target.checked ? "" : null)} inputProps={{ "data-testid": `commons-file-decline-${file.name}` } as React.InputHTMLAttributes<HTMLInputElement>} />}
            label={<Typography variant="caption">{Locale.label("serverAdmin.commonsTab.declineFile")}</Typography>}
          />
        )}
      </Stack>
      {isDeclined && onDecline && (
        <TextField
          size="small"
          fullWidth
          sx={{ mt: 1 }}
          label={Locale.label("serverAdmin.commonsTab.declineReason")}
          value={declined}
          onChange={(e) => onDecline(e.target.value)}
          slotProps={{ htmlInput: { "data-testid": `commons-file-decline-reason-${file.name}` } }}
        />
      )}
      {!isDeclined && file.url && IMAGE_EXT.includes(ext) && <img src={file.url} alt={file.name} style={{ maxWidth: "100%", marginTop: 4, borderRadius: 4 }} />}
      {!isDeclined && file.url && AUDIO_EXT.includes(ext) && <audio controls src={file.url} style={{ width: "100%", marginTop: 4 }} />}
      {!isDeclined && file.url && ext === "pdf" && <embed src={file.url} type="application/pdf" width="100%" height={300} style={{ marginTop: 4 }} />}
      {!isDeclined && file.url && TEXT_EXT.includes(ext) && <TextFilePreview url={file.url} />}
      {file.url && ![...IMAGE_EXT, ...AUDIO_EXT, ...TEXT_EXT, "pdf"].includes(ext) && (
        <a href={file.url} target="_blank" rel="noreferrer">{Locale.label("serverAdmin.commonsTab.download")}</a>
      )}
    </Box>
  );
};

const fieldValue = (v: unknown): string => (v === undefined || v === null || v === "" ? "-" : String(v));

const licenseLabel = (license?: string) => {
  if (license === "WC") return Locale.label("serverAdmin.commonsTab.licenseWc");
  if (license === "PD") return Locale.label("serverAdmin.commonsTab.licensePd");
  return license || "-";
};

const fieldLabel = (key: string, fields?: CommonsDetailField[]) => {
  const k = key.replace(/^detail\./, "");
  if (k === "certified") return Locale.label("serverAdmin.commonsTab.field.certified");
  // the generic asset fields have no registry label
  if (k === "name") return Locale.label("serverAdmin.commonsTab.field.name");
  if (k === "description") return Locale.label("serverAdmin.commonsTab.field.description");
  if (k === "tags") return Locale.label("serverAdmin.commonsTab.field.tags");
  if (k === "language") return Locale.label("serverAdmin.commonsTab.field.language");
  if (k === "license") return Locale.label("serverAdmin.commonsTab.field.license");
  return fields?.find((f) => f.key === k)?.label || k;
};

const displayValue = (key: string, v: unknown): string => {
  const k = key.replace(/^detail\./, "");
  if (k === "license") return licenseLabel(v == null ? "" : String(v));
  if (typeof v === "boolean") return v ? Locale.label("common.yes") : Locale.label("common.no");
  return fieldValue(v);
};

const shortDate = (s?: string | null) => {
  if (!s) return "";
  try { return DateHelper.prettyDate(DateHelper.toDate(s)); } catch { return s; }
};

// Added/removed lines from lineDiff, colored; unchanged lines dimmed so the change stands out.
const LineDiffView = (props: { from: string; to: string; chords?: boolean; testId?: string }) => {
  const lines = React.useMemo(() => lineDiff(props.from, props.to), [props.from, props.to]);
  const render = (text: string) => (props.chords ? ChordProHelper.replaceChords(ChordProHelper.escapeHtml(text)) : ChordProHelper.escapeHtml(text));
  return (
    <Box
      data-testid={props.testId || "commons-line-diff"}
      sx={{
        maxHeight: 320,
        overflow: "auto",
        bgcolor: "action.hover",
        p: 1,
        fontSize: 12,
        fontFamily: "monospace",
        lineHeight: 1.7,
        "& sup": { fontWeight: 700, fontSize: "0.7em", color: "primary.main" }
      }}
    >
      {lines.map((l, i) => (
        <Box
          key={i}
          data-diff={l.kind}
          sx={{
            whiteSpace: "pre-wrap",
            px: 0.5,
            ...(l.kind === "add" ? { bgcolor: "success.light", color: "success.contrastText" } : l.kind === "del" ? { bgcolor: "error.light", color: "error.contrastText", textDecoration: "line-through" } : { opacity: 0.7 })
          }}
        >
          <Box component="span" sx={{ display: "inline-block", width: "1.2em", userSelect: "none" }}>{l.kind === "add" ? "+" : l.kind === "del" ? "−" : " "}</Box>
          <span dangerouslySetInnerHTML={{ __html: render(l.text) || "&nbsp;" }} />
        </Box>
      ))}
    </Box>
  );
};

const LabeledValue = (props: { fieldKey: string; value: unknown; fields?: CommonsDetailField[] }) => {
  const long = typeof props.value === "string" && props.value.length > LONG_TEXT_MIN;
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="caption" color="text.secondary">{fieldLabel(props.fieldKey, props.fields)}</Typography>
      {long
        ? <Box component="pre" sx={{ maxHeight: 200, overflow: "auto", bgcolor: "action.hover", p: 1, fontSize: 12, whiteSpace: "pre-wrap" }}>{fieldValue(props.value)}</Box>
        : <Typography variant="body2">{displayValue(props.fieldKey, props.value)}</Typography>}
    </Box>
  );
};

const DiffList = (props: { detail: CommonsSubmissionDetail }) => {
  const { detail } = props;
  if (detail.isNewAsset) {
    const flat: Record<string, unknown> = {
      name: detail.payload?.name,
      description: detail.payload?.description,
      tags: detail.payload?.tags,
      language: detail.payload?.language,
      license: detail.payload?.license,
      ...(detail.payload?.detail || {})
    };
    const entries = Object.entries(flat).filter(([k, v]) => v !== undefined && v !== "" && !SKIP_NEW.has(k));
    if (entries.length === 0) return <Typography variant="body2">{Locale.label("serverAdmin.commonsTab.noFieldChanges")}</Typography>;
    return (
      <Box>
        {entries.map(([k, v]) => <LabeledValue key={k} fieldKey={k} value={v} fields={detail.detailFields} />)}
      </Box>
    );
  }
  const fields = detail.diff?.fields || [];
  if (fields.length === 0) return <Typography variant="body2">{Locale.label("serverAdmin.commonsTab.noFieldChanges")}</Typography>;
  return (
    <Box>
      {fields.map((f) => {
        const k = f.key.replace(/^detail\./, "");
        if (SKIP_DETAIL.has(k) || k === "qualityDetail") return null;
        const long = (typeof f.from === "string" && f.from.length > LONG_TEXT_MIN) || (typeof f.to === "string" && f.to.length > LONG_TEXT_MIN);
        return (
          <Box key={f.key} sx={{ mb: 1.5 }}>
            <Typography variant="caption" color="text.secondary">{fieldLabel(f.key, detail.detailFields)}</Typography>
            {long
              ? <LineDiffView from={fieldValue(f.from)} to={fieldValue(f.to)} testId={`commons-line-diff-${k}`} />
              : <Typography variant="body2">{displayValue(f.key, f.from)} &rarr; {displayValue(f.key, f.to)}</Typography>}
          </Box>
        );
      })}
    </Box>
  );
};

const Check = (props: { ok: boolean; children: React.ReactNode; testId?: string }) => (
  <Typography variant="body2" sx={{ color: props.ok ? "text.primary" : "error.main" }} data-testid={props.testId}>
    {props.ok ? "✓" : "✗"} {props.children}
  </Typography>
);

// What was granted, by whom, under which text: the license, the writer's six-part grant (or a proposer's contribution statement), the recording, the collecting-society answer.
const RightsBlock = (props: { detail: CommonsSubmissionDetail; hasAudio: boolean }) => {
  const payload = props.detail.payload || {};
  const d = payload.detail || {};
  const pro = d.proAnswer == null || d.proAnswer === "" ? "" : String(d.proAnswer);
  const proposal = !props.detail.isNewAsset;
  const split = GRANT_PARTS.some((g) => g.key in d);
  const attested = payload.attestedAt ? `${Locale.label("serverAdmin.commonsTab.attested")} ${shortDate(payload.attestedAt)}${payload.attestationVersion ? ` (v${payload.attestationVersion})` : ""}` : "";
  return (
    <Box sx={{ mb: 2 }} data-testid="commons-rights">
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="subtitle1">{Locale.label("serverAdmin.commonsTab.rights")}</Typography>
        {props.detail.rightsFlag && (
          <Tooltip title={Locale.label("serverAdmin.commonsTab.rightsFlagTooltip")}>
            <Chip size="small" color="warning" label={Locale.label("serverAdmin.commonsTab.rightsFlag")} />
          </Tooltip>
        )}
      </Stack>
      <Typography variant="body2" sx={{ mb: 1 }}>
        <strong>{licenseLabel(payload.license)}{payload.licenseVersion ? ` ${payload.licenseVersion}` : ""}</strong>
        {d.masterLicense ? ` · ${Locale.label("serverAdmin.commonsTab.masterLicense")}: ${licenseLabel(String(d.masterLicense))}` : ""}
      </Typography>
      {proposal && "contributionAgreed" in d
        ? <Check ok={d.contributionAgreed === true} testId="commons-rights-contribution">{Locale.label("serverAdmin.commonsTab.contributionAgreed")}</Check>
        : split
          ? GRANT_PARTS.map((g) => <Check key={g.key} ok={d[g.key] === true} testId={`commons-rights-${g.key}`}>{g.label()}</Check>)
          : <Check ok={d.certified === true}>{Locale.label("serverAdmin.commonsTab.field.certified")}</Check>}
      {attested && !proposal && <Typography variant="caption" color="text.secondary" display="block">{attested}</Typography>}
      {props.hasAudio && <Check ok={d.recordingOwned === true} testId="commons-rights-recording">{Locale.label("serverAdmin.commonsTab.recordingOwned")}</Check>}
      {pro && (
        <Typography variant="body2" sx={{ mt: 1, ...(PRO_FLAG.test(pro) || props.detail.rightsFlag ? { color: "error.main" } : {}) }}>
          {fieldLabel("proAnswer", props.detail.detailFields)}: {pro}
        </Typography>
      )}
    </Box>
  );
};

// Everything intake noticed, in one place: triage score with its parts, advisory notes, rights flag, possible duplicate.
const IntakeFindings = (props: { detail: CommonsSubmissionDetail }) => {
  const { detail } = props;
  const q = detail.qualityDetail || detail.payload?.qualityDetail;
  // the heuristic-only caveat is already on the score line
  const notes = (q?.notes || "").split(/\r?\n|;\s+/).map((n) => n.trim()).filter((n) => n && !/heuristic only/i.test(n));
  const score = detail.triageScore;
  const items: React.ReactNode[] = [];
  if (score != null) {
    items.push(
      <li key="score" data-testid="commons-finding-score">
        {Locale.label("serverAdmin.commonsTab.triageScore")}: <strong>{score}</strong>
        {q?.parts?.length ? ` = ${q.parts.join(" + ")}` : ""}
        {!q?.llm && <Typography component="span" variant="caption" color="text.secondary"> · {Locale.label("serverAdmin.commonsTab.scoreHeuristicOnly")}</Typography>}
      </li>
    );
  }
  notes.forEach((n, i) => items.push(<li key={`note-${i}`} data-testid="commons-finding-note">{n}</li>));
  if (detail.rightsFlag) items.push(<li key="rights" data-testid="commons-finding-rights"><Chip size="small" color="warning" label={Locale.label("serverAdmin.commonsTab.rightsFlag")} sx={{ mr: 1 }} />{Locale.label("serverAdmin.commonsTab.rightsFlagTooltip")}</li>);
  if (detail.possibleDuplicate) {
    const q2 = encodeURIComponent(detail.assetName || detail.payload?.name || "");
    items.push(
      <li key="dup" data-testid="commons-finding-duplicate">
        <Chip size="small" color="warning" label={Locale.label("serverAdmin.commonsTab.possibleDuplicate")} sx={{ mr: 1 }} />
        <a href={`${getWorshipCommonsOrigin()}/songs?q=${q2}`} target="_blank" rel="noopener noreferrer">{Locale.label("serverAdmin.commonsTab.possibleDuplicateSearch")}</a>
      </li>
    );
  }
  return (
    <Box sx={{ mb: 2 }} data-testid="commons-intake-findings">
      <Typography variant="subtitle1" sx={{ mb: 0.5 }}>{Locale.label("serverAdmin.commonsTab.intakeFindings")}</Typography>
      {items.length === 0
        ? <Typography variant="body2">{Locale.label("serverAdmin.commonsTab.noFindings")}</Typography>
        : <Box component="ul" sx={{ m: 0, pl: 2.5, "& li": { mb: 0.5, fontSize: 14 } }}>{items}</Box>}
    </Box>
  );
};

const manifestRows = (detail: CommonsSubmissionDetail): CommonsManifestRow[] => {
  const m = detail.manifest || detail.live?.manifest;
  const rows = m?.sources || m?.files;
  return Array.isArray(rows) ? rows.filter((r) => r && r.file) : [];
};

const SourcesTable = (props: { rows: CommonsManifestRow[] }) => (
  <Box sx={{ mt: 2 }} data-testid="commons-sources">
    <Typography variant="subtitle1" sx={{ mb: 0.5 }}>{Locale.label("serverAdmin.commonsTab.sources")}</Typography>
    <Box sx={{ overflowX: "auto" }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{Locale.label("serverAdmin.commonsTab.colFile")}</TableCell>
            <TableCell>{Locale.label("serverAdmin.commonsTab.colBasis")}</TableCell>
            <TableCell>{Locale.label("serverAdmin.commonsTab.colSha")}</TableCell>
            <TableCell>{Locale.label("serverAdmin.commonsTab.submittedBy")}</TableCell>
            <TableCell>{Locale.label("serverAdmin.commonsTab.date")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {props.rows.map((r, i) => (
            <TableRow key={`${r.file}-${i}`}>
              <TableCell>{r.url ? <a href={r.url} target="_blank" rel="noreferrer">{r.file}</a> : r.file}{r.original ? ` · ${Locale.label("serverAdmin.commonsTab.original")}` : ""}</TableCell>
              <TableCell>{r.licenseBasis || "-"}{r.note ? <Typography variant="caption" color="text.secondary" display="block">{r.note}</Typography> : null}</TableCell>
              <TableCell><code>{r.sha256 ? r.sha256.slice(0, 8) : "-"}</code></TableCell>
              <TableCell>{r.submittedBy || "-"}</TableCell>
              <TableCell>{shortDate(r.acquired) || "-"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  </Box>
);

const submitterRecord = (stats?: CommonsSubmissionDetail["submitterStats"]) => {
  if (!stats) return "";
  if (stats.total === 0) return Locale.label("serverAdmin.commonsTab.firstSubmission");
  return `${stats.approved}/${stats.total} ${Locale.label("serverAdmin.commonsTab.approvedSuffix")}`;
};

const submissionType = (detail: CommonsSubmissionDetail): SubmissionType => detail.type || detail.payload?.type || (detail.isNewAsset ? "new" : "correction");

const ChordProChart = (props: { chordPro: string }) => {
  const html = props.chordPro.split("\n").map((line) => ChordProHelper.replaceChords(ChordProHelper.escapeHtml(line))).join("<br/>");
  return (
    <Box
      sx={{
        maxHeight: 280,
        overflow: "auto",
        bgcolor: "action.hover",
        p: 1.5,
        fontSize: 13,
        fontFamily: "monospace",
        lineHeight: 1.8,
        "& sup": { fontWeight: 700, fontSize: "0.7em", color: "primary.main" }
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

const errorText = (e: unknown): string => (e instanceof Error ? e.message : String(e || "Error"));

interface Props {
  submissionId: string;
  queueIds: string[];
  musicEditor?: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  onApproved: (id: string, assetId?: string) => void;
  onRejected: (id: string) => void;
  onChangesRequested?: (id: string) => void;
}

export const CommonsReviewDrawer = (props: Props) => {
  const { submissionId, queueIds, musicEditor, onClose, onSelect, onApproved, onRejected, onChangesRequested } = props;
  const [detail, setDetail] = React.useState<CommonsSubmissionDetail | null>(null);
  const [approveNote, setApproveNote] = React.useState("");
  const [approveConfirm, setApproveConfirm] = React.useState(false);
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState<RejectReason>("quality");
  const [rejectNote, setRejectNote] = React.useState("");
  const [changesOpen, setChangesOpen] = React.useState(false);
  const [changesNote, setChangesNote] = React.useState("");
  const [declined, setDeclined] = React.useState<Record<string, string>>({});
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const approveBtnRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    setDetail(null);
    setApproveNote("");
    setApproveConfirm(false);
    setRejectOpen(false);
    setRejectReason("quality");
    setRejectNote("");
    setChangesOpen(false);
    setChangesNote("");
    setDeclined({});
    setError("");
    let cancelled = false;
    CommonsApi.get(`/admin/submissions/${submissionId}`).then((d) => { if (!cancelled) setDetail(d); }).catch((e) => { if (!cancelled) setError(errorText(e)); });
    return () => { cancelled = true; };
  }, [submissionId]);

  const declineFiles: CommonsDeclinedFile[] = React.useMemo(() => Object.entries(declined).map(([name, reason]) => ({ name, reason: reason.trim() })), [declined]);
  const declineMissingReason = declineFiles.some((d) => !d.reason);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try { await fn(); } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };

  const approve = () => run(async () => {
    const body: Record<string, unknown> = {};
    if (approveNote.trim()) body.note = approveNote.trim();
    if (declineFiles.length) body.declineFiles = declineFiles;
    const result = await CommonsApi.post(`/admin/submissions/${submissionId}/approve`, body);
    setApproveConfirm(false);
    onApproved(submissionId, result?.assetId || detail?.assetId);
  });

  const reject = () => run(async () => {
    if (!rejectNote.trim()) return;
    await CommonsApi.post(`/admin/submissions/${submissionId}/reject`, { reason: rejectReason, note: rejectNote.trim() });
    onRejected(submissionId);
  });

  const requestChanges = () => run(async () => {
    if (!changesNote.trim()) return;
    await CommonsApi.post(`/admin/submissions/${submissionId}/request-changes`, { note: changesNote.trim() });
    (onChangesRequested || onRejected)(submissionId);
  });

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const i = queueIds.indexOf(submissionId);
      if (e.key === "j" || e.key === "J") {
        if (i >= 0 && i < queueIds.length - 1) onSelect(queueIds[i + 1]);
      } else if (e.key === "k" || e.key === "K") {
        if (i > 0) onSelect(queueIds[i - 1]);
      } else if (e.key === "a" || e.key === "A") {
        e.preventDefault();
        approveBtnRef.current?.focus();
      } else if (e.key === "r" || e.key === "R") setRejectOpen(true);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [submissionId, queueIds, onSelect]);

  const liveFiles = detail?.live?.files || [];
  const proposedFiles = detail?.files || [];
  const changedNames = new Set(proposedFiles.map((f) => f.name));
  const unchangedFiles = liveFiles.filter((f) => !changedNames.has(f.name));
  const audioFiles = proposedFiles.filter((f) => AUDIO_EXT.includes(extOf(f.name)));
  const otherFiles = proposedFiles.filter((f) => !AUDIO_EXT.includes(extOf(f.name)));
  const chordPro = typeof detail?.payload?.detail?.chordPro === "string" ? detail.payload.detail.chordPro : "";
  const liveChordPro = typeof detail?.live?.payload?.detail?.chordPro === "string" ? detail.live.payload.detail.chordPro : "";
  const chordProLabel = fieldLabel("chordPro", detail?.detailFields);
  const chordDiff = React.useMemo(() => (!detail?.isNewAsset && liveChordPro && chordPro && liveChordPro !== chordPro ? lineDiff(liveChordPro, chordPro) : null), [detail?.isNewAsset, liveChordPro, chordPro]);
  const sources = detail ? manifestRows(detail) : [];
  const contributors = detail?.contributors || detail?.live?.contributors || [];
  const rightsChange = !!detail && !detail.isNewAsset && (detail.diff?.fields || []).some((f) => RIGHTS_KEY.test(f.key));
  const approveBlocked = !!musicEditor && rightsChange;
  const type = detail ? submissionType(detail) : "new";

  const declineHandler = (name: string) => (reason: string | null) => setDeclined((prev) => {
    const next = { ...prev };
    if (reason === null) delete next[name]; else next[name] = reason;
    return next;
  });

  return (
    <Drawer anchor="right" open onClose={onClose} data-testid="commons-drawer" sx={{ zIndex: (theme) => theme.zIndex.drawer + 2 }} PaperProps={{ sx: { width: { xs: "100%", sm: 560, md: 880 } } }}>
      {!detail ? (
        <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>{error ? <Alert severity="error">{error}</Alert> : <CircularProgress />}</Box>
      ) : (
        <Box sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography variant="h6">{detail.assetName}</Typography>
                <Chip size="small" color={type === "removal" ? "error" : type === "new" ? "success" : "info"} label={submissionTypeLabel(type)} data-testid="commons-drawer-type" />
              </Stack>
              <Typography variant="body2" color="text.secondary">{[detail.typeLabel, detail.productLabel].filter(Boolean).join(" · ")}</Typography>
              <Typography variant="body2">
                {Locale.label("serverAdmin.commonsTab.submittedBy")}: {detail.submittedByName || "-"}
                {detail.submitterStats ? ` (${submitterRecord(detail.submitterStats)})` : ""}
              </Typography>
              {detail.note && <Typography variant="body2" sx={{ mt: 1 }}><em>{detail.note}</em></Typography>}
            </Box>
            <IconButton onClick={onClose} aria-label={Locale.label("common.close", "Close")}><CloseIcon /></IconButton>
          </Stack>

          <Divider sx={{ my: 2 }} />

          {detail.previewUrl && (
            <Box sx={{ mb: 2, border: "1px solid", borderColor: "divider", borderRadius: 1, overflow: "hidden" }}>
              <iframe title="preview" src={detail.previewUrl} sandbox="allow-scripts allow-same-origin" style={{ width: "100%", height: 440, border: 0, display: "block" }} />
            </Box>
          )}

          {chordPro && (!detail.previewUrl || (chordDiff && hasChanges(chordDiff))) && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>{chordProLabel === "chordPro" ? Locale.label("serverAdmin.commonsTab.lyricsAndChords") : chordProLabel}</Typography>
              {chordDiff && hasChanges(chordDiff)
                ? <LineDiffView from={liveChordPro} to={chordPro} chords testId="commons-line-diff-chordPro" />
                : !detail.previewUrl && <ChordProChart chordPro={chordPro} />}
            </Box>
          )}

          {audioFiles.length > 0 && (
            <Box sx={{ mb: 2 }}>
              {audioFiles.map((f) => <FileCard key={f.name} file={f} declined={declined[f.name]} onDecline={f.action === "remove" ? undefined : declineHandler(f.name)} />)}
            </Box>
          )}

          <RightsBlock detail={detail} hasAudio={audioFiles.some((f) => f.action !== "remove")} />

          <IntakeFindings detail={detail} />

          <Grid container spacing={3} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>{Locale.label("serverAdmin.commonsTab.changes")}</Typography>
              <DiffList detail={detail} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>{Locale.label("serverAdmin.commonsTab.files")}</Typography>
              {otherFiles.length === 0 && audioFiles.length === 0 && <Typography variant="body2">{Locale.label("serverAdmin.commonsTab.noFieldChanges")}</Typography>}
              {otherFiles.map((f) => <FileCard key={f.name} file={f} declined={declined[f.name]} onDecline={f.action === "remove" ? undefined : declineHandler(f.name)} />)}
              {unchangedFiles.length > 0 && (
                <>
                  <Typography variant="caption" color="text.secondary">{Locale.label("serverAdmin.commonsTab.unchangedFiles")}</Typography>
                  {unchangedFiles.map((f) => <Typography key={f.name} variant="body2" sx={{ opacity: 0.5 }}>{f.name}</Typography>)}
                </>
              )}
            </Grid>
          </Grid>

          {sources.length > 0 && <SourcesTable rows={sources} />}

          {contributors.length > 0 && (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }} data-testid="commons-contributors">
              {Locale.label("serverAdmin.commonsTab.contributors")}: {contributors.map((c) => `${c.name} (${submissionTypeLabel(c.what)}${c.at ? `, ${shortDate(c.at)}` : ""})`).join(" · ")}
            </Typography>
          )}

          <Divider sx={{ my: 2 }} />

          {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")} data-testid="commons-drawer-error">{error}</Alert>}
          {approveBlocked && <Alert severity="warning" sx={{ mb: 2 }} data-testid="commons-drawer-rights-blocked">{Locale.label("serverAdmin.commonsTab.musicEditorRightsBlocked")}</Alert>}

          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap sx={{ position: "sticky", bottom: 0, zIndex: 1, bgcolor: "background.paper", py: 1.5, borderTop: 1, borderColor: "divider" }} data-testid="commons-drawer-actions">
            {!approveBlocked && (
              <>
                <TextField size="small" label={Locale.label("serverAdmin.commonsTab.approveNote")} value={approveNote} onChange={(e) => setApproveNote(e.target.value)} sx={{ flexGrow: 1, minWidth: 200 }} />
                <Button ref={approveBtnRef} variant="contained" color="success" disabled={busy} onClick={() => setApproveConfirm(true)} data-testid="commons-drawer-approve">
                  {Locale.label("serverAdmin.commonsTab.approve")}{declineFiles.length ? ` (${declineFiles.length} ${Locale.label("serverAdmin.commonsTab.declinedSuffix")})` : ""}
                </Button>
              </>
            )}
            <Button variant="outlined" color="warning" disabled={busy} onClick={() => { setChangesOpen(true); setRejectOpen(false); }} data-testid="commons-drawer-request-changes">{Locale.label("serverAdmin.commonsTab.requestChanges")}</Button>
            <Button variant="outlined" color="error" disabled={busy} onClick={() => { setRejectOpen(true); setChangesOpen(false); }} data-testid="commons-drawer-reject">{Locale.label("serverAdmin.commonsTab.reject")}</Button>
            <Typography variant="caption" color="text.secondary" sx={{ width: "100%" }}>{Locale.label("serverAdmin.commonsTab.shortcuts")}</Typography>
          </Stack>

          <Dialog open={approveConfirm} onClose={() => setApproveConfirm(false)} fullWidth maxWidth="xs">
            <DialogTitle>{Locale.label("serverAdmin.commonsTab.confirmApprove")}</DialogTitle>
            <DialogContent>
              <Typography variant="body2">
                {Locale.label("serverAdmin.commonsTab.confirmApproveDetail")
                  .replace("{name}", detail.assetName || "")
                  .replace("{license}", licenseLabel(detail.payload?.license))}
              </Typography>
              {declineFiles.length > 0 && (
                <Box sx={{ mt: 1.5 }} data-testid="commons-approve-declined-list">
                  <Typography variant="caption" color="text.secondary">{Locale.label("serverAdmin.commonsTab.declinedFiles")}</Typography>
                  <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                    {declineFiles.map((d) => <li key={d.name}><Typography variant="body2">{d.name}{d.reason ? ` — ${d.reason}` : ""}</Typography></li>)}
                  </Box>
                  {declineMissingReason && <Typography variant="caption" color="error.main">{Locale.label("serverAdmin.commonsTab.declineReasonRequired")}</Typography>}
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setApproveConfirm(false)}>{Locale.label("common.cancel")}</Button>
              <Button variant="contained" color="success" disabled={busy || declineMissingReason} onClick={approve} data-testid="commons-drawer-approve-confirm">
                {Locale.label("serverAdmin.commonsTab.approve")}
              </Button>
            </DialogActions>
          </Dialog>

          {changesOpen && (
            <Stack spacing={1.5} sx={{ mt: 2, p: 2, backgroundColor: "action.hover", borderRadius: 1 }} data-testid="commons-request-changes">
              <TextField
                size="small"
                multiline
                minRows={2}
                label={Locale.label("serverAdmin.commonsTab.requestChangesNote")}
                value={changesNote}
                onChange={(e) => setChangesNote(e.target.value)}
                data-testid="commons-request-changes-note"
              />
              <Box>
                <Button variant="contained" color="warning" disabled={busy || !changesNote.trim()} onClick={requestChanges} data-testid="commons-request-changes-confirm">
                  {Locale.label("serverAdmin.commonsTab.confirmRequestChanges")}
                </Button>
              </Box>
            </Stack>
          )}

          {rejectOpen && (
            <Stack spacing={1.5} sx={{ mt: 2, p: 2, backgroundColor: "action.hover", borderRadius: 1 }}>
              <FormControl size="small">
                <InputLabel id="commons-drawer-reject-reason-label">{Locale.label("serverAdmin.commonsTab.reason")}</InputLabel>
                <Select
                  labelId="commons-drawer-reject-reason-label"
                  label={Locale.label("serverAdmin.commonsTab.reason")}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value as RejectReason)}
                  data-testid="commons-reject-reason"
                >
                  {REJECT_REASONS.map((r) => <MenuItem key={r} value={r}>{rejectReasonLabel(r)}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField
                size="small"
                multiline
                minRows={2}
                label={Locale.label("serverAdmin.commonsTab.note")}
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                data-testid="commons-reject-note"
              />
              <Box>
                <Button variant="contained" color="error" disabled={busy || !rejectNote.trim()} onClick={reject} data-testid="commons-reject-confirm">
                  {Locale.label("serverAdmin.commonsTab.confirmReject")}
                </Button>
              </Box>
            </Stack>
          )}
        </Box>
      )}
    </Drawer>
  );
};
