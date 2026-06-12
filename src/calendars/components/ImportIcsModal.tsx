import { useState, useEffect } from "react";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { type GroupInterface } from "@churchapps/helpers";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from "@mui/material";

interface Props {
  onDone: (imported: boolean) => void;
}

export function ImportIcsModal(props: Props) {
  const [groups, setGroups] = useState<GroupInterface[]>([]);
  const [groupId, setGroupId] = useState("");
  const [icsText, setIcsText] = useState("");
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    ApiHelper.get("/groups", "MembershipApi").then(setGroups);
  }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then(setIcsText);
  };

  const handleImport = () => {
    setImporting(true);
    setError("");
    ApiHelper.post("/events/ical", { ics: icsText, groupId }, "ContentApi").then((data: any[]) => {
      setImporting(false);
      if (!data || data.length === 0) setError(Locale.label("calendars.importIcs.noEventsFound"));
      else setImportedCount(data.length);
    }).catch(() => {
      setImporting(false);
      setError(Locale.label("calendars.importIcs.failed"));
    });
  };

  return (
    <Dialog open={true} onClose={() => props.onDone(importedCount !== null)} fullWidth scroll="body">
      <DialogTitle>{Locale.label("calendars.importIcs.title")}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField fullWidth select label={Locale.label("calendars.importIcs.group")} value={groupId} onChange={(e) => setGroupId(e.target.value)} data-testid="import-ics-group-select">
            {groups.map((g) => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
          </TextField>
          <Button variant="outlined" component="label" data-testid="import-ics-file-button">
            {Locale.label("calendars.importIcs.chooseFile")}
            <input type="file" accept=".ics,text/calendar" hidden onChange={handleFile} data-testid="import-ics-file-input" />
          </Button>
          <TextField
            fullWidth
            multiline
            rows={6}
            label={Locale.label("calendars.importIcs.pasteHint")}
            value={icsText}
            onChange={(e) => setIcsText(e.target.value)}
            data-testid="import-ics-text-input"
          />
          {importedCount !== null && (
            <Alert severity="success" data-testid="import-ics-success">
              {Locale.label("calendars.importIcs.imported").replace("{}", importedCount.toString())}
            </Alert>
          )}
          {error && <Alert severity="error" data-testid="import-ics-error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="text" onClick={() => props.onDone(importedCount !== null)} data-testid="import-ics-close-button">{Locale.label("common.close")}</Button>
        <Button variant="contained" onClick={handleImport} disabled={!groupId || !icsText.trim() || importing} data-testid="import-ics-submit">
          {Locale.label("calendars.importIcs.import")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
