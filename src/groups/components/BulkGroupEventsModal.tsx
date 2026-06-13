import { useEffect, useMemo, useState } from "react";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { type EventInterface, type GroupInterface } from "@churchapps/helpers";
import { Alert, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, List, ListItem, ListItemText, MenuItem, Stack, TextField, Typography } from "@mui/material";

interface Props {
  group: GroupInterface;
  onDone: (saved: boolean) => void;
}

const toKey = (d: Date) => {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export function BulkGroupEventsModal(props: Props) {
  const [title, setTitle] = useState(props.group?.name || "");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("18:30");
  const [endTime, setEndTime] = useState("20:00");
  const [firstDate, setFirstDate] = useState("");
  const [lastDate, setLastDate] = useState("");
  const [interval, setInterval] = useState("1");
  const [visibility, setVisibility] = useState("public");
  const [skipHolidays, setSkipHolidays] = useState(true);
  const [holidays, setHolidays] = useState<{ date: string; name: string }[]>([]);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const dates = useMemo(() => {
    if (!firstDate || !lastDate) return [];
    const result: string[] = [];
    const cursor = new Date(firstDate + "T12:00:00");
    const end = new Date(lastDate + "T12:00:00");
    const step = parseInt(interval, 10) * 7;
    while (cursor <= end && result.length < 200) {
      result.push(toKey(cursor));
      cursor.setDate(cursor.getDate() + step);
    }
    return result;
  }, [firstDate, lastDate, interval]);

  useEffect(() => {
    if (!firstDate || !lastDate) return;
    ApiHelper.get(`/events/holidays?start=${firstDate}&end=${lastDate}`, "ContentApi").then(setHolidays).catch(() => setHolidays([]));
  }, [firstDate, lastDate]);

  const holidayNames = useMemo(() => {
    const map: { [date: string]: string } = {};
    holidays.forEach((h) => (map[h.date] = h.name));
    return map;
  }, [holidays]);

  useEffect(() => {
    setExcluded(skipHolidays ? dates.filter((d) => holidayNames[d]) : []);
  }, [dates, skipHolidays, holidayNames]);

  const toggleDate = (date: string) => {
    setExcluded(excluded.includes(date) ? excluded.filter((d) => d !== date) : [...excluded, date]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const event: EventInterface = {
        groupId: props.group.id,
        title,
        description,
        start: new Date(`${dates[0]}T${startTime}`),
        end: new Date(`${dates[0]}T${endTime}`),
        allDay: false,
        visibility,
        recurrenceRule: dates.length > 1 ? `FREQ=WEEKLY;INTERVAL=${interval};UNTIL=${lastDate.replace(/-/g, "")}T235959Z` : undefined
      } as EventInterface;
      const saved = await ApiHelper.post("/events", [event], "ContentApi");
      if (excluded.length > 0) {
        // Noon keeps the calendar date stable across client/server timezones.
        const exceptions = excluded.map((d) => ({ eventId: saved[0].id, exceptionDate: new Date(`${d}T12:00:00`) }));
        await ApiHelper.post("/eventExceptions", exceptions, "ContentApi");
      }
      props.onDone(true);
    } catch {
      setSaving(false);
    }
  };

  const includedCount = dates.length - excluded.length;
  const valid = title.trim() && dates.length > 0 && endTime > startTime && includedCount > 0;

  return (
    <Dialog open={true} onClose={() => props.onDone(false)} fullWidth scroll="body">
      <DialogTitle>{Locale.label("groups.groupCalendar.bulkAddTitle")}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField fullWidth label={Locale.label("calendars.newEvent.eventTitle")} value={title} onChange={(e) => setTitle(e.target.value)} data-testid="bulk-events-title-input" />
          <TextField fullWidth label={Locale.label("calendars.newEvent.description")} value={description} onChange={(e) => setDescription(e.target.value)} multiline rows={2} data-testid="bulk-events-description-input" />
          <Stack direction="row" spacing={2}>
            <TextField fullWidth type="date" label={Locale.label("groups.groupCalendar.firstMeeting")} value={firstDate} onChange={(e) => setFirstDate(e.target.value)} InputLabelProps={{ shrink: true }} data-testid="bulk-events-first-date" />
            <TextField fullWidth type="date" label={Locale.label("groups.groupCalendar.lastMeeting")} value={lastDate} onChange={(e) => setLastDate(e.target.value)} InputLabelProps={{ shrink: true }} data-testid="bulk-events-last-date" />
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField fullWidth type="time" label={Locale.label("calendars.newEvent.start")} value={startTime} onChange={(e) => setStartTime(e.target.value)} InputLabelProps={{ shrink: true }} data-testid="bulk-events-start-time" />
            <TextField fullWidth type="time" label={Locale.label("calendars.newEvent.end")} value={endTime} onChange={(e) => setEndTime(e.target.value)} InputLabelProps={{ shrink: true }} data-testid="bulk-events-end-time" />
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField fullWidth select label={Locale.label("calendars.newEvent.repeats")} value={interval} onChange={(e) => setInterval(e.target.value)} data-testid="bulk-events-interval-select">
              <MenuItem value="1">{Locale.label("calendars.newEvent.weekly")}</MenuItem>
              <MenuItem value="2">{Locale.label("groups.groupCalendar.everyTwoWeeks")}</MenuItem>
            </TextField>
            <TextField fullWidth select label={Locale.label("calendars.newEvent.visibility")} value={visibility} onChange={(e) => setVisibility(e.target.value)} data-testid="bulk-events-visibility-select">
              <MenuItem value="public">{Locale.label("calendars.newEvent.public")}</MenuItem>
              <MenuItem value="private">{Locale.label("calendars.newEvent.private")}</MenuItem>
            </TextField>
          </Stack>
          <FormControlLabel
            control={<Checkbox checked={skipHolidays} onChange={(e) => setSkipHolidays(e.target.checked)} data-testid="bulk-events-skip-holidays" />}
            label={Locale.label("groups.groupCalendar.skipHolidays")}
          />
          {dates.length > 0 && (
            <>
              <Typography variant="subtitle2">
                {Locale.label("groups.groupCalendar.datesPreview").replace("{count}", includedCount.toString())}
              </Typography>
              <List dense sx={{ maxHeight: 240, overflowY: "auto", border: "1px solid", borderColor: "divider", borderRadius: 1 }} data-testid="bulk-events-date-list">
                {dates.map((d) => (
                  <ListItem key={d} disablePadding secondaryAction={holidayNames[d] ? <Chip size="small" color="warning" variant="outlined" label={holidayNames[d]} /> : undefined}>
                    <Checkbox checked={!excluded.includes(d)} onChange={() => toggleDate(d)} size="small" />
                    <ListItemText primary={new Date(d + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" })} />
                  </ListItem>
                ))}
              </List>
            </>
          )}
          {dates.length === 0 && firstDate && lastDate && <Alert severity="warning">{Locale.label("groups.groupCalendar.noDates")}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="text" onClick={() => props.onDone(false)} data-testid="bulk-events-cancel-button">{Locale.label("common.cancel")}</Button>
        <Button variant="contained" onClick={handleSave} disabled={!valid || saving} data-testid="bulk-events-save-button">{Locale.label("common.save")}</Button>
      </DialogActions>
    </Dialog>
  );
}
