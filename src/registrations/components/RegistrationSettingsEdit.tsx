import React, { useEffect, useState } from "react";
import { Card, Box, Typography, Stack, TextField, FormControlLabel, Switch, Button, Grid, MenuItem } from "@mui/material";
import { Settings as SettingsIcon } from "@mui/icons-material";
import { Controller, useForm } from "react-hook-form";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { type EventInterface, type FormInterface } from "@churchapps/helpers";

interface Props {
  event: EventInterface;
  onUpdate: () => void;
}

type AnyRecord = Record<string, any>;

export const RegistrationSettingsEdit: React.FC<Props> = ({ event, onUpdate }) => {
  "use no memo"; // compiler caches register() results, breaking RHF field re-registration after reset()
  const [saving, setSaving] = useState(false);
  const [forms, setForms] = useState<FormInterface[]>([]);

  const { register, handleSubmit, reset, control } = useForm<AnyRecord>({ defaultValues: { registrationEnabled: false, capacity: "", registrationOpenDate: "", registrationCloseDate: "", tags: "", formId: "" } });

  useEffect(() => {
    // GET /forms treats a contentType param as "exclude standalone forms" — filter client-side instead.
    ApiHelper.get("/forms", "MembershipApi").then((data: FormInterface[]) => setForms((data || []).filter((f) => f.contentType === "form")));
  }, []);

  useEffect(() => {
    reset({
      registrationEnabled: event.registrationEnabled || false,
      capacity: event.capacity?.toString() || "",
      registrationOpenDate: event.registrationOpenDate ? new Date(event.registrationOpenDate).toISOString().slice(0, 16) : "",
      registrationCloseDate: event.registrationCloseDate ? new Date(event.registrationCloseDate).toISOString().slice(0, 16) : "",
      tags: event.tags || "",
      formId: event.formId || ""
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
      tags: values.tags,
      formId: values.formId || null
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
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label={Locale.label("registrations.registrationSettingsEdit.registrationOpens")} type="datetime-local" size="small" fullWidth {...register("registrationOpenDate")} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label={Locale.label("registrations.registrationSettingsEdit.registrationCloses")} type="datetime-local" size="small" fullWidth {...register("registrationCloseDate")} />
            </Grid>
          </Grid>
          <TextField label={Locale.label("registrations.registrationSettingsEdit.tags")} placeholder={Locale.label("registrations.registrationSettingsEdit.tagsPlaceholder")} helperText={Locale.label("registrations.registrationSettingsEdit.tagsHelper")} size="small" fullWidth {...register("tags")} />
          <TextField select label={Locale.label("registrations.registrationSettingsEdit.registrationQuestions")} size="small" fullWidth {...register("formId")}>
            <MenuItem value="">{Locale.label("registrations.registrationSettingsEdit.none")}</MenuItem>
            {forms.map((f) => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
          </TextField>
          <Button variant="contained" onClick={handleSubmit(onValid)} disabled={saving}>
            {saving ? Locale.label("common.saving") : Locale.label("registrations.registrationSettingsEdit.saveSettings")}
          </Button>
        </Stack>
      </Box>
    </Card>
  );
};
