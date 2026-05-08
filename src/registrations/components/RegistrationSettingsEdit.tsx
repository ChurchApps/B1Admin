import React, { useEffect, useState } from "react";
import { Card, Box, Typography, Stack, TextField, FormControlLabel, Switch, Button } from "@mui/material";
import { Settings as SettingsIcon } from "@mui/icons-material";
import { Controller, useForm } from "react-hook-form";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { type EventInterface } from "@churchapps/helpers";

interface Props {
  event: EventInterface;
  onUpdate: () => void;
}

type AnyRecord = Record<string, any>;

export const RegistrationSettingsEdit: React.FC<Props> = ({ event, onUpdate }) => {
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, control } = useForm<AnyRecord>({ defaultValues: { registrationEnabled: false, capacity: "", registrationOpenDate: "", registrationCloseDate: "", tags: "" } });

  useEffect(() => {
    reset({
      registrationEnabled: event.registrationEnabled || false,
      capacity: event.capacity?.toString() || "",
      registrationOpenDate: event.registrationOpenDate ? new Date(event.registrationOpenDate).toISOString().slice(0, 16) : "",
      registrationCloseDate: event.registrationCloseDate ? new Date(event.registrationCloseDate).toISOString().slice(0, 16) : "",
      tags: event.tags || ""
    });
  }, [event, reset]);

  const onValid = async (values: AnyRecord) => {
    setSaving(true);
    const updated: EventInterface = {
      ...event,
      registrationEnabled: values.registrationEnabled,
      capacity: values.capacity ? parseInt(values.capacity) : null,
      registrationOpenDate: values.registrationOpenDate ? new Date(values.registrationOpenDate) : null,
      registrationCloseDate: values.registrationCloseDate ? new Date(values.registrationCloseDate) : null,
      tags: values.tags
    };
    await ApiHelper.post("/events", [updated], "ContentApi");
    setSaving(false);
    onUpdate();
  };

  return (
    <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "grey.200" }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <SettingsIcon sx={{ color: "primary.main" }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
            {Locale.label("registrations.registrationSettingsEdit.registrationSettings")}
          </Typography>
        </Stack>
      </Box>
      <Box sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Controller
            control={control}
            name="registrationEnabled"
            render={({ field }) => (
              <FormControlLabel control={<Switch checked={!!field.value} onChange={(ev) => field.onChange(ev.target.checked)} />} label={Locale.label("registrations.registrationSettingsEdit.enableRegistration")} />
            )}
          />
          <TextField label={Locale.label("registrations.registrationSettingsEdit.capacity")} type="number" placeholder={Locale.label("registrations.registrationSettingsEdit.capacityPlaceholder")} size="small" fullWidth {...register("capacity")} />
          <TextField label={Locale.label("registrations.registrationSettingsEdit.registrationOpens")} type="datetime-local" size="small" fullWidth slotProps={{ inputLabel: { shrink: true } }} {...register("registrationOpenDate")} />
          <TextField label={Locale.label("registrations.registrationSettingsEdit.registrationCloses")} type="datetime-local" size="small" fullWidth slotProps={{ inputLabel: { shrink: true } }} {...register("registrationCloseDate")} />
          <TextField label={Locale.label("registrations.registrationSettingsEdit.tags")} placeholder={Locale.label("registrations.registrationSettingsEdit.tagsPlaceholder")} helperText={Locale.label("registrations.registrationSettingsEdit.tagsHelper")} size="small" fullWidth {...register("tags")} />
          <Button variant="contained" onClick={handleSubmit(onValid)} disabled={saving}>
            {saving ? Locale.label("common.saving") : Locale.label("registrations.registrationSettingsEdit.saveSettings")}
          </Button>
        </Stack>
      </Box>
    </Card>
  );
};
