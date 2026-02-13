import { useState } from "react";
import "react-big-calendar/lib/css/react-big-calendar.css";
import dayjs from "dayjs";
import { Calendar, dayjsLocalizer } from "react-big-calendar";
import { Button, Icon, Snackbar, Stack, Menu, MenuItem } from "@mui/material";
import { EventNote as EventNoteIcon, ArrowDropDown as ArrowDropDownIcon } from "@mui/icons-material";
import { EventHelper, UserHelper, Locale } from "@churchapps/apphelper";
import { type CuratedEventWithEventInterface } from "@churchapps/helpers";
import { EditCalendarEventModal } from "./EditCalendarEventModal";
import { DisplayCalendarEventModal } from "./DisplayCalendarEventModal";
import { EnvironmentHelper } from "../../helpers/EnvironmentHelper";

interface Props {
  events: CuratedEventWithEventInterface[];
  mode: "view" | "edit";
  curatedCalendarId?: string;
  churchId?: string;
  onRequestRefresh?: () => void;
  "data-testid"?: string;
}

export function CuratedEventCalendar(props: Props) {
  const [open, setOpen] = useState<boolean>(false);
  const [displayCalendarEvent, setDisplayCalendarEvent] = useState<CuratedEventWithEventInterface | null>(null);
  const [showCopy, setShowCopy] = useState<boolean>(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const localizer = dayjsLocalizer(dayjs);

  const getIcsUrl = () => {
    const contentApi = EnvironmentHelper.Common.ContentApi;
    return `${contentApi}/events/subscribe?curatedCalendarId=${props.curatedCalendarId}&churchId=${UserHelper.currentUserChurch?.church?.id}`;
  };

  const handleSubscribeClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleCopyIcsLink = () => {
    setShowCopy(true);
    navigator.clipboard.writeText(getIcsUrl());
    handleMenuClose();
  };

  const handleDownloadIcsFile = () => {
    const url = getIcsUrl();
    const link = document.createElement("a");
    link.href = url;
    link.download = "calendar.ics";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    handleMenuClose();
  };

  const handleEventClick = (event: CuratedEventWithEventInterface) => {
    const ev = { ...event };
    setDisplayCalendarEvent(ev);
  };

  const handleDone = () => {
    setOpen(false);
    setDisplayCalendarEvent(null);
    if (props.onRequestRefresh) props.onRequestRefresh();
  };

  const expandedEvents: CuratedEventWithEventInterface[] = [];
  const startRange = new Date();
  const endRange = new Date();
  startRange.setFullYear(startRange.getFullYear() - 1);
  endRange.setFullYear(endRange.getFullYear() + 1);

  props.events.forEach((event) => {
    const ev = { ...event };
    ev.start = new Date(ev.start);
    ev.end = new Date(ev.end);
    if (ev.recurrenceRule) {
      const dates = EventHelper.getRange(ev, startRange, endRange);
      dates.forEach((date) => {
        const evt = { ...event };
        const diff = new Date(evt.end).getTime() - new Date(evt.start).getTime();
        evt.start = date;
        evt.end = new Date(date.getTime() + diff);
        expandedEvents.push(evt);
      });
      EventHelper.removeExcludeDates(expandedEvents);
    } else {
      expandedEvents.push(ev);
    }
  });

  return (
    <div data-testid={props["data-testid"]}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" marginBottom="17px" marginTop="12px">
        <div>
          <Button
            startIcon={<Icon>link</Icon>}
            endIcon={<ArrowDropDownIcon />}
            title={Locale.label("calendars.calendar.subscribeTitle")}
            size="small"
            variant="contained"
            onClick={handleSubscribeClick}
            data-testid="calendar-subscribe-button"
          >
            {Locale.label("calendars.calendar.subscribe")}
          </Button>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose} data-testid="calendar-subscribe-menu">
            <MenuItem onClick={handleCopyIcsLink} data-testid="copy-ics-link-option">
              <Icon sx={{ marginRight: 1 }}>content_copy</Icon>
              {Locale.label("calendars.calendar.copyIcsLink")}
            </MenuItem>
            <MenuItem onClick={handleDownloadIcsFile} data-testid="download-ics-file-option">
              <Icon sx={{ marginRight: 1 }}>download</Icon>
              {Locale.label("calendars.calendar.downloadIcsFile")}
            </MenuItem>
          </Menu>
        </div>
        {props.mode === "edit" && (
          <Button
            endIcon={<EventNoteIcon />}
            size="small"
            variant="contained"
            onClick={() => setOpen(true)}
            data-testid="calendar-add-event-button"
          >
            {Locale.label("calendars.calendar.add")}
          </Button>
        )}
      </Stack>
      <Calendar
        localizer={localizer}
        events={expandedEvents}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 500 }}
        onSelectEvent={handleEventClick}
      />
      {open && props.mode === "edit" && (
        <EditCalendarEventModal onDone={handleDone} churchId={props.churchId} curatedCalendarId={props.curatedCalendarId} />
      )}
      {displayCalendarEvent && (
        <DisplayCalendarEventModal event={displayCalendarEvent} curatedCalendarId={props.curatedCalendarId} mode={props.mode} onDone={handleDone} />
      )}
      <Snackbar
        open={showCopy}
        onClose={() => setShowCopy(false)}
        autoHideDuration={2000}
        message={Locale.label("calendars.calendar.copiedToClipboard")}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        ContentProps={{ sx: { background: "green" } }}
      />
    </div>
  );
}
