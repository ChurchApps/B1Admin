import { useState, useEffect } from "react";
import { ApiHelper, UserHelper, Locale, ErrorMessages } from "@churchapps/apphelper";
import { Permissions, type CuratedCalendarInterface } from "@churchapps/helpers";
import { Box, TextField, Typography } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import { FormCard } from "../../components/ui";
import { useConfirmDelete } from "../../hooks";

type Props = {
  calendar: CuratedCalendarInterface;
  updatedCallback: (calendar: CuratedCalendarInterface | null) => void;
};

export function CalendarEdit(props: Props) {
  const [calendar, setCalendar] = useState<CuratedCalendarInterface | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  const handleCancel = () => props.updatedCallback(calendar);
  const handleKeyDown = (e: React.KeyboardEvent<any>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    e.preventDefault();
    const { name, value } = e.target;
    setCalendar({ ...calendar, [name]: value });
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

  const handleDelete = async () => {
    const errors = [];
    if (!UserHelper.checkAccess(Permissions.contentApi.content.edit)) errors.push(Locale.label("calendars.calendarEdit.unauthorizedDelete"));

    if (errors.length > 0) {
      setErrors(errors);
      return;
    }

    if (await confirm(Locale.label("calendars.calendarEdit.confirmDelete"))) {
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
    <>
      {ConfirmDialogElement}
      <FormCard
        title={isNew ? Locale.label("calendars.calendarEdit.createCalendar") : Locale.label("calendars.calendarEdit.editCalendar")}
        icon="calendar_month"
        onSave={handleSave}
        onCancel={handleCancel}
        onDelete={isNew ? undefined : handleDelete}
        isSubmitting={saving}
        disabled={saving || deleting || !calendar.name?.trim()}
        saveText={isNew ? Locale.label("calendars.calendarEdit.create") : Locale.label("calendars.calendarEdit.save")}
        cancelText={Locale.label("calendars.calendarEdit.cancel")}
        deleteText={Locale.label("calendars.calendarEdit.delete")}
        saveTestId="save-calendar-button"
        deleteTestId="delete-calendar-button">
        {errors.length > 0 && <ErrorMessages errors={errors} data-testid="calendar-errors" />}

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
      </FormCard>
    </>
  );
}
