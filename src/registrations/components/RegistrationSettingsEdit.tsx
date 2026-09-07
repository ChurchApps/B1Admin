import React, { useEffect, useState } from "react";
import { Card, Box, Typography, Stack, TextField, FormControlLabel, Switch, Button, Grid, MenuItem, Accordion, AccordionSummary, AccordionDetails, Alert } from "@mui/material";
import { Settings as SettingsIcon, ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import { Controller, useForm } from "react-hook-form";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { type FormInterface } from "@churchapps/helpers";
import { type CommerceEventInterface } from "../registrationCommerce";
import { RegistrationTypesEdit } from "./RegistrationTypesEdit";
import { RegistrationSelectionsEdit } from "./RegistrationSelectionsEdit";
import { RegistrationCouponsEdit } from "./RegistrationCouponsEdit";

interface Props {
  event: CommerceEventInterface;
  onUpdate: () => void;
}

type AnyRecord = Record<string, any>;

export const RegistrationSettingsEdit: React.FC<Props> = ({ event, onUpdate }) => {
  "use no memo"; // compiler caches register() results, breaking RHF field re-registration after reset()
  const [saving, setSaving] = useState(false);
  const [forms, setForms] = useState<FormInterface[]>([]);
  const [typesDirty, setTypesDirty] = useState(false);
  const [selectionsDirty, setSelectionsDirty] = useState(false);
  const [couponsDirty, setCouponsDirty] = useState(false);

  const { register, handleSubmit, reset, control, formState: { isDirty } } = useForm<AnyRecord>({ defaultValues: { registrationEnabled: false, waitlistEnabled: false, capacity: "", registrationOpenDate: "", registrationCloseDate: "", tags: "", formId: "" } });

  const anyDirty = isDirty || typesDirty || selectionsDirty || couponsDirty;

  useEffect(() => {
    if (!anyDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [anyDirty]);

  useEffect(() => {
    // GET /forms treats a contentType param as "exclude standalone forms" — filter client-side instead.
    ApiHelper.get("/forms", "MembershipApi").then((data: FormInterface[]) => setForms((data || []).filter((f) => f.contentType === "form")));
  }, []);

  useEffect(() => {
    reset({
      registrationEnabled: event.registrationEnabled || false,
      waitlistEnabled: event.waitlistEnabled || false,
      capacity: event.capacity?.toString() || "",
      registrationOpenDate: event.registrationOpenDate ? new Date(event.registrationOpenDate).toISOString().slice(0, 16) : "",
      registrationCloseDate: event.registrationCloseDate ? new Date(event.registrationCloseDate).toISOString().slice(0, 16) : "",
      tags: event.tags || "",
      formId: event.formId || ""
    });
  }, [event, reset]);

  const onValid = async (values: AnyRecord) => {
    setSaving(true);
    const updated: CommerceEventInterface = {
      ...event,
      registrationEnabled: values.registrationEnabled,
      waitlistEnabled: !!values.waitlistEnabled, // explicit boolean — Kysely drops undefined so un-toggling must send false
      capacity: values.capacity ? parseInt(values.capacity) : null,
      registrationOpenDate: values.registrationOpenDate ? new Date(values.registrationOpenDate) : null,
      registrationCloseDate: values.registrationCloseDate ? new Date(values.registrationCloseDate) : null,
      tags: values.tags,
      formId: values.formId || null
    };
    await ApiHelper.post("/events", [updated], "ContentApi");
    setSaving(false);
    reset(values);
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
        {anyDirty && (
          <Alert severity="warning" sx={{ mb: 2 }} data-testid="registration-unsaved-changes-alert">
            {Locale.label("registrations.registrationSettingsEdit.unsavedChanges")}
          </Alert>
        )}
        <Stack spacing={2}>
          <Controller
            control={control}
            name="registrationEnabled"
            render={({ field }) => (
              <FormControlLabel control={<Switch checked={!!field.value} onChange={(ev) => field.onChange(ev.target.checked)} data-testid="registration-enabled-switch" />} label={Locale.label("registrations.registrationSettingsEdit.enableRegistration")} />
            )}
          />
          <TextField label={Locale.label("registrations.registrationSettingsEdit.capacity")} type="number" placeholder={Locale.label("registrations.registrationSettingsEdit.capacityPlaceholder")} size="small" fullWidth {...register("capacity")} />
          <Controller
            control={control}
            name="waitlistEnabled"
            render={({ field }) => (
              <FormControlLabel control={<Switch checked={!!field.value} onChange={(ev) => field.onChange(ev.target.checked)} data-testid="waitlist-enabled-switch" />} label={Locale.label("registrations.registrationSettingsEdit.enableWaitlist")} />
            )}
          />
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

        <Box sx={{ mt: 2 }}>
          <Accordion disableGutters data-testid="attendee-types-accordion">
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={{ fontWeight: 600 }}>{Locale.label("registrations.commerce.attendeeTypes")}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <RegistrationTypesEdit event={event} onDirtyChange={setTypesDirty} />
            </AccordionDetails>
          </Accordion>
          <Accordion disableGutters data-testid="selections-accordion">
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={{ fontWeight: 600 }}>{Locale.label("registrations.commerce.selections")}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <RegistrationSelectionsEdit event={event} onDirtyChange={setSelectionsDirty} />
            </AccordionDetails>
          </Accordion>
          <Accordion disableGutters data-testid="coupons-accordion">
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={{ fontWeight: 600 }}>{Locale.label("registrations.commerce.discountCodes")}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <RegistrationCouponsEdit event={event} onDirtyChange={setCouponsDirty} />
            </AccordionDetails>
          </Accordion>
        </Box>
      </Box>
    </Card>
  );
};
