import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { type EventInterface, type GroupInterface } from "@churchapps/helpers";
import { Box, Button, Card, IconButton, Stack, Table, TableBody, TableCell, TableRow, Typography } from "@mui/material";
import { Event as EventIcon, Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { SortableTableHead } from "../../components/ui";
import { BulkGroupEventsModal } from "./BulkGroupEventsModal";

interface Props {
  group: GroupInterface;
}

export const GroupCalendarTab = (props: Props) => {
  const [showBulkAdd, setShowBulkAdd] = useState(false);

  const events = useQuery<EventInterface[]>({
    queryKey: [`/events/group/${props.group.id}`, "ContentApi"],
    placeholderData: [],
    enabled: !!props.group?.id
  });

  const describeRecurrence = (rule?: string) => {
    if (!rule) return Locale.label("groups.groupCalendar.oneTime");
    const freq = /FREQ=(\w+)/.exec(rule)?.[1];
    const interval = parseInt(/INTERVAL=(\d+)/.exec(rule)?.[1] || "1", 10);
    const until = /UNTIL=(\d{4})(\d{2})(\d{2})/.exec(rule);
    let label: string;
    if (freq === "WEEKLY") label = interval === 2 ? Locale.label("groups.groupCalendar.everyTwoWeeks") : Locale.label("calendars.newEvent.weekly");
    else if (freq === "DAILY") label = Locale.label("calendars.newEvent.daily");
    else if (freq === "MONTHLY") label = Locale.label("calendars.newEvent.monthly");
    else label = rule;
    if (until) label += ` ${Locale.label("groups.groupCalendar.until")} ${new Date(`${until[1]}-${until[2]}-${until[3]}T12:00:00`).toLocaleDateString()}`;
    return label;
  };

  const handleDelete = async (event: EventInterface) => {
    if (window.confirm(Locale.label("groups.groupCalendar.confirmDelete").replace("{title}", event.title || ""))) {
      await ApiHelper.delete(`/events/${event.id}`, "ContentApi");
      events.refetch();
    }
  };

  const handleBulkDone = (saved: boolean) => {
    setShowBulkAdd(false);
    if (saved) events.refetch();
  };

  const sorted = [...(events.data || [])].sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());

  return (
    <Box sx={{ p: 3 }} data-testid="group-calendar-tab">
      {showBulkAdd && <BulkGroupEventsModal group={props.group} onDone={handleBulkDone} />}
      <Card>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: "var(--border-light)" }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1} alignItems="center">
              <EventIcon sx={{ color: "primary.main", fontSize: 20 }} />
              <Typography variant="h6">{Locale.label("groups.groupCalendar.events")}</Typography>
            </Stack>
            <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setShowBulkAdd(true)} data-testid="bulk-add-events-button">
              {Locale.label("groups.groupCalendar.addEvents")}
            </Button>
          </Stack>
        </Box>
        <Box sx={{ overflowX: "auto" }}>
          <Table>
            <SortableTableHead
              columns={[
                { key: "title", label: Locale.label("calendars.newEvent.eventTitle") },
                { key: "start", label: Locale.label("calendars.newEvent.start") },
                { key: "recurrence", label: Locale.label("calendars.newEvent.repeats") },
                { key: "skipped", label: Locale.label("groups.groupCalendar.skippedDates") },
                { key: "visibility", label: Locale.label("calendars.newEvent.visibility") },
                { key: "actions", label: "" }
              ]}
            />
            <TableBody>
              {sorted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>{Locale.label("groups.groupCalendar.noEvents")}</TableCell>
                </TableRow>
              )}
              {sorted.map((ev) => (
                <TableRow key={ev.id} sx={{ whiteSpace: "nowrap" }}>
                  <TableCell>{ev.title}</TableCell>
                  <TableCell>{new Date(ev.start).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</TableCell>
                  <TableCell>{describeRecurrence(ev.recurrenceRule)}</TableCell>
                  <TableCell>{(ev as any).exceptionDates?.length || 0}</TableCell>
                  <TableCell>{ev.visibility === "private" ? Locale.label("calendars.newEvent.private") : Locale.label("calendars.newEvent.public")}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleDelete(ev)} aria-label={Locale.label("common.delete")} data-testid={`delete-event-${ev.id}`}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Card>
    </Box>
  );
};
