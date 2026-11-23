import { useState, useEffect, useCallback, useMemo } from "react";
import "react-big-calendar/lib/css/react-big-calendar.css";
import dayjs from "dayjs";
import { Calendar, dayjsLocalizer } from "react-big-calendar";
import { ApiHelper, DateHelper, UserHelper, EventHelper, Loading, Locale } from "@churchapps/apphelper";
import { Permissions, type PersonInterface } from "@churchapps/helpers";
import { Box, MenuItem, Stack, TextField } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { useRequirePermission, useFirstDayOfWeek, applyWeekStart } from "../hooks";
import { EventModal } from "./components/EventModal";
import { HeaderPrimaryButton } from "../components/ui/headerButtons";
import { ExportButton, Surface } from "../components/ui";
import { CalendarChrome } from "./components/CalendarChrome";
import { type CalendarBlockoutInterface, type EventBookingInterface, type ResourceInterface, type RoomInterface } from "./interfaces";

type CalEvent = { title: string; start: Date; end: Date; kind: "approved" | "pending" | "blockout"; eventId?: string; eventTitle?: string; targets?: string[]; };
// One booking on one date. start/end is the block drawn on the calendar (setup and teardown included); eventStart/eventEnd is the event itself.
type Occurrence = { booking: EventBookingInterface; start: Date; end: Date; eventStart: Date; eventEnd: Date; };
type DateRange = { start: Date; end: Date };

// react-big-calendar reports a list of days (week, day) or a start/end pair (month, agenda).
const toDateRange = (range: Date[] | { start: Date; end: Date }): DateRange => {
  const days = Array.isArray(range) ? range : [range.start, range.end];
  return { start: dayjs(days[0]).startOf("day").toDate(), end: dayjs(days[days.length - 1]).endOf("day").toDate() };
};

export const AvailabilityPage = () => {
  const [bookings, setBookings] = useState<EventBookingInterface[]>([]);
  const [rooms, setRooms] = useState<RoomInterface[]>([]);
  const [resources, setResources] = useState<ResourceInterface[]>([]);
  const [blockouts, setBlockouts] = useState<CalendarBlockoutInterface[]>([]);
  const [filter, setFilter] = useState("");
  const [showBook, setShowBook] = useState(false);
  const [bookEventId, setBookEventId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<DateRange | null>(null);
  const [requesterNames, setRequesterNames] = useState<Record<string, string>>({});
  const denied = useRequirePermission(Permissions.contentApi.content.edit);

  const firstDayOfWeek = useFirstDayOfWeek();

  const localizer = useMemo(() => {
    applyWeekStart(firstDayOfWeek);
    return dayjsLocalizer(dayjs);
  }, [firstDayOfWeek]);

  // The calendar opens on this month and only reports its range once the user changes view or date.
  // firstDayOfWeek: the localizer memo above has already applied it to dayjs.
  const visibleRange = useMemo<DateRange>(() => range || {
    start: dayjs().startOf("month").startOf("week").toDate(),
    end: dayjs().endOf("month").endOf("week").toDate()
  }, [range, firstDayOfWeek]);

  const loadBookings = useCallback(() => {
    const start = new Date();
    start.setMonth(start.getMonth() - 1);
    const end = new Date();
    end.setFullYear(end.getFullYear() + 1);
    const params = new URLSearchParams({ startTime: start.toISOString(), endTime: end.toISOString() });
    if (filter.startsWith("room:")) params.set("roomId", filter.slice(5));
    if (filter.startsWith("resource:")) params.set("resourceId", filter.slice(9));
    ApiHelper.get("/eventBookings/calendar?" + params.toString(), "ContentApi")
      .then((b) => setBookings(b || []))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    Promise.all([
      ApiHelper.get("/rooms", "ContentApi"),
      ApiHelper.get("/resources", "ContentApi"),
      ApiHelper.get("/calendarBlockouts", "ContentApi")
    ]).then(([r, res, blk]) => {
      setRooms(r || []);
      setResources(res || []);
      setBlockouts(blk || []);
    });
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  useEffect(() => {
    const ids = [...new Set(bookings.map((b) => b.requestedBy).filter((id): id is string => !!id))].filter((id) => !(id in requesterNames));
    if (ids.length === 0) return;
    ApiHelper.get("/people/ids?ids=" + ids.join(","), "MembershipApi")
      .then((found: PersonInterface[]) => {
        const names: Record<string, string> = {};
        ids.forEach((id) => { names[id] = ""; });
        (found || []).forEach((p) => { if (p.id) names[p.id] = p.name?.display || ""; });
        setRequesterNames((prev) => ({ ...prev, ...names }));
      })
      .catch(() => { /* the export leaves Requested by blank */ });
  }, [bookings, requesterNames]);

  const occurrences = useMemo<Occurrence[]>(() => {
    const result: Occurrence[] = [];
    const rangeStart = new Date();
    rangeStart.setFullYear(rangeStart.getFullYear() - 1);
    const rangeEnd = new Date();
    rangeEnd.setFullYear(rangeEnd.getFullYear() + 1);

    bookings.forEach((b) => {
      if (b.startTime && b.endTime) {
        const start = new Date(b.startTime);
        const end = new Date(b.endTime);
        result.push({ booking: b, start, end, eventStart: start, eventEnd: end });
        return;
      }
      const setupMs = (b.setupMinutes || 0) * 60000;
      const teardownMs = (b.teardownMinutes || 0) * 60000;
      const pushPadded = (s: Date, e: Date) => {
        result.push({ booking: b, start: new Date(s.getTime() - setupMs), end: new Date(e.getTime() + teardownMs), eventStart: s, eventEnd: e });
      };
      const start = new Date(b.eventStart ?? NaN); // NaN: same Invalid Date that new Date(undefined) gives
      const end = new Date(b.eventEnd ?? NaN);
      if (b.eventRecurrenceRule) {
        const dates: Date[] = EventHelper.getRange({ start, end, recurrenceRule: b.eventRecurrenceRule }, rangeStart, rangeEnd);
        const diff = end.getTime() - start.getTime();
        dates.forEach((d) => pushPadded(d, new Date(d.getTime() + diff)));
      } else {
        pushPadded(start, end);
      }
    });
    return result;
  }, [bookings]);

  const events = useMemo<CalEvent[]>(() => {
    const result: CalEvent[] = [];
    const resultItems: (CalEvent & { eventTitle?: string; target?: string })[] = occurrences.map(({ booking: b, start, end }) => ({
      title: "",
      eventTitle: b.eventTitle || "",
      target: b.roomName || b.resourceName || "",
      start,
      end,
      kind: b.status === "approved" ? "approved" : "pending",
      eventId: b.eventId
    }));

    const combined: CalEvent[] = [];
    resultItems.forEach((r) => {
      const existing = combined.find((c) => c.eventId === r.eventId && c.start.getTime() === r.start.getTime() && c.end.getTime() === r.end.getTime());
      if (existing) {
        if (r.kind === "pending") existing.kind = "pending";
        if (r.target && !existing.targets?.includes(r.target)) {
          existing.targets?.push(r.target);
          existing.title = `${r.eventTitle}${existing.targets?.length ? " — " + existing.targets.join(" — ") : ""}`;
        }
      } else {
        combined.push({
          title: `${r.eventTitle}${r.target ? " — " + r.target : ""}`,
          start: r.start,
          end: r.end,
          kind: r.kind,
          eventId: r.eventId,
          eventTitle: r.eventTitle,
          targets: r.target ? [r.target] : []
        });
      }
    });
    result.push(...combined);

    const selRoom = filter.startsWith("room:") ? filter.slice(5) : "";
    const selResource = filter.startsWith("resource:") ? filter.slice(9) : "";
    blockouts.forEach((bo) => {
      if (selRoom && bo.roomId && bo.roomId !== selRoom) return;
      if (selResource && bo.resourceId && bo.resourceId !== selResource) return;
      const name = bo.roomId ? rooms.find((r) => r.id === bo.roomId)?.name : bo.resourceId ? resources.find((r) => r.id === bo.resourceId)?.name : Locale.label("calendars.rooms.allRoomsResources");
      result.push({
        title: `${Locale.label("calendars.availability.blocked")}: ${bo.reason || name || ""}`,
        start: new Date(bo.startTime ?? NaN),
        end: new Date(bo.endTime ?? NaN),
        kind: "blockout"
      });
    });
    return result;
  }, [occurrences, blockouts, rooms, resources, filter]);

  // One row per booking on each date in view; the room/resource filter is already applied by the API.
  const exportRows = useMemo(() => occurrences
    .filter((o) => o.start < visibleRange.end && o.end > visibleRange.start)
    .sort((a, b) => a.eventStart.getTime() - b.eventStart.getTime())
    .map(({ booking: b, eventStart, eventEnd }) => {
      const hasAbsoluteTimes = !!(b.startTime && b.endTime);
      return {
        event: b.eventTitle || "",
        roomResource: b.roomName || b.resourceName || "",
        quantity: b.resourceId ? b.quantity || 1 : "",
        start: DateHelper.prettyDateTime(eventStart),
        end: DateHelper.prettyDateTime(eventEnd),
        setupMinutes: hasAbsoluteTimes ? "" : b.setupMinutes || 0,
        teardownMinutes: hasAbsoluteTimes ? "" : b.teardownMinutes || 0,
        status: b.status === "approved" ? Locale.label("calendars.approvals.approved") : b.status === "pending" ? Locale.label("calendars.approvals.pending") : b.status || "",
        requestedBy: (b.requestedBy && requesterNames[b.requestedBy]) || ""
      };
    }), [occurrences, visibleRange, requesterNames]);

  const exportHeaders = [
    { label: Locale.label("calendars.approvals.event"), key: "event" },
    { label: Locale.label("calendars.approvals.roomResource"), key: "roomResource" },
    { label: Locale.label("calendars.rooms.quantity"), key: "quantity" },
    { label: Locale.label("calendars.availability.start"), key: "start" },
    { label: Locale.label("calendars.availability.end"), key: "end" },
    { label: Locale.label("calendars.availability.setupMinutes"), key: "setupMinutes" },
    { label: Locale.label("calendars.availability.teardownMinutes"), key: "teardownMinutes" },
    { label: Locale.label("calendars.approvals.status"), key: "status" },
    { label: Locale.label("calendars.approvals.requestedBy"), key: "requestedBy" }
  ];

  const eventStyle = (event: CalEvent) => {
    // Tinted fill with the matching strong text (as on status badges) stays readable in light and dark mode.
    const tone = event.kind === "approved" ? "success" : event.kind === "pending" ? "warning" : "neutral";
    return { style: { backgroundColor: `var(--b1-${tone}-bg)`, color: `var(--b1-${tone})`, borderColor: `var(--b1-${tone})`, fontWeight: 600 } };
  };

  if (denied) return denied;

  const churchId = UserHelper.currentUserChurch?.church?.id || "";
  const bookRoomId = filter.startsWith("room:") ? filter.slice(5) : undefined;
  const bookResourceId = filter.startsWith("resource:") ? filter.slice(9) : undefined;

  return (
    <>
      <CalendarChrome
        selected="availability"
        subtitle={Locale.label("calendars.availability.subtitle")}
        actions={(
          <>
            {exportRows.length > 0 && (
              <Box data-testid="availability-export">
                <ExportButton data={exportRows} filename="availability.csv" customHeaders={exportHeaders} text={Locale.label("calendars.availability.export")} />
              </Box>
            )}
            <HeaderPrimaryButton
              startIcon={<AddIcon />}
              onClick={() => { setBookEventId(undefined); setShowBook(true); }}
              data-testid="availability-book-button"
            >
              {Locale.label("calendars.availability.book")}
            </HeaderPrimaryButton>
          </>
        )}>
        <Surface sx={{
          "& .rbc-btn-group button": { color: (theme) => theme.palette.mode === "dark" ? "text.primary" : "inherit" },
          "& .rbc-btn-group button:hover, & .rbc-btn-group button:focus, & .rbc-btn-group button:active, & .rbc-btn-group button.rbc-active": {
            color: (theme) => theme.palette.mode === "dark" ? `${theme.palette.common.black} !important` : "inherit",
            backgroundColor: (theme) => theme.palette.mode === "dark" ? `${theme.palette.grey[300]} !important` : undefined
          },
          "& .rbc-toolbar-label": { color: (theme) => theme.palette.mode === "dark" ? "text.primary" : "inherit" },
          "& .rbc-off-range-bg": { backgroundColor: (theme) => theme.palette.mode === "dark" ? theme.palette.action.hover : undefined },
          "& .rbc-today": { backgroundColor: (theme) => theme.palette.mode === "dark" ? theme.palette.action.selected : undefined }
        }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <TextField select size="small" label={Locale.label("calendars.availability.filter")} value={filter} onChange={(e) => setFilter(e.target.value)} sx={{ minWidth: 240 }} data-testid="availability-filter" SelectProps={{ displayEmpty: true }}>
              <MenuItem value="">{Locale.label("calendars.availability.allRoomsResources")}</MenuItem>
              {rooms.map((r) => <MenuItem key={r.id} value={"room:" + r.id}>{r.name}</MenuItem>)}
              {resources.map((r) => <MenuItem key={r.id} value={"resource:" + r.id}>{r.name}</MenuItem>)}
            </TextField>
          </Stack>
          {loading ? <Loading /> : (
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 600 }}
              eventPropGetter={eventStyle}
              onRangeChange={(r) => setRange(toDateRange(r))}
              onSelectEvent={(e) => {
                if (e.eventId) {
                  setBookEventId(e.eventId);
                  setShowBook(true);
                }
              }}
              data-testid="availability-calendar"
            />
          )}
        </Surface>
      </CalendarChrome>
      {showBook && (
        <EventModal
          churchId={churchId}
          eventId={bookEventId}
          initialRoomId={bookRoomId}
          initialResourceId={bookResourceId}
          onDone={(saved) => { setShowBook(false); setBookEventId(undefined); if (saved) loadBookings(); }}
        />
      )}
    </>
  );
};

export default AvailabilityPage;
