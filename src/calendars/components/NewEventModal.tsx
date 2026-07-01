import { useState, useEffect, useRef } from "react";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { type EventInterface, type GroupInterface } from "@churchapps/helpers";
import { Alert, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, ListItemText, MenuItem, Stack, Switch, TextField } from "@mui/material";
import { type ConflictInterface, type EventTemplateInterface, type ResourceInterface, type RoomInterface } from "../interfaces";
import { EventReminderEdit, type EventReminderEditRef } from "./EventReminderEdit";

interface Props {
  churchId: string;
  curatedCalendarId?: string;
  initialRoomId?: string;
  initialResourceId?: string;
  onDone: (saved: boolean) => void;
}

const toInputValue = (d: Date) => {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const RECURRENCE_DAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

export function NewEventModal(props: Props) {
  const [groups, setGroups] = useState<GroupInterface[]>([]);
  const [templates, setTemplates] = useState<EventTemplateInterface[]>([]);
  const [rooms, setRooms] = useState<RoomInterface[]>([]);
  const [resources, setResources] = useState<ResourceInterface[]>([]);
  const [groupId, setGroupId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [recurrence, setRecurrence] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [roomIds, setRoomIds] = useState<string[]>(props.initialRoomId ? [props.initialRoomId] : []);
  const [resourceIds, setResourceIds] = useState<string[]>(props.initialResourceId ? [props.initialResourceId] : []);
  const [conflicts, setConflicts] = useState<ConflictInterface[]>([]);
  const [setupMinutes, setSetupMinutes] = useState("");
  const [teardownMinutes, setTeardownMinutes] = useState("");
  const [customWindow, setCustomWindow] = useState(false);
  const [windowStart, setWindowStart] = useState("");
  const [windowEnd, setWindowEnd] = useState("");
  const [saving, setSaving] = useState(false);
  const reminderRef = useRef<EventReminderEditRef>(null);

  const toInt = (v: string) => (v.trim() ? parseInt(v, 10) || 0 : 0);

  const hasBookings = roomIds.length > 0 || resourceIds.length > 0;

  const toggleCustomWindow = (on: boolean) => {
    setCustomWindow(on);
    if (on) {
      if (!windowStart) setWindowStart(start);
      if (!windowEnd) setWindowEnd(end);
    }
  };

  useEffect(() => {
    ApiHelper.get("/groups/tag/standard", "MembershipApi").then(setGroups);
    ApiHelper.get("/eventTemplates", "ContentApi").then(setTemplates);
    ApiHelper.get("/rooms", "ContentApi").then(setRooms);
    ApiHelper.get("/resources", "ContentApi").then(setResources);
  }, []);

  const getRecurrenceRule = () => {
    if (!recurrence || !start) return undefined;
    if (recurrence === "daily") return "FREQ=DAILY";
    if (recurrence === "weekly") return "FREQ=WEEKLY;BYDAY=" + RECURRENCE_DAYS[new Date(start).getDay()];
    if (recurrence === "monthly") return "FREQ=MONTHLY";
    return undefined;
  };

  useEffect(() => {
    if (!start || !end || (roomIds.length === 0 && resourceIds.length === 0)) {
      setConflicts([]);
      return;
    }
    const timeout = setTimeout(() => {
      ApiHelper.post("/events/conflicts", {
        start: new Date(start),
        end: new Date(end),
        recurrenceRule: getRecurrenceRule(),
        setupMinutes: toInt(setupMinutes),
        teardownMinutes: toInt(teardownMinutes),
        startTime: customWindow && windowStart ? new Date(windowStart) : undefined,
        endTime: customWindow && windowEnd ? new Date(windowEnd) : undefined,
        roomIds,
        resources: resourceIds.map((id) => ({ resourceId: id, quantity: 1 }))
      }, "ContentApi").then(setConflicts).catch(() => setConflicts([]));
    }, 400);
    return () => clearTimeout(timeout);
  }, [
    start, end, recurrence, roomIds, resourceIds, setupMinutes, teardownMinutes, customWindow, windowStart, windowEnd
  ]);

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const template = templates.find((t) => t.id === id);
    if (!template) return;
    if (template.title) setTitle(template.title);
    if (template.description) setDescription(template.description);
    if (template.visibility) setVisibility(template.visibility);
    if (template.roomIds) setRoomIds(template.roomIds.split(",").filter((r) => r));
    if (template.resourcesJson) setResourceIds(JSON.parse(template.resourcesJson).map((r: any) => r.resourceId));
    if (template.durationMinutes && start) {
      const startDate = new Date(start);
      setEnd(toInputValue(new Date(startDate.getTime() + template.durationMinutes * 60 * 1000)));
    }
  };

  const handleStartChange = (value: string) => {
    setStart(value);
    const template = templates.find((t) => t.id === templateId);
    if (value && template?.durationMinutes) setEnd(toInputValue(new Date(new Date(value).getTime() + template.durationMinutes * 60 * 1000)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const event: EventInterface = {
        groupId,
        title,
        description,
        start: new Date(start),
        end: new Date(end),
        allDay: false,
        visibility,
        recurrenceRule: getRecurrenceRule()
      } as EventInterface;
      const savedEvents = await ApiHelper.post("/events", [event], "ContentApi");
      const eventId = savedEvents[0].id;
      const window = customWindow && windowStart && windowEnd
        ? { startTime: new Date(windowStart), endTime: new Date(windowEnd) }
        : { setupMinutes: toInt(setupMinutes) || undefined, teardownMinutes: toInt(teardownMinutes) || undefined };
      const bookings = [
        ...roomIds.map((roomId) => ({ eventId, roomId, ...window })),
        ...resourceIds.map((resourceId) => ({ eventId, resourceId, quantity: 1, ...window }))
      ];
      if (bookings.length > 0) await ApiHelper.post("/eventBookings", bookings, "ContentApi");
      if (props.curatedCalendarId) await ApiHelper.post("/curatedEvents", [{ curatedCalendarId: props.curatedCalendarId, groupId, eventIds: [eventId] }], "ContentApi");
      await reminderRef.current?.save(eventId);
      props.onDone(true);
    } catch {
      setSaving(false);
    }
  };

  const valid = groupId && title.trim() && start && end && new Date(end) > new Date(start);

  return (
    <Dialog open={true} onClose={() => props.onDone(false)} fullWidth scroll="body">
      <DialogTitle>{Locale.label("calendars.newEvent.title")}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField fullWidth select label={Locale.label("calendars.newEvent.group")} value={groupId} onChange={(e) => setGroupId(e.target.value)} data-testid="new-event-group-select">
            {groups.map((g) => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
          </TextField>
          {templates.length > 0 && (
            <TextField fullWidth select label={Locale.label("calendars.newEvent.template")} value={templateId} onChange={(e) => applyTemplate(e.target.value)} data-testid="new-event-template-select">
              <MenuItem value="">{Locale.label("calendars.newEvent.noTemplate")}</MenuItem>
              {templates.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
            </TextField>
          )}
          <TextField fullWidth label={Locale.label("calendars.newEvent.eventTitle")} value={title} onChange={(e) => setTitle(e.target.value)} data-testid="new-event-title-input" />
          <TextField fullWidth label={Locale.label("calendars.newEvent.description")} value={description} onChange={(e) => setDescription(e.target.value)} multiline rows={2} data-testid="new-event-description-input" />
          <Stack direction="row" spacing={2}>
            <TextField fullWidth type="datetime-local" label={Locale.label("calendars.newEvent.start")} value={start} onChange={(e) => handleStartChange(e.target.value)} InputLabelProps={{ shrink: true }} data-testid="new-event-start-input" />
            <TextField fullWidth type="datetime-local" label={Locale.label("calendars.newEvent.end")} value={end} onChange={(e) => setEnd(e.target.value)} InputLabelProps={{ shrink: true }} data-testid="new-event-end-input" />
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField fullWidth select label={Locale.label("calendars.newEvent.repeats")} value={recurrence} onChange={(e) => setRecurrence(e.target.value)} data-testid="new-event-recurrence-select">
              <MenuItem value="">{Locale.label("calendars.newEvent.doesNotRepeat")}</MenuItem>
              <MenuItem value="daily">{Locale.label("calendars.newEvent.daily")}</MenuItem>
              <MenuItem value="weekly">{Locale.label("calendars.newEvent.weekly")}</MenuItem>
              <MenuItem value="monthly">{Locale.label("calendars.newEvent.monthly")}</MenuItem>
            </TextField>
            <TextField fullWidth select label={Locale.label("calendars.newEvent.visibility")} value={visibility} onChange={(e) => setVisibility(e.target.value)} data-testid="new-event-visibility-select">
              <MenuItem value="public">{Locale.label("calendars.newEvent.public")}</MenuItem>
              <MenuItem value="private">{Locale.label("calendars.newEvent.private")}</MenuItem>
            </TextField>
          </Stack>
          {rooms.length > 0 && (
            <TextField
              fullWidth
              select
              label={Locale.label("calendars.newEvent.rooms")}
              value={roomIds}
              onChange={(e) => setRoomIds(e.target.value as unknown as string[])}
              SelectProps={{ multiple: true, renderValue: (selected: any) => rooms.filter((r) => selected.includes(r.id)).map((r) => r.name).join(", ") }}
              data-testid="new-event-rooms-select"
            >
              {rooms.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  <Checkbox checked={roomIds.includes(r.id)} size="small" />
                  <ListItemText primary={r.name} secondary={r.capacity ? Locale.label("calendars.newEvent.seats").replace("{}", r.capacity.toString()) : undefined} />
                </MenuItem>
              ))}
            </TextField>
          )}
          {resources.length > 0 && (
            <TextField
              fullWidth
              select
              label={Locale.label("calendars.newEvent.resources")}
              value={resourceIds}
              onChange={(e) => setResourceIds(e.target.value as unknown as string[])}
              SelectProps={{ multiple: true, renderValue: (selected: any) => resources.filter((r) => selected.includes(r.id)).map((r) => r.name).join(", ") }}
              data-testid="new-event-resources-select"
            >
              {resources.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  <Checkbox checked={resourceIds.includes(r.id)} size="small" />
                  <ListItemText primary={r.name} />
                </MenuItem>
              ))}
            </TextField>
          )}
          {hasBookings && (
            <>
              {!customWindow && (
                <Stack direction="row" spacing={2}>
                  <TextField fullWidth type="number" label={Locale.label("calendars.newEvent.setupMinutes")} value={setupMinutes} onChange={(e) => setSetupMinutes(e.target.value)} inputProps={{ min: 0 }} data-testid="new-event-setup-minutes" />
                  <TextField fullWidth type="number" label={Locale.label("calendars.newEvent.teardownMinutes")} value={teardownMinutes} onChange={(e) => setTeardownMinutes(e.target.value)} inputProps={{ min: 0 }} data-testid="new-event-teardown-minutes" />
                </Stack>
              )}
              <FormControlLabel
                control={<Switch checked={customWindow} onChange={(e) => toggleCustomWindow(e.target.checked)} data-testid="new-event-custom-window-toggle" />}
                label={Locale.label("calendars.newEvent.customWindow")}
              />
              {customWindow && (
                <Stack direction="row" spacing={2}>
                  <TextField fullWidth type="datetime-local" label={Locale.label("calendars.newEvent.reserveFrom")} value={windowStart} onChange={(e) => setWindowStart(e.target.value)} InputLabelProps={{ shrink: true }} data-testid="new-event-window-start" />
                  <TextField fullWidth type="datetime-local" label={Locale.label("calendars.newEvent.reserveUntil")} value={windowEnd} onChange={(e) => setWindowEnd(e.target.value)} InputLabelProps={{ shrink: true }} data-testid="new-event-window-end" />
                </Stack>
              )}
            </>
          )}
          {conflicts.length > 0 && (
            <Alert severity="warning" data-testid="new-event-conflict-warnings">
              <Stack spacing={0.5}>
                {conflicts.map((c, i) => <span key={i}>{c.message}</span>)}
              </Stack>
            </Alert>
          )}
          <EventReminderEdit ref={reminderRef} hasRegistration={false} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="text" onClick={() => props.onDone(false)} data-testid="new-event-cancel-button">{Locale.label("common.cancel")}</Button>
        <Button variant="contained" onClick={handleSave} disabled={!valid || saving} data-testid="new-event-save-button">{Locale.label("common.save")}</Button>
      </DialogActions>
    </Dialog>
  );
}
