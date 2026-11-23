import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogActions, Typography, Box, Button } from "@mui/material";
import { HowToReg as RegIcon, Edit as EditIcon, Share as ShareIcon, ContentCopy as DuplicateIcon, Place as PlaceIcon } from "@mui/icons-material";
import { DateHelper, ApiHelper, Locale } from "@churchapps/apphelper";
import { type CuratedEventWithEventInterface, type EventInterface } from "@churchapps/helpers";
import { useConfirmDelete } from "../../hooks";
import { EventReminderEdit } from "./EventReminderEdit";
import { EventModal } from "./EventModal";
import { ContentNotes } from "../../components/ContentNotes";
import { ShareLinkDialog } from "../../components/ShareLinkDialog";
import { getPublicEventUrl } from "../../helpers/EventLinkHelper";

interface Props {
  event: CuratedEventWithEventInterface;
  mode: "view" | "edit";
  curatedCalendarId?: string;
  churchId?: string;
  onDone?: () => void;
}

export function DisplayCalendarEventModal(props: Props) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const { confirm, ConfirmDialogElement } = useConfirmDelete();
  const [sharing, setSharing] = useState(false);
  const [fullEvent, setFullEvent] = useState<EventInterface | null>(null);
  const realEventId = (props.event as CuratedEventWithEventInterface & { realEventId?: string }).realEventId || props.event.eventId;

  // The curated payload has no registrationEnabled, so load the event itself.
  useEffect(() => {
    if (props.mode !== "edit" || !realEventId) return;
    ApiHelper.get("/events/" + realEventId, "ContentApi").then((data: EventInterface) => setFullEvent(data || null));
  }, [props.mode, realEventId]);

  // The public event page only serves public events, or private ones taking registrations.
  const shareable = fullEvent?.visibility === "public" || !!fullEvent?.registrationEnabled;
  const shareSlug = (props.event.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "event";

  const getDisplayTime = () => {
    let result: string;
    if (props.event.allDay) {
      const prettyStartDate = DateHelper.prettyDate(props.event.start!);
      const prettyEndDate = DateHelper.prettyDate(props.event.end!);
      if (prettyStartDate === prettyEndDate) result = prettyStartDate;
      else result = `${prettyStartDate} - ${prettyEndDate}`;
    } else {
      const prettyStart = DateHelper.prettyDateTime(props.event.start!);
      const prettyEnd = DateHelper.prettyDateTime(props.event.end!);
      const prettyEndTime = DateHelper.prettyTime(props.event.end!);
      const startDate = DateHelper.prettyDate(new Date(props.event.start!));
      const endDate = DateHelper.prettyDate(new Date(props.event.end!));
      if (startDate === endDate) result = `${prettyStart} - ${prettyEndTime}`;
      else result = `${prettyStart} - ${prettyEnd}`;
    }
    return result;
  };

  const handleDelete = async () => {
    // Only the calendar link is removed, never the event. A group-sourced entry is the whole group's link.
    const message = props.event.eventId ? Locale.label("calendars.calendarEvent.confirmRemoveEvent") : Locale.label("calendars.calendarEvent.confirmRemoveGroupEvent");
    if (await confirm(message, { confirmLabel: Locale.label("calendars.calendarEvent.removeFromCalendar") })) {
      const deleteUrl = props.event.eventId
        ? "/curatedEvents/calendar/" + props.curatedCalendarId + "/event/" + props.event.eventId
        : "/curatedEvents/" + props.event.id;

      ApiHelper.delete(deleteUrl, "ContentApi").then(() => {
        if (props.onDone) props.onDone();
      });
    }
  };

  const renderLocation = () => {
    const location = (props.event as CuratedEventWithEventInterface & { location?: string }).location;
    if (!location) return null;
    return (
      <Box display="flex" alignItems="center" gap={0.5} marginTop={1} data-testid="calendar-event-location">
        <PlaceIcon fontSize="small" color="action" />
        <Typography variant="body2">{location}</Typography>
      </Box>
    );
  };

  const renderDescription = () => {
    if (!props.event.description) return null;

    return (
      <Box marginTop={2}>
        <Typography variant="body1" style={{ whiteSpace: "pre-wrap" }}>
          {props.event.description}
        </Typography>
      </Box>
    );
  };

  if (editing && realEventId) {
    return (
      <EventModal
        churchId={props.churchId || ""}
        eventId={realEventId}
        curatedCalendarId={props.curatedCalendarId}
        occurrenceStart={props.event.start ? new Date(props.event.start) : undefined}
        onDone={(saved) => {
          setEditing(false);
          if (saved && props.onDone) props.onDone();
        }}
      />
    );
  }

  if (duplicating && realEventId) {
    return (
      <EventModal
        churchId={props.churchId || ""}
        copyFromEventId={realEventId}
        copyStart={props.event.start ? new Date(props.event.start) : undefined}
        curatedCalendarId={props.curatedCalendarId}
        onDone={(saved) => {
          setDuplicating(false);
          if (saved && props.onDone) props.onDone();
        }}
      />
    );
  }

  return (
    <>
      {ConfirmDialogElement}
      <Dialog open={true} onClose={props.onDone} fullWidth scroll="body">
        <DialogContent>
          <Box borderLeft={5} borderRadius={1} borderColor="primary.main" padding={2} paddingBottom={0}>
            <Typography variant="h5" fontWeight={550} marginBottom={1}>
              {props.event.title}
            </Typography>
            <i>{getDisplayTime()}</i>
            {renderLocation()}
            {renderDescription()}
          </Box>
          {props.mode === "edit" && realEventId && (
            <Box sx={{ mt: 2 }}>
              <EventReminderEdit eventId={realEventId} hasRegistration={!!fullEvent?.registrationEnabled} />
            </Box>
          )}
          {props.mode === "edit" && realEventId && (
            <Box sx={{ mt: 2 }}>
              <ContentNotes contentType="eventNote" contentId={realEventId} title={(props.event.title || "") + Locale.label("calendars.calendarEvent.notesSuffix", " Notes")} />
            </Box>
          )}
        </DialogContent>
        <DialogActions disableSpacing sx={{ flexWrap: "wrap", gap: 1, "& .MuiButton-root": { whiteSpace: "nowrap" } }}>
          <Button variant="text" onClick={props.onDone} data-testid="calendar-event-cancel-button">
            {Locale.label("calendars.calendarEvent.cancel")}
          </Button>
          {realEventId && props.mode === "edit" && (
            <Button variant="outlined" startIcon={<EditIcon />} onClick={() => setEditing(true)} data-testid="calendar-event-edit-button">
              {Locale.label("calendars.calendarEvent.edit")}
            </Button>
          )}
          {realEventId && props.mode === "edit" && (
            <Button variant="outlined" startIcon={<DuplicateIcon />} onClick={() => setDuplicating(true)} data-testid="calendar-event-duplicate-button">
              {Locale.label("calendars.calendarEvent.duplicate")}
            </Button>
          )}
          {realEventId && props.mode === "edit" && shareable && (
            <Button variant="outlined" startIcon={<ShareIcon />} onClick={() => setSharing(true)} data-testid="calendar-event-share-button">
              {Locale.label("calendars.calendarEvent.share")}
            </Button>
          )}
          {realEventId && props.mode === "edit" && (
            <Button variant="outlined" startIcon={<RegIcon />} onClick={() => navigate("/registrations/" + realEventId)} data-testid="calendar-event-registrations-button">
              {Locale.label("calendars.calendarEvent.manageRegistrations")}
            </Button>
          )}
          {props.event.id && props.mode === "edit" && (
            <Button variant="contained" onClick={handleDelete} data-testid="calendar-event-delete-button">
              {Locale.label("calendars.calendarEvent.removeFromCalendar")}
            </Button>
          )}
        </DialogActions>
      </Dialog>
      {sharing && realEventId && (
        <ShareLinkDialog
          open={true}
          onClose={() => setSharing(false)}
          title={`${Locale.label("calendars.calendarEvent.share")}: ${props.event.title || ""}`}
          url={getPublicEventUrl(realEventId)}
          hint={Locale.label("calendars.calendarEvent.shareHint")}
          fileName={`event-qr-${shareSlug}`}
        />
      )}
    </>
  );
}
