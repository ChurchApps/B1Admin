import { useState, useEffect, useRef } from "react";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { RRuleEditor } from "@churchapps/apphelper/website";
import { type EventInterface, type GroupInterface } from "@churchapps/helpers";
import { Alert, Button, Checkbox, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, ListItemText, MenuItem, Stack, Switch, TextField } from "@mui/material";
import { type ConflictInterface, type EventTemplateInterface, type ResourceInterface, type RoomInterface } from "../interfaces";
import { EventReminderEdit, type EventReminderEditRef } from "./EventReminderEdit";
import { useConfirmDelete } from "../../hooks";

interface Props {
  churchId: string;
  eventId?: string;
  curatedCalendarId?: string;
  initialRoomId?: string;
  initialResourceId?: string;
  onDone: (saved: boolean) => void;
}

const toInputValue = (d: Date) => {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function EventModal(props: Props) {
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
  const [rRule, setRRule] = useState("");
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
  const [loading, setLoading] = useState(!!props.eventId);
  const [existingBookings, setExistingBookings] = useState<any[]>([]);
  const { confirm, ConfirmDialogElement } = useConfirmDelete();
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
    if (props.eventId) {
      ApiHelper.get("/events/" + props.eventId, "ContentApi").then((data: EventInterface) => {
        if (data.title) setTitle(data.title);
        if (data.description) setDescription(data.description);
        if (data.groupId) setGroupId(data.groupId.toString());
        if (data.start) setStart(toInputValue(new Date(data.start)));
        if (data.end) setEnd(toInputValue(new Date(data.end)));
        if (data.recurrenceRule) setRRule(data.recurrenceRule);
        if (data.visibility) setVisibility(data.visibility);
      });
      ApiHelper.get("/eventBookings/event/" + props.eventId, "ContentApi").then((data: any[]) => {
        setExistingBookings(data);
        setRoomIds(data.filter(b => b.roomId).map(b => b.roomId.toString()));
        setResourceIds(data.filter(b => b.resourceId).map(b => b.resourceId.toString()));
        const first = data[0];
        if (first) {
          if (first.setupMinutes || first.teardownMinutes) {
            setSetupMinutes(first.setupMinutes?.toString() || "");
            setTeardownMinutes(first.teardownMinutes?.toString() || "");
            setCustomWindow(false);
          } else if (first.startTime && first.endTime) {
            setCustomWindow(true);
            setWindowStart(toInputValue(new Date(first.startTime)));
            setWindowEnd(toInputValue(new Date(first.endTime)));
          }
        }
        setLoading(false);
      });
    }
  }, [props.eventId]);

  useEffect(() => {
    ApiHelper.get("/groups/tag/standard", "MembershipApi").then((data: GroupInterface[]) => {
      setGroups(data);
      if (props.eventId) {
        // Ensure the event's group is fetched if it's not a standard group
        ApiHelper.get("/events/" + props.eventId, "ContentApi").then((ev: EventInterface) => {
          if (ev.groupId && !data.some(g => g.id === ev.groupId?.toString())) {
            ApiHelper.get("/groups/" + ev.groupId, "MembershipApi").then((g: GroupInterface) => {
              if (g.id) setGroups(prev => [...prev, g]);
            });
          }
        });
      }
    });
    ApiHelper.get("/eventTemplates", "ContentApi").then(setTemplates);
    ApiHelper.get("/rooms", "ContentApi").then(setRooms);
    ApiHelper.get("/resources", "ContentApi").then(setResources);
  }, []);

  const handleToggleRecurring = (checked: boolean) => setRRule(checked ? "FREQ=DAILY;INTERVAL=1" : "");

  useEffect(() => {
    if (!start || !end || (roomIds.length === 0 && resourceIds.length === 0)) {
      setConflicts([]);
      return;
    }
    const timeout = setTimeout(() => {
      ApiHelper.post("/events/conflicts", {
        start: new Date(start),
        end: new Date(end),
        recurrenceRule: rRule || undefined,
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
    start, end, rRule, roomIds, resourceIds, setupMinutes, teardownMinutes, customWindow, windowStart, windowEnd
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
        id: props.eventId,
        groupId,
        title,
        description,
        start: new Date(start),
        end: new Date(end),
        allDay: false,
        visibility,
        recurrenceRule: rRule || undefined
      } as EventInterface;
      const savedEvents = await ApiHelper.post("/events", [event], "ContentApi");
      const eventId = savedEvents[0].id;
      const window = customWindow && windowStart && windowEnd
        ? { startTime: new Date(windowStart), endTime: new Date(windowEnd), setupMinutes: null, teardownMinutes: null }
        : { setupMinutes: toInt(setupMinutes) || null, teardownMinutes: toInt(teardownMinutes) || null, startTime: null, endTime: null };

      const newRoomBookings = roomIds.map((roomId) => {
        const existing = existingBookings.find(b => b.roomId === roomId) || {};
        return { ...existing, eventId, roomId, ...window };
      });
      const newResourceBookings = resourceIds.map((resourceId) => {
        const existing = existingBookings.find(b => b.resourceId === resourceId) || {};
        return { ...existing, eventId, resourceId, quantity: 1, ...window };
      });

      const bookings = [...newRoomBookings, ...newResourceBookings];

      const toDelete = existingBookings.filter(b =>
        !roomIds.includes(b.roomId) && !resourceIds.includes(b.resourceId)
      );

      for (const b of toDelete) {
        if (b.id) await ApiHelper.delete("/eventBookings/" + b.id, "ContentApi");
      }

      if (bookings.length > 0) await ApiHelper.post("/eventBookings", bookings, "ContentApi");
      if (props.curatedCalendarId && !props.eventId) await ApiHelper.post("/curatedEvents", [{ curatedCalendarId: props.curatedCalendarId, groupId, eventIds: [eventId] }], "ContentApi");
      await reminderRef.current?.save(eventId);
      props.onDone(true);
    } catch {
      setSaving(false);
    }
  };

  const valid = groupId && title.trim() && start && end && new Date(end) > new Date(start);

  return (
    <>
      {ConfirmDialogElement}
      <Dialog open={true} onClose={() => props.onDone(false)} fullWidth scroll="body">
        <DialogTitle>{props.eventId ? Locale.label("calendars.calendarEvent.editEvent") || "Edit Event" : Locale.label("calendars.newEvent.title")}</DialogTitle>
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
            <Stack direction="row" spacing={2} alignItems="center">
              <FormControlLabel
                control={<Checkbox checked={!!rRule} onChange={(e) => handleToggleRecurring(e.target.checked)} data-testid="new-event-recurring-checkbox" />}
                label={Locale.label("calendars.newEvent.repeats")}
              />
              <TextField fullWidth select label={Locale.label("calendars.newEvent.visibility")} value={visibility} onChange={(e) => setVisibility(e.target.value)} data-testid="new-event-visibility-select">
                <MenuItem value="public">{Locale.label("calendars.newEvent.public")}</MenuItem>
                <MenuItem value="private">{Locale.label("calendars.newEvent.private")}</MenuItem>
              </TextField>
            </Stack>
            {rRule && start && <RRuleEditor start={new Date(start)} rRule={rRule} onChange={setRRule} />}
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
                    <Checkbox checked={roomIds.includes(r.id || "")} size="small" />
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
                    <Checkbox checked={resourceIds.includes(r.id || "")} size="small" />
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
          {props.eventId && (
            <Button variant="contained" color="error" onClick={async () => {
              if (await confirm(Locale.label("calendars.calendarEvent.confirmDelete") || "Are you sure?")) {
                await ApiHelper.delete("/events/" + props.eventId, "ContentApi");
                props.onDone(true);
              }
            }} data-testid="event-delete-button">
              {Locale.label("common.delete")}
            </Button>
          )}
          <Button variant="contained" onClick={handleSave} disabled={!valid || saving} data-testid="new-event-save-button">
            {saving ? <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> : null}
            {Locale.label("common.save")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
