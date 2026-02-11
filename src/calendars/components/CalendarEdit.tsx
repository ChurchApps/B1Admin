import { useState, useEffect } from "react";
import { ApiHelper, UserHelper, Locale } from "@churchapps/apphelper";
import { Permissions, type CuratedCalendarInterface } from "@churchapps/helpers";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Stack,
  Typography,
  IconButton,
  Divider,
  Alert
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import {
  Save as SaveIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  CalendarMonth as CalendarIcon
} from "@mui/icons-material";

type Props = {
  calendar: CuratedCalendarInterface;
  updatedCallback: (calendar: CuratedCalendarInterface | null) => void;
};

export function CalendarEdit(props: Props) {
  const [calendar, setCalendar] = useState<CuratedCalendarInterface | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleCancel = () => props.updatedCallback(calendar);
  const handleKeyDown = (e: React.KeyboardEvent<any>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    e.preventDefault();
    const b = { ...calendar };
    const val = e.target.value;
    switch (e.target.name) {
      case "name": b.name = val; break;
    }
    setCalendar(b);
  };

  const validate = () => {
    const errors = [];
    if (!calendar?.name || calendar.name === "") errors.push(Locale.label("calendars.calendarEdit.nameRequired"));
    if (!UserHelper.checkAccess(Permissions.contentApi.content.edit)) errors.push(Locale.label("calendars.calendarEdit.unauthorizedCreate"));
    setErrors(errors);
    return errors.length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      setSaving(true);
      ApiHelper.post("/curatedCalendars", [calendar], "ContentApi").then((data: any) => {
        setCalendar(data);
        setSaving(false);
        props.updatedCallback(data);
      }).catch(() => {
        setSaving(false);
      });
    }
  };

  const handleDelete = () => {
    const errors = [];
    if (!UserHelper.checkAccess(Permissions.contentApi.content.edit)) errors.push(Locale.label("calendars.calendarEdit.unauthorizedDelete"));

    if (errors.length > 0) {
      setErrors(errors);
      return;
    }

    if (window.confirm(Locale.label("calendars.calendarEdit.confirmDelete"))) {
      setDeleting(true);
      ApiHelper.delete("/curatedCalendars/" + calendar?.id?.toString(), "ContentApi").then(() => {
        setDeleting(false);
        props.updatedCallback(null);
      }).catch(() => {
        setDeleting(false);
      });
    }
  };

  useEffect(() => {
    setCalendar(props.calendar);
  }, [props.calendar]);

  if (!calendar) return <></>;

  const isNew = !calendar.id;

  return (
    <Card sx={{
      borderRadius: 2,
      border: "1px solid",
      borderColor: "grey.200",
      height: "fit-content"
    }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center">
            <CalendarIcon sx={{ color: "primary.main" }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
              {isNew ? Locale.label("calendars.calendarEdit.createCalendar") : Locale.label("calendars.calendarEdit.editCalendar")}
            </Typography>
          </Stack>
          <IconButton
            size="small"
            onClick={handleCancel}
            sx={{
              backgroundColor: "rgba(0,0,0,0.04)",
              "&:hover": { backgroundColor: "rgba(0,0,0,0.08)" }
            }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Stack>
      </Box>

      <CardContent>
        <Stack spacing={3}>
          {errors.length > 0 && (
            <Alert severity="error" data-testid="calendar-errors">
              <Stack spacing={1}>
                {errors.map((error, index) => (
                  <Typography key={index} variant="body2">{error}</Typography>
                ))}
              </Stack>
            </Alert>
          )}

          <TextField
            fullWidth
            label={Locale.label("calendars.calendarEdit.calendarName")}
            name="name"
            value={calendar.name || ""}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            data-testid="calendar-name-input"
            aria-label={Locale.label("calendars.calendarEdit.calendarNameAria")}
            placeholder={Locale.label("calendars.calendarEdit.namePlaceholder")}
            variant="outlined"
          />

          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {Locale.label("calendars.calendarEdit.calendarDetails")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {Locale.label("calendars.calendarEdit.calendarDetailsDesc")}
            </Typography>
          </Box>

          <Divider />

          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button
              variant="outlined"
              onClick={handleCancel}
              disabled={saving || deleting}
              sx={{
                textTransform: "none",
                borderRadius: 2
              }}
            >
              {Locale.label("calendars.calendarEdit.cancel")}
            </Button>

            {!isNew && (
              <Button
                variant="outlined"
                color="error"
                onClick={handleDelete}
                disabled={saving || deleting}
                startIcon={deleting ? undefined : <DeleteIcon />}
                sx={{
                  textTransform: "none",
                  borderRadius: 2
                }}
                data-testid="delete-calendar-button"
              >
                {deleting ? Locale.label("calendars.calendarEdit.deleting") : Locale.label("calendars.calendarEdit.delete")}
              </Button>
            )}

            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving || deleting || !calendar.name?.trim()}
              startIcon={saving ? undefined : <SaveIcon />}
              sx={{
                textTransform: "none",
                borderRadius: 2,
                fontWeight: 600
              }}
              data-testid="save-calendar-button"
            >
              {saving ? Locale.label("calendars.calendarEdit.saving") : (isNew ? Locale.label("calendars.calendarEdit.create") : Locale.label("calendars.calendarEdit.save"))}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
