import { useState, useEffect, useRef } from "react";
import { ApiHelper, EventHelper, Loading, Locale } from "@churchapps/apphelper";
import { RRuleEditor } from "@churchapps/apphelper/website";
import { type EventInterface, type GroupInterface } from "@churchapps/helpers";
import { Alert, Box, Button, Checkbox, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, ListItemText, MenuItem, Stack, Switch, TextField, Typography } from "@mui/material";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import { GalleryModal } from "../../components/gallery";
import { type ConflictInterface, type EventTemplateInterface, type ResourceInterface, type RoomInterface } from "../interfaces";
import { EventReminderEdit, type EventReminderEditRef } from "./EventReminderEdit";
import { useConfirmDelete } from "../../hooks";
import { EditRecurringModal, type RecurringEditType } from "./EditRecurringModal";

interface Props {
  churchId: string;
  eventId?: string;
  curatedCalendarId?: string;
  initialRoomId?: string;
  initialResourceId?: string;
  // The clicked date of a recurring event; enables the just-this-date / following-dates choice.
  occurrenceStart?: Date;
  onDone: (saved: boolean) => void;
}

const toInputValue = (d: Date) => {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// UNTIL is inclusive, so end the series at the close of the day before the clicked occurrence.
// EventHelper.getFullRRule feeds dtstart as local wall-clock labelled UTC, so UNTIL must use the same frame.
const endBefore = (occurrence: Date) => new Date(Date.UTC(occurrence.getFullYear(), occurrence.getMonth(), occurrence.getDate(), 0, 0, -1));

export function EventModal(props: Props) {
  const [groups, setGroups] = useState<GroupInterface[]>([]);
  const [templates, setTemplates] = useState<EventTemplateInterface[]>([]);
  const [rooms, setRooms] = useState<RoomInterface[]>([]);
  const [resources, setResources] = useState<ResourceInterface[]>([]);
  const [groupId, setGroupId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [showGallery, setShowGallery] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [rRule, setRRule] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [tags, setTags] = useState("");
  const [notesViewRole, setNotesViewRole] = useState("staff");
  const [notesPostRole, setNotesPostRole] = useState("staff");
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
  const [hasRegistration, setHasRegistration] = useState(false);
  const [seriesStart, setSeriesStart] = useState<Date | null>(null);
  const [recurrenceModalType, setRecurrenceModalType] = useState<"" | "edit" | "delete">("");
  const { confirm, ConfirmDialogElement } = useConfirmDelete();
  const reminderRef = useRef<EventReminderEditRef>(null);
  const savedRef = useRef<{ eventId?: string; bookings: boolean; curated: boolean }>({ bookings: false, curated: false });

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
        // ponytail: cast until @churchapps/helpers publishes photoUrl on EventInterface
        if ((data as any).photoUrl) setPhotoUrl((data as any).photoUrl);
        if (data.groupId) setGroupId(data.groupId.toString());
        if (data.start) {
          setStart(toInputValue(new Date(data.start)));
          setSeriesStart(new Date(data.start));
        }
        if (data.end) setEnd(toInputValue(new Date(data.end)));
        if (data.recurrenceRule) setRRule(data.recurrenceRule);
        if (data.visibility) setVisibility(data.visibility);
        if (data.tags) setTags(data.tags);
        setNotesViewRole((data as any).notesViewRole || "staff");
        setNotesPostRole((data as any).notesPostRole || "staff");
        setHasRegistration(!!data.registrationEnabled);
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
      }).finally(() => setLoading(false));
    }
  }, [props.eventId]);

  useEffect(() => {
    ApiHelper.get("/groups/tag/standard", "MembershipApi").then(setGroups);
    ApiHelper.get("/eventTemplates", "ContentApi").then(setTemplates);
    ApiHelper.get("/rooms", "ContentApi").then(setRooms);
    ApiHelper.get("/resources", "ContentApi").then(setResources);
  }, []);

  // Ensure the event's group appears in the list even when it's not a standard group
  useEffect(() => {
    if (!groupId || groups.some(g => g.id === groupId)) return;
    ApiHelper.get("/groups/" + groupId, "MembershipApi").then((g: GroupInterface) => {
      if (g.id) setGroups(prev => prev.some(p => p.id === g.id) ? prev : [...prev, g]);
    });
  }, [groups, groupId]);

  const handleToggleRecurring = (checked: boolean) => setRRule(checked ? "FREQ=DAILY;INTERVAL=1" : "");

  useEffect(() => {
    if (!start || !end || (roomIds.length === 0 && resourceIds.length === 0)) {
      setConflicts([]);
      return;
    }
    const timeout = setTimeout(() => {
      ApiHelper.post("/events/conflicts", {
        eventId: props.eventId,
        start: new Date(start),
        end: new Date(end),
        recurrenceRule: rRule || undefined,
        setupMinutes: toInt(setupMinutes),
        teardownMinutes: toInt(teardownMinutes),
        startTime: customWindow && windowStart ? new Date(windowStart) : undefined,
        endTime: customWindow && windowEnd ? new Date(windowEnd) : undefined,
        roomIds,
        resources: resourceIds.map((id) => ({ resourceId: id, quantity: 1 })),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
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
    if (template.resourcesJson) {
      try { setResourceIds(JSON.parse(template.resourcesJson).map((r: any) => r.resourceId)); } catch { /* malformed template JSON */ }
    }
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

  const buildEvent = (): EventInterface => ({
    id: props.eventId || savedRef.current.eventId,
    groupId: groupId || null,
    title,
    description,
    photoUrl: photoUrl || null,
    start: new Date(start),
    end: new Date(end),
    allDay: false,
    visibility,
    tags: tags.trim() || null,
    notesViewRole: notesViewRole === "staff" ? null : notesViewRole,
    notesPostRole: notesPostRole === "staff" ? null : notesPostRole,
    recurrenceRule: rRule || undefined
  } as EventInterface);

  // splitOff: the event is a new copy of one date or the following dates, so it gets its own
  // bookings and calendar link and the series keeps the rows it already has.
  const saveEvent = async (event: EventInterface, splitOff: boolean) => {
    const savedEvents = await ApiHelper.post("/events", [event], "ContentApi");
    const eventId = savedEvents[0].id;
    savedRef.current.eventId = eventId;
    const window = customWindow && windowStart && windowEnd
      ? { startTime: new Date(windowStart), endTime: new Date(windowEnd), setupMinutes: null, teardownMinutes: null }
      : { setupMinutes: toInt(setupMinutes) || null, teardownMinutes: toInt(teardownMinutes) || null, startTime: null, endTime: null };
    if (splitOff && customWindow && windowStart && windowEnd) {
      const shift = new Date(event.start!).getTime() - new Date(start).getTime();
      window.startTime = new Date(new Date(windowStart).getTime() + shift);
      window.endTime = new Date(new Date(windowEnd).getTime() + shift);
    }
    const priorBooking = (match: (b: any) => boolean) => {
      const existing = existingBookings.find(match) || {};
      if (!splitOff) return existing;
      const { id: _id, ...rest } = existing;
      return rest;
    };

    const newRoomBookings = roomIds.map((roomId) => ({ ...priorBooking(b => b.roomId === roomId), eventId, roomId, ...window }));
    const newResourceBookings = resourceIds.map((resourceId) => {
      const existing = priorBooking(b => b.resourceId === resourceId);
      return { ...existing, eventId, resourceId, quantity: existing.quantity ?? 1, ...window };
    });

    const bookings = [...newRoomBookings, ...newResourceBookings];

    const toDelete = splitOff ? [] : existingBookings.filter(b => !roomIds.includes(b.roomId) && !resourceIds.includes(b.resourceId));

    if (!savedRef.current.bookings) {
      for (const b of toDelete) {
        if (b.id) await ApiHelper.delete("/eventBookings/" + b.id, "ContentApi");
      }
      if (bookings.length > 0) await ApiHelper.post("/eventBookings", bookings, "ContentApi");
      savedRef.current.bookings = true;
    }
    if (props.curatedCalendarId && eventId !== props.eventId && !savedRef.current.curated) {
      await ApiHelper.post("/curatedEvents", [{ curatedCalendarId: props.curatedCalendarId, groupId, eventIds: [eventId] }], "ContentApi");
      savedRef.current.curated = true;
    }
    // A split-off copy gets no reminder write: the editor holds the series definition.
    if (!splitOff) await reminderRef.current?.save(eventId);
  };

  const canSplit = !!(props.eventId && rRule && props.occurrenceStart);

  const handleSave = async () => {
    if (canSplit) {
      setRecurrenceModalType("edit");
      return;
    }
    if (props.eventId && rRule) {
      const ok = await confirm(Locale.label("calendars.calendarEvent.confirmEditSeries"), { confirmLabel: Locale.label("common.save"), destructive: false });
      if (!ok) return;
    }
    setSaving(true);
    try {
      await saveEvent(buildEvent(), false);
      props.onDone(true);
    } catch {
      setSaving(false);
    }
  };

  // Ends the original series the day before the clicked date, or deletes it when the clicked date is its first.
  const shortenSeries = async () => {
    const originalEv: EventInterface = await ApiHelper.get("/events/" + props.eventId, "ContentApi");
    const rrule = EventHelper.getFullRRule(originalEv);
    const until = endBefore(props.occurrenceStart!);
    if (until < rrule.options.dtstart) {
      await ApiHelper.delete("/events/" + props.eventId, "ContentApi");
      return;
    }
    rrule.options.until = until;
    EventHelper.cleanRule(rrule.options);
    originalEv.recurrenceRule = EventHelper.getPartialRRuleString(rrule.options);
    await ApiHelper.post("/events", [originalEv], "ContentApi");
  };

  const handleRecurringSave = async (editType: RecurringEditType) => {
    setRecurrenceModalType("");
    if (editType === "none") return;
    setSaving(true);
    try {
      const form = buildEvent();
      if (editType === "all") {
        await saveEvent(form, false);
      } else {
        // The form shows the series' first date; move the edited times onto the clicked date.
        const occ = props.occurrenceStart!;
        const shift = new Date(start).getTime() - (seriesStart || new Date(start)).getTime();
        const occStart = new Date(occ.getTime() + shift);
        const occEnd = new Date(occStart.getTime() + (new Date(end).getTime() - new Date(start).getTime()));
        if (editType === "this") {
          await ApiHelper.post("/eventExceptions", [{ eventId: props.eventId, exceptionDate: occ }], "ContentApi");
          await saveEvent({ ...form, id: undefined, recurrenceRule: undefined, start: occStart, end: occEnd }, true);
        } else {
          await shortenSeries();
          await saveEvent({ ...form, id: undefined, recurrenceRule: rRule, start: occStart, end: occEnd }, true);
        }
      }
      props.onDone(true);
    } catch {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (canSplit) {
      setRecurrenceModalType("delete");
      return;
    }
    if (await confirm(rRule ? Locale.label("calendars.calendarEvent.confirmDeleteSeries", "This is a recurring event. Deleting it will remove the entire series. Are you sure?") : Locale.label("calendars.calendarEvent.confirmDelete", "Are you sure?"))) {
      try {
        await ApiHelper.delete("/events/" + props.eventId, "ContentApi");
        props.onDone(true);
      } catch { /* surfaced by ErrorHelper */ }
    }
  };

  const handleRecurringDelete = async (editType: RecurringEditType) => {
    setRecurrenceModalType("");
    if (editType === "none") return;
    try {
      if (editType === "this") await ApiHelper.post("/eventExceptions", [{ eventId: props.eventId, exceptionDate: props.occurrenceStart }], "ContentApi");
      else if (editType === "future") await shortenSeries();
      else await ApiHelper.delete("/events/" + props.eventId, "ContentApi");
      props.onDone(true);
    } catch { /* surfaced by ErrorHelper */ }
  };

  // Member requests can arrive without a group, so only new events require one.
  const valid = (props.eventId || groupId) && title.trim() && start && end && new Date(end) > new Date(start);

  return (
    <>
      {ConfirmDialogElement}
      {recurrenceModalType && <EditRecurringModal action={recurrenceModalType} onDone={recurrenceModalType === "delete" ? handleRecurringDelete : handleRecurringSave} />}
      {showGallery && <GalleryModal aspectRatio={16 / 9} onSelect={(url) => { setPhotoUrl(url); setShowGallery(false); }} onCancel={() => setShowGallery(false)} />}
      <Dialog open={true} onClose={() => props.onDone(false)} fullWidth scroll="body">
        <DialogTitle>{props.eventId ? Locale.label("calendars.calendarEvent.editEvent") : Locale.label("calendars.newEvent.title")}</DialogTitle>
        <DialogContent>
          {loading ? <Loading /> : <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField fullWidth select label={Locale.label("calendars.newEvent.group")} value={groupId} onChange={(e) => setGroupId(e.target.value)} SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }} data-testid="new-event-group-select">
              <MenuItem value="">{Locale.label("calendars.newEvent.noGroup")}</MenuItem>
              {groups.map((g) => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
            </TextField>
            {templates.length > 0 && (
              <TextField fullWidth select label={Locale.label("calendars.newEvent.template")} value={templateId} onChange={(e) => applyTemplate(e.target.value)} data-testid="new-event-template-select">
                <MenuItem value="">{Locale.label("calendars.newEvent.noTemplate")}</MenuItem>
                {templates.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
              </TextField>
            )}
            <TextField fullWidth label={Locale.label("calendars.newEvent.eventTitle")} value={title} onChange={(e) => setTitle(e.target.value)} data-testid="new-event-title-input" />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "center" }}>
              <Box
                onClick={() => setShowGallery(true)}
                data-testid="new-event-photo"
                sx={{ width: { xs: "100%", sm: 280 }, flexShrink: 0, aspectRatio: "16 / 9", borderRadius: "var(--b1-radius-panel)", overflow: "hidden", bgcolor: photoUrl ? "transparent" : "var(--b1-canvas)", display: "flex", alignItems: "center", justifyContent: "center", border: 1, borderColor: "divider", cursor: "pointer", "&:hover": { borderColor: "primary.main" } }}>
                {photoUrl
                  ? <img src={photoUrl} alt={Locale.label("calendars.newEvent.photoAlt")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <Stack alignItems="center" spacing={1} sx={{ color: "text.secondary" }}>
                    <PhotoCameraIcon />
                    <Typography variant="body2" color="text.secondary">{Locale.label("calendars.newEvent.clickToAddPhoto")}</Typography>
                  </Stack>}
              </Box>
              <Stack spacing={1} alignItems="flex-start">
                <Typography variant="body2" color="text.secondary">{Locale.label("calendars.newEvent.photo")}</Typography>
                <Button variant="outlined" size="small" onClick={() => setShowGallery(true)} data-testid="new-event-photo-button">
                  {photoUrl ? Locale.label("common.changePhoto") : Locale.label("calendars.newEvent.addPhoto")}
                </Button>
                <Typography variant="caption" color="text.secondary">{Locale.label("calendars.newEvent.photoHint")}</Typography>
              </Stack>
            </Stack>
            <TextField fullWidth label={Locale.label("calendars.newEvent.description")} value={description} onChange={(e) => setDescription(e.target.value)} multiline rows={3} helperText={Locale.label("calendars.newEvent.descriptionHint")} data-testid="new-event-description-input" />
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
            <TextField fullWidth label={Locale.label("calendars.newEvent.tags")} value={tags} onChange={(e) => setTags(e.target.value)} helperText={Locale.label("calendars.newEvent.tagsHelp")} data-testid="new-event-tags-input" />
            {rRule && start && <RRuleEditor start={new Date(start)} rRule={rRule} onChange={setRRule} />}
            <Stack direction="row" spacing={2}>
              <TextField fullWidth select label={Locale.label("calendars.newEvent.notesViewRole")} value={notesViewRole} onChange={(e) => setNotesViewRole(e.target.value)} data-testid="new-event-notes-view-select">
                <MenuItem value="staff">{Locale.label("calendars.newEvent.notesStaff")}</MenuItem>
                <MenuItem value="leaders">{Locale.label("calendars.newEvent.notesLeaders")}</MenuItem>
                <MenuItem value="members">{Locale.label("calendars.newEvent.notesMembers")}</MenuItem>
              </TextField>
              <TextField fullWidth select label={Locale.label("calendars.newEvent.notesPostRole")} value={notesPostRole} onChange={(e) => setNotesPostRole(e.target.value)} data-testid="new-event-notes-post-select">
                <MenuItem value="staff">{Locale.label("calendars.newEvent.notesStaff")}</MenuItem>
                <MenuItem value="leaders">{Locale.label("calendars.newEvent.notesLeaders")}</MenuItem>
                <MenuItem value="members">{Locale.label("calendars.newEvent.notesMembers")}</MenuItem>
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
                  <MenuItem key={r.id} value={r.id} sx={{ whiteSpace: "normal" }}>
                    <Checkbox checked={roomIds.includes(r.id || "")} size="small" />
                    <ListItemText
                      primary={r.name}
                      secondary={[r.capacity ? Locale.label("calendars.newEvent.seats").replace("{}", r.capacity.toString()) : undefined, r.description].filter(Boolean).join(" · ") || undefined}
                    />
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
                  <MenuItem key={r.id} value={r.id} sx={{ whiteSpace: "normal" }}>
                    <Checkbox checked={resourceIds.includes(r.id || "")} size="small" />
                    <ListItemText primary={r.name} secondary={r.description || undefined} />
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
            <EventReminderEdit ref={reminderRef} eventId={props.eventId} hasRegistration={hasRegistration} />
          </Stack>}
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => props.onDone(false)} data-testid="new-event-cancel-button">{Locale.label("common.cancel")}</Button>
          {props.eventId && (
            <Button variant="contained" color="error" onClick={handleDelete} data-testid="event-delete-button">
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
