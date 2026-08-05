import { useState, useEffect, useCallback, useMemo } from "react";
import "react-big-calendar/lib/css/react-big-calendar.css";
import dayjs from "dayjs";
import { Calendar, dayjsLocalizer } from "react-big-calendar";
import { ApiHelper, UserHelper, EventHelper, Loading, PageHeader, Locale } from "@churchapps/apphelper";
import { Permissions } from "@churchapps/helpers";
import { Box, MenuItem, Stack, TextField } from "@mui/material";
import { Add as AddIcon, EventAvailable as AvailabilityIcon } from "@mui/icons-material";
import { useRequirePermission } from "../hooks";
import { EventModal } from "./components/EventModal";
import { HeaderPrimaryButton } from "../components/ui/headerButtons";
import { type CalendarBlockoutInterface, type EventBookingInterface, type ResourceInterface, type RoomInterface } from "./interfaces";

type CalEvent = { title: string; start: Date; end: Date; kind: "approved" | "pending" | "blockout"; eventId?: string; eventTitle?: string; targets?: string[]; };

export const AvailabilityPage = () => {
  const [bookings, setBookings] = useState<EventBookingInterface[]>([]);
  const [rooms, setRooms] = useState<RoomInterface[]>([]);
  const [resources, setResources] = useState<ResourceInterface[]>([]);
  const [blockouts, setBlockouts] = useState<CalendarBlockoutInterface[]>([]);
  const [filter, setFilter] = useState("");
  const [showBook, setShowBook] = useState(false);
  const [bookEventId, setBookEventId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const denied = useRequirePermission(Permissions.contentApi.content.edit);

  const localizer = dayjsLocalizer(dayjs);

  const loadBookings = useCallback(() => {
    setLoading(true);
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

  const events = useMemo<CalEvent[]>(() => {
    const result: CalEvent[] = [];
    const rangeStart = new Date();
    rangeStart.setFullYear(rangeStart.getFullYear() - 1);
    const rangeEnd = new Date();
    rangeEnd.setFullYear(rangeEnd.getFullYear() + 1);

    const resultItems: (CalEvent & { eventTitle?: string; target?: string })[] = [];
    bookings.forEach((b) => {
      const target = b.roomName || b.resourceName || "";
      const kind = b.status === "approved" ? "approved" : "pending";
      
      const pushItem = (start: Date, end: Date) => {
        resultItems.push({ title: "", eventTitle: b.eventTitle || "", target, start, end, kind, eventId: b.eventId });
      };

      if (b.startTime && b.endTime) {
        pushItem(new Date(b.startTime as any), new Date(b.endTime as any));
        return;
      }
      const setupMs = (b.setupMinutes || 0) * 60000;
      const teardownMs = (b.teardownMinutes || 0) * 60000;
      const pad = (s: Date, e: Date) => ({ start: new Date(s.getTime() - setupMs), end: new Date(e.getTime() + teardownMs) });
      const start = new Date(b.eventStart as any);
      const end = new Date(b.eventEnd as any);
      if (b.eventRecurrenceRule) {
        const dates = EventHelper.getRange({ start, end, recurrenceRule: b.eventRecurrenceRule } as any, rangeStart, rangeEnd);
        const diff = end.getTime() - start.getTime();
        dates.forEach((d: any) => {
          const padded = pad(d, new Date(d.getTime() + diff));
          pushItem(padded.start, padded.end);
        });
      } else {
        const padded = pad(start, end);
        pushItem(padded.start, padded.end);
      }
    });

    const combined: CalEvent[] = [];
    resultItems.forEach((r) => {
      const existing = combined.find((c) => c.eventId === r.eventId && c.start.getTime() === r.start.getTime() && c.end.getTime() === r.end.getTime());
      if (existing) {
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
        start: new Date(bo.startTime as any),
        end: new Date(bo.endTime as any),
        kind: "blockout"
      });
    });
    return result;
  }, [bookings, blockouts, rooms, resources, filter]);

  const eventStyle = (event: CalEvent) => {
    const bg = event.kind === "approved" ? "#2e7d32" : event.kind === "pending" ? "#ed6c02" : "#9e9e9e";
    return { style: { backgroundColor: bg, borderColor: bg } };
  };

  if (denied) return denied;

  const churchId = UserHelper.currentUserChurch?.church?.id || "";
  const bookRoomId = filter.startsWith("room:") ? filter.slice(5) : undefined;
  const bookResourceId = filter.startsWith("resource:") ? filter.slice(9) : undefined;

  return (
    <>
      <PageHeader icon={<AvailabilityIcon />} title={Locale.label("calendars.availability.title")} subtitle={Locale.label("calendars.availability.subtitle")}>
        <HeaderPrimaryButton
          startIcon={<AddIcon />}
          onClick={() => { setBookEventId(undefined); setShowBook(true); }}
          data-testid="availability-book-button"
        >
          {Locale.label("calendars.availability.book")}
        </HeaderPrimaryButton>
      </PageHeader>
      <Box sx={{ p: 3 }}>
        <Box sx={{ bgcolor: "background.paper", p: 2, borderRadius: 2, border: "1px solid", borderColor: "grey.200" }}>
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
              eventPropGetter={eventStyle as any}
              onSelectEvent={(e) => {
                if (e.eventId) {
                  setBookEventId(e.eventId);
                  setShowBook(true);
                }
              }}
              data-testid="availability-calendar"
            />
          )}
        </Box>
      </Box>
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
