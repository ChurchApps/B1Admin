import React from "react";
import { Locale } from "@churchapps/apphelper";
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Drawer, FormControl, Grid,
  IconButton, InputLabel, MenuItem, Select, Stack, TextField, Tooltip, Typography
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { CommonsApi, REJECT_REASONS, type CommonsDetailField, type CommonsSubmissionDetail, type CommonsSubmissionFile, type RejectReason } from "../commonsApi";
import { ChordProHelper } from "../../helpers/ChordProHelper";

const IMAGE_EXT = ["png", "jpg", "jpeg", "webp"];
const AUDIO_EXT = ["mp3", "wav", "m4a", "ogg"];
const TEXT_EXT = ["json", "abc", "chordpro", "txt"];
const LONG_TEXT_MIN = 120;
const SKIP_DETAIL = new Set(["chordPro", "certified", "recordingOwned", "proAnswer"]);
const SKIP_NEW = new Set([...SKIP_DETAIL, "license"]);
const PRO_FLAG = /GEMA|publisher/i;

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

const FileCard = (props: { file: CommonsSubmissionFile }) => {
  const { file } = props;
  const ext = extOf(file.name);
  const color = file.action === "remove" ? "error" : file.action === "replace" ? "warning" : "success";
  return (
    <Box sx={{ mb: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Chip size="small" color={color} label={file.action} />
        <Typography variant="body2">{file.name}</Typography>
      </Stack>
      {file.url && IMAGE_EXT.includes(ext) && <img src={file.url} alt={file.name} style={{ maxWidth: "100%", marginTop: 4, borderRadius: 4 }} />}
      {file.url && AUDIO_EXT.includes(ext) && <audio controls src={file.url} style={{ width: "100%", marginTop: 4 }} />}
      {file.url && ext === "pdf" && <embed src={file.url} type="application/pdf" width="100%" height={300} style={{ marginTop: 4 }} />}
      {file.url && TEXT_EXT.includes(ext) && <TextFilePreview url={file.url} />}
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
  return fields?.find((f) => f.key === k)?.label || Locale.label(`serverAdmin.commonsTab.field.${k}`, k);
};

const displayValue = (key: string, v: unknown): string => {
  const k = key.replace(/^detail\./, "");
  if (k === "license") return licenseLabel(v == null ? "" : String(v));
  if (typeof v === "boolean") return v ? Locale.label("common.yes") : Locale.label("common.no");
  return fieldValue(v);
};

const LabeledValue = (props: { fieldKey: string; value: unknown; fields?: CommonsDetailField[] }) => {
  const long = typeof props.value === "string" && props.value.length > LONG_TEXT_MIN;
  const label = fieldLabel(props.fieldKey, props.fields);
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
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
  if (detail.diff.fields.length === 0) return <Typography variant="body2">{Locale.label("serverAdmin.commonsTab.noFieldChanges")}</Typography>;
  return (
    <Box>
      {detail.diff.fields.map((f) => {
        const k = f.key.replace(/^detail\./, "");
        if (SKIP_DETAIL.has(k) || k === "qualityDetail") return null;
        const long = (typeof f.from === "string" && f.from.length > LONG_TEXT_MIN) || (typeof f.to === "string" && f.to.length > LONG_TEXT_MIN);
        return (
          <Box key={f.key} sx={{ mb: 1.5 }}>
            <Typography variant="caption" color="text.secondary">{fieldLabel(f.key, detail.detailFields)}</Typography>
            {long ? (
              <Stack spacing={0.5}>
                <Box component="pre" sx={{ maxHeight: 150, overflow: "auto", bgcolor: "action.hover", p: 1, fontSize: 12, whiteSpace: "pre-wrap" }}>{fieldValue(f.from)}</Box>
                <Typography variant="caption">&#8595;</Typography>
                <Box component="pre" sx={{ maxHeight: 150, overflow: "auto", bgcolor: "action.hover", p: 1, fontSize: 12, whiteSpace: "pre-wrap" }}>{fieldValue(f.to)}</Box>
              </Stack>
            ) : (
              <Typography variant="body2">{displayValue(f.key, f.from)} &rarr; {displayValue(f.key, f.to)}</Typography>
            )}
          </Box>
        );
      })}
    </Box>
  );
};

const RightsBlock = (props: { detail: CommonsSubmissionDetail }) => {
  const payload = props.detail.payload || {};
  const d = payload.detail || {};
  const attestations = props.detail.attestations?.length
    ? props.detail.attestations
    : [{ key: "certified", label: Locale.label("serverAdmin.commonsTab.field.certified", "Certified") }];
  const pro = d.proAnswer == null || d.proAnswer === "" ? "" : String(d.proAnswer);
  return (
    <Box sx={{ mb: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="subtitle1">{Locale.label("serverAdmin.commonsTab.rights")}</Typography>
        {props.detail.rightsFlag && (
          <Tooltip title={Locale.label("serverAdmin.commonsTab.rightsFlagTooltip")}>
            <Chip size="small" color="warning" label={Locale.label("serverAdmin.commonsTab.rightsFlag")} />
          </Tooltip>
        )}
      </Stack>
      <LabeledValue fieldKey="license" value={payload.license} fields={props.detail.detailFields} />
      {attestations.map((a) => (
        <Box key={a.key} sx={{ mb: 1.5 }}>
          <Typography variant="caption" color="text.secondary">{a.label}</Typography>
          <Typography variant="body2">{displayValue(a.key, d[a.key])}</Typography>
        </Box>
      ))}
      {pro && (
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="caption" color="text.secondary">{fieldLabel("proAnswer", props.detail.detailFields)}</Typography>
          <Typography variant="body2" sx={PRO_FLAG.test(pro) || props.detail.rightsFlag ? { color: "error.main" } : undefined}>{pro}</Typography>
        </Box>
      )}
    </Box>
  );
};

const submitterRecord = (stats?: CommonsSubmissionDetail["submitterStats"]) => {
  if (!stats) return "";
  if (stats.total === 0) return Locale.label("serverAdmin.commonsTab.firstSubmission");
  return `${stats.approved}/${stats.total} ${Locale.label("serverAdmin.commonsTab.approvedSuffix")}`;
};

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

interface Props {
  submissionId: string;
  queueIds: string[];
  onClose: () => void;
  onSelect: (id: string) => void;
  onApproved: (id: string, assetId?: string) => void;
  onRejected: (id: string) => void;
}

export const CommonsReviewDrawer = (props: Props) => {
  const { submissionId, queueIds, onClose, onSelect, onApproved, onRejected } = props;
  const [detail, setDetail] = React.useState<CommonsSubmissionDetail | null>(null);
  const [approveNote, setApproveNote] = React.useState("");
  const [approveConfirm, setApproveConfirm] = React.useState(false);
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState<RejectReason>("quality");
  const [rejectNote, setRejectNote] = React.useState("");
  const approveBtnRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    setDetail(null);
    setApproveNote("");
    setApproveConfirm(false);
    setRejectOpen(false);
    setRejectReason("quality");
    setRejectNote("");
    CommonsApi.get(`/admin/submissions/${submissionId}`).then(setDetail);
  }, [submissionId]);

  const approve = React.useCallback(async () => {
    const result = await CommonsApi.post(`/admin/submissions/${submissionId}/approve`, approveNote.trim() ? { note: approveNote.trim() } : {});
    onApproved(submissionId, result?.assetId || detail?.assetId);
  }, [submissionId, approveNote, onApproved, detail?.assetId]);

  const reject = async () => {
    if (!rejectNote.trim()) return;
    await CommonsApi.post(`/admin/submissions/${submissionId}/reject`, { reason: rejectReason, note: rejectNote.trim() });
    onRejected(submissionId);
  };

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
  const changedNames = new Set((detail?.files || []).map((f) => f.name));
  const unchangedFiles = liveFiles.filter((f) => !changedNames.has(f.name));
  const audioFiles = (detail?.files || []).filter((f) => AUDIO_EXT.includes(extOf(f.name)));
  const otherFiles = (detail?.files || []).filter((f) => !AUDIO_EXT.includes(extOf(f.name)));
  const chordPro = typeof detail?.payload?.detail?.chordPro === "string" ? detail.payload.detail.chordPro : "";
  const chordProLabel = fieldLabel("chordPro", detail?.detailFields);

  return (
    <Drawer anchor="right" open onClose={onClose} data-testid="commons-drawer" PaperProps={{ sx: { width: { xs: "100%", sm: 560, md: 880 } } }}>
      {!detail ? (
        <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}><CircularProgress /></Box>
      ) : (
        <Box sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography variant="h6">{detail.assetName}</Typography>
              <Typography variant="body2" color="text.secondary">{detail.typeLabel} &middot; {detail.productLabel}</Typography>
              <Typography variant="body2">
                {Locale.label("serverAdmin.commonsTab.submittedBy")}: {detail.submittedByName || "-"}
                {detail.submitterStats ? ` (${submitterRecord(detail.submitterStats)})` : ""}
              </Typography>
              {detail.note && <Typography variant="body2" sx={{ mt: 1 }}><em>{detail.note}</em></Typography>}
            </Box>
            <IconButton onClick={onClose} aria-label={Locale.label("common.close", "Close")}><CloseIcon /></IconButton>
          </Stack>

          <RightsBlock detail={detail} />

          {chordPro && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>{chordProLabel === "chordPro" ? Locale.label("serverAdmin.commonsTab.lyricsAndChords") : chordProLabel}</Typography>
              <ChordProChart chordPro={chordPro} />
            </Box>
          )}

          {audioFiles.length > 0 && (
            <Box sx={{ mb: 2 }}>
              {audioFiles.map((f) => <FileCard key={f.name} file={f} />)}
            </Box>
          )}

          <Grid container spacing={3} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>{Locale.label("serverAdmin.commonsTab.changes")}</Typography>
              <DiffList detail={detail} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>{Locale.label("serverAdmin.commonsTab.files")}</Typography>
              {otherFiles.length === 0 && audioFiles.length === 0 && <Typography variant="body2">{Locale.label("serverAdmin.commonsTab.noFieldChanges")}</Typography>}
              {otherFiles.map((f) => <FileCard key={f.name} file={f} />)}
              {unchangedFiles.length > 0 && (
                <>
                  <Typography variant="caption" color="text.secondary">{Locale.label("serverAdmin.commonsTab.unchangedFiles")}</Typography>
                  {unchangedFiles.map((f) => <Typography key={f.name} variant="body2" sx={{ opacity: 0.5 }}>{f.name}</Typography>)}
                </>
              )}
            </Grid>
          </Grid>

          {detail.previewUrl && (
            <Box sx={{ mt: 2, border: "1px solid", borderColor: "divider", borderRadius: 1, overflow: "hidden" }}>
              <iframe title="preview" src={detail.previewUrl} sandbox="allow-scripts allow-same-origin" style={{ width: "100%", height: 320, border: 0, display: "block" }} />
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
            <TextField size="small" label={Locale.label("serverAdmin.commonsTab.approveNote")} value={approveNote} onChange={(e) => setApproveNote(e.target.value)} sx={{ flexGrow: 1, minWidth: 200 }} />
            <Button ref={approveBtnRef} variant="contained" color="success" onClick={() => setApproveConfirm(true)} data-testid="commons-drawer-approve">{Locale.label("serverAdmin.commonsTab.approve")}</Button>
            <Button variant="outlined" color="error" onClick={() => setRejectOpen(true)} data-testid="commons-drawer-reject">{Locale.label("serverAdmin.commonsTab.reject")}</Button>
          </Stack>

          <Dialog open={approveConfirm} onClose={() => setApproveConfirm(false)} fullWidth maxWidth="xs">
            <DialogTitle>{Locale.label("serverAdmin.commonsTab.confirmApprove")}</DialogTitle>
            <DialogContent>
              <Typography variant="body2">
                {Locale.label("serverAdmin.commonsTab.confirmApproveDetail")
                  .replace("{name}", detail.assetName || "")
                  .replace("{license}", licenseLabel(detail.payload?.license))}
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setApproveConfirm(false)}>{Locale.label("common.cancel")}</Button>
              <Button variant="contained" color="success" onClick={approve} data-testid="commons-drawer-approve-confirm">
                {Locale.label("serverAdmin.commonsTab.approve")}
              </Button>
            </DialogActions>
          </Dialog>

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
                  {REJECT_REASONS.map((r) => <MenuItem key={r} value={r}>{Locale.label(`serverAdmin.commonsTab.rejectReason.${r}`)}</MenuItem>)}
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
                <Button variant="contained" color="error" disabled={!rejectNote.trim()} onClick={reject} data-testid="commons-reject-confirm">
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
