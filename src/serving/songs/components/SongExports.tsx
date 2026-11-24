import React from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from "@mui/material";
import { ApiHelper, DateHelper, Locale } from "@churchapps/apphelper";
import { AppDatePicker } from "../../../components";
import { ExportButton } from "../../../components/ui";
import {
  buildSongLibraryRows, buildSongUsageRows, defaultUsageRange, toCsv,
  type ExportArrangement, type ExportArrangementKey, type ExportLink, type ExportSongDetail, type SongLibraryRow, type SongPlanItem, type SongUsageRow
} from "../songExport";

// The church's whole song library in four requests; the exports join it in the browser.
const loadLibrary = async () => {
  const [songDetails, arrangements, keys, links] = await Promise.all([
    ApiHelper.get("/songDetails", "ContentApi") as Promise<ExportSongDetail[]>,
    ApiHelper.get("/arrangements", "ContentApi") as Promise<ExportArrangement[]>,
    ApiHelper.get("/arrangementKeys", "ContentApi") as Promise<ExportArrangementKey[]>,
    ApiHelper.get("/songDetailLinks/church/CCLI", "ContentApi") as Promise<ExportLink[]>
  ]);
  return { songDetails: songDetails || [], arrangements: arrangements || [], keys: keys || [], links: links || [] };
};

const downloadCsv = (csv: string, filename: string) => {
  const url = window.URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/** The song library as a CSV: title, artist, CCLI number and link, and keys. Loads on click, then downloads. */
export const SongLibraryExport: React.FC = () => {
  const [rows, setRows] = React.useState<SongLibraryRow[] | null>(null);
  const [pending, setPending] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  const headers = React.useMemo(() => [
    { label: Locale.label("songs.export.title", "Title"), key: "title" },
    { label: Locale.label("songs.export.artist", "Artist"), key: "artist" },
    { label: Locale.label("songs.export.ccliNumber", "CCLI number"), key: "ccliNumber" },
    { label: Locale.label("songs.export.ccliLink", "CCLI link"), key: "ccliLink" },
    { label: Locale.label("songs.export.keys", "Keys"), key: "keys" }
  ], []);

  const handleRequest = async () => {
    setPending(true);
    try {
      const lib = await loadLibrary();
      setRows(buildSongLibraryRows(lib.songDetails, lib.arrangements, lib.keys, lib.links));
    } catch (error) {
      console.error("Failed to load the song library export:", error);
      setPending(false);
    }
  };

  // Once the rows are in, click the real download link the export button renders (same as the People export).
  React.useEffect(() => {
    if (!pending || !rows) return;
    let tries = 0;
    const timer = setInterval(() => {
      const link = ref.current?.querySelector("a");
      if (link || ++tries > 30) {
        clearInterval(timer);
        setPending(false);
        link?.click();
      }
    }, 100);
    return () => clearInterval(timer);
  }, [pending, rows]);

  const text = Locale.label("songs.export.library", "Export");
  return (
    <Box ref={ref} data-testid="songs-library-export">
      {rows
        ? <ExportButton data={rows} customHeaders={headers} filename="songs.csv" text={text} />
        : <ExportButton data={[]} text={text} onRequestData={pending ? undefined : handleRequest} />}
    </Box>
  );
};

interface UsageDialogProps { onClose: () => void }

/** Date range CSV of the songs used on plans: title, artist, CCLI number, times used and plan dates. */
export const SongUsageExportDialog: React.FC<UsageDialogProps> = ({ onClose }) => {
  const defaults = React.useMemo(() => defaultUsageRange(), []);
  const [startDate, setStartDate] = React.useState(defaults.startDate);
  const [endDate, setEndDate] = React.useState(defaults.endDate);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ severity: "info" | "error"; text: string } | null>(null);
  const validRange = !!startDate && !!endDate && startDate <= endDate;

  const handleExport = async () => {
    if (!validRange || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const [items, lib] = await Promise.all([
        ApiHelper.get(`/planItems/songs?startDate=${startDate}&endDate=${endDate}`, "DoingApi") as Promise<SongPlanItem[]>,
        loadLibrary()
      ]);
      const rows = buildSongUsageRows(items || [], lib.keys, lib.arrangements, lib.songDetails, lib.links, (d) => DateHelper.toDate(d));
      if (rows.length === 0) {
        setMessage({ severity: "info", text: Locale.label("songs.export.noUsage", "No songs were used on plans between these dates.") });
        return;
      }
      const headers: { label: string; key: keyof SongUsageRow }[] = [
        { label: Locale.label("songs.export.title", "Title"), key: "title" },
        { label: Locale.label("songs.export.artist", "Artist"), key: "artist" },
        { label: Locale.label("songs.export.ccliNumber", "CCLI number"), key: "ccliNumber" },
        { label: Locale.label("songs.export.timesUsed", "Times used"), key: "timesUsed" },
        { label: Locale.label("songs.export.planDates", "Plan dates"), key: "planDates" }
      ];
      downloadCsv(toCsv(headers, rows), `song-usage-${startDate}-to-${endDate}.csv`);
      onClose();
    } catch (error) {
      console.error("Failed to export song usage:", error);
      setMessage({ severity: "error", text: Locale.label("common.error", "Something went wrong.") });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs" data-testid="song-usage-dialog">
      <DialogTitle>{Locale.label("songs.export.usageTitle", "Export song usage")}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">{Locale.label("songs.export.usageHint", "Songs used on plans between these dates, with CCLI numbers, for your CCLI report.")}</Typography>
          <AppDatePicker label={Locale.label("songs.export.startDate", "Start date")} value={startDate} onChange={(e) => setStartDate(e.target.value)} size="small" InputLabelProps={{ shrink: true }} inputProps={{ "data-testid": "song-usage-start" }} />
          <AppDatePicker label={Locale.label("songs.export.endDate", "End date")} value={endDate} onChange={(e) => setEndDate(e.target.value)} size="small" InputLabelProps={{ shrink: true }} inputProps={{ "data-testid": "song-usage-end" }} />
          {message && <Alert severity={message.severity}>{message.text}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{Locale.label("common.cancel", "Cancel")}</Button>
        <Button variant="contained" onClick={handleExport} disabled={!validRange || busy} data-testid="song-usage-export-button">{Locale.label("songs.export.export", "Export CSV")}</Button>
      </DialogActions>
    </Dialog>
  );
};
