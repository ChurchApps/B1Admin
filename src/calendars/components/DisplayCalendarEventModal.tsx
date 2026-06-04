import { Dialog, DialogContent, DialogActions, Typography, Box, Button } from "@mui/material";
import { DateHelper, ApiHelper, Locale } from "@churchapps/apphelper";
import { type CuratedEventWithEventInterface } from "@churchapps/helpers";

interface Props {
  event: CuratedEventWithEventInterface;
  mode: "view" | "edit";
  curatedCalendarId?: string;
  onDone?: () => void;
}

export function DisplayCalendarEventModal(props: Props) {
  const getDisplayTime = () => {
    let result = "";
    if (props.event.allDay) {
      const prettyStartDate = DateHelper.prettyDate(props.event.start);
      const prettyEndDate = DateHelper.prettyDate(props.event.end);
      if (prettyStartDate === prettyEndDate) result = prettyStartDate;
      else result = `${prettyStartDate} - ${prettyEndDate}`;
    } else {
      const prettyStart = DateHelper.prettyDateTime(props.event.start);
      const prettyEnd = DateHelper.prettyDateTime(props.event.end);
      const prettyEndTime = DateHelper.prettyTime(props.event.end);
      const startDate = DateHelper.prettyDate(new Date(prettyStart));
      const endDate = DateHelper.prettyDate(new Date(prettyEnd));
      if (startDate === endDate) result = `${prettyStart} - ${prettyEndTime}`;
      else result = `${prettyStart} - ${prettyEnd}`;
    }
    return result;
  };

  const handleDelete = () => {
    if (confirm(Locale.label("calendars.calendarEvent.confirmDelete"))) {
      const deleteUrl = props.event.eventId
        ? "/curatedEvents/calendar/" + props.curatedCalendarId + "/event/" + props.event.eventId
        : "/curatedEvents/" + props.event.id;

      ApiHelper.delete(deleteUrl, "ContentApi").then(() => {
        if (props.onDone) props.onDone();
      });
    }
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

  return (
    <Dialog open={true} onClose={props.onDone} fullWidth scroll="body">
      <DialogContent>
        <Box borderLeft={5} borderRadius={1} borderColor="#1976d2" padding={2} paddingBottom={0}>
          <Typography variant="h5" fontWeight={550} marginBottom={1}>
            {props.event.title}
          </Typography>
          <i>{getDisplayTime()}</i>
          {renderDescription()}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button variant="text" onClick={props.onDone} data-testid="calendar-event-cancel-button">
          {Locale.label("calendars.calendarEvent.cancel")}
        </Button>
        {props.event.id && props.mode === "edit" && (
          <Button variant="contained" onClick={handleDelete} data-testid="calendar-event-delete-button">
            {Locale.label("calendars.calendarEvent.delete")}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
