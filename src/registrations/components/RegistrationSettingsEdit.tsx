import React, { useEffect, useState } from "react";
import { Box, Typography, Stack, TextField, FormControlLabel, Switch, Button, Grid, MenuItem, Accordion, AccordionSummary, AccordionDetails, Alert } from "@mui/material";
import { ContentCopy as ContentCopyIcon, ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import { Controller, useForm } from "react-hook-form";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { type FormInterface } from "@churchapps/helpers";
import { CardWithHeader } from "../../components/ui";
import { type CommerceEventInterface } from "../registrationCommerce";
import { RegistrationTypesEdit } from "./RegistrationTypesEdit";
import { RegistrationSelectionsEdit } from "./RegistrationSelectionsEdit";
import { RegistrationCouponsEdit } from "./RegistrationCouponsEdit";
import { CopyRegistrationSetupDialog } from "./CopyRegistrationSetupDialog";

interface Props {
  event: CommerceEventInterface;
  onUpdate: () => void;
}

type RegistrationSettingsFormValues = {
  registrationEnabled: boolean;
  waitlistEnabled: boolean;
  allowSelfCancel: boolean;
  allowPayLater: boolean;
  capacity: string;
  registrationOpenDate: string;
  registrationCloseDate: string;
  tags: string;
  formId: string;
  confirmationMessage: string;
};

const toLocalInput = (d: Date | string) => {
  const dt = new Date(d);
  return new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export const RegistrationSettingsEdit: React.FC<Props> = ({ event, onUpdate }) => {
  "use no memo"; // compiler caches register() results, breaking RHF field re-registration after reset()
  const [saving, setSaving] = useState(false);
  const [forms, setForms] = useState<FormInterface[]>([]);
  const [typesDirty, setTypesDirty] = useState(false);
  const [selectionsDirty, setSelectionsDirty] = useState(false);
  const [couponsDirty, setCouponsDirty] = useState(false);
  const [showCopy, setShowCopy] = useState(false);
  const [copiedFrom, setCopiedFrom] = useState("");
  // Bumped after a copy so the attendee type, selection, and discount code lists reload.
  const [listsVersion, setListsVersion] = useState(0);

  const { register, handleSubmit, reset, control, watch, formState: { isDirty } } = useForm<RegistrationSettingsFormValues>({ defaultValues: { registrationEnabled: false, waitlistEnabled: false, allowSelfCancel: true, allowPayLater: false, capacity: "", registrationOpenDate: "", registrationCloseDate: "", tags: "", formId: "", confirmationMessage: "" } });

  const sectionsDirty = typesDirty || selectionsDirty || couponsDirty;
  const anyDirty = isDirty || sectionsDirty;

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

  const toFormValues = (e: CommerceEventInterface): RegistrationSettingsFormValues => ({
    registrationEnabled: e.registrationEnabled || false,
    waitlistEnabled: e.waitlistEnabled || false,
    allowSelfCancel: e.allowSelfCancel !== false,
    allowPayLater: e.allowPayLater || false,
    capacity: e.capacity?.toString() || "",
    registrationOpenDate: e.registrationOpenDate ? toLocalInput(e.registrationOpenDate) : "",
    registrationCloseDate: e.registrationCloseDate ? toLocalInput(e.registrationCloseDate) : "",
    tags: e.tags || "",
    formId: e.formId || "",
    confirmationMessage: e.confirmationMessage || ""
  });

  useEffect(() => {
    reset(toFormValues(event));
  }, [event, reset]);

  const handleCopied = (updated: CommerceEventInterface, sourceTitle: string) => {
    reset(toFormValues(updated));
    setListsVersion((v) => v + 1);
    setCopiedFrom(sourceTitle);
    setShowCopy(false);
  };

  const onValid = async (values: RegistrationSettingsFormValues) => {
    setSaving(true);
    const updated: CommerceEventInterface = {
      ...event,
      registrationEnabled: values.registrationEnabled,
      waitlistEnabled: !!values.waitlistEnabled, // explicit boolean — Kysely drops undefined so un-toggling must send false
      allowSelfCancel: !!values.allowSelfCancel,
      allowPayLater: !!values.allowPayLater,
      capacity: values.capacity ? parseInt(values.capacity) : null,
      registrationOpenDate: values.registrationOpenDate ? new Date(values.registrationOpenDate) : null,
      registrationCloseDate: values.registrationCloseDate ? new Date(values.registrationCloseDate) : null,
      tags: values.tags,
      formId: values.formId || null,
      confirmationMessage: values.confirmationMessage.trim() // blank clears it
    };
    try {
      await ApiHelper.post("/events", [updated], "ContentApi");
    } finally {
      setSaving(false);
    }
    reset(values);
    onUpdate();
  };

  return (
    <CardWithHeader title={Locale.label("registrations.registrationSettingsEdit.registrationSettings")}>
      <Box>
        {sectionsDirty && (
          <Alert severity="warning" sx={{ mb: 2 }} data-testid="registration-unsaved-changes-alert">
            {Locale.label("registrations.registrationSettingsEdit.unsavedChanges")}
          </Alert>
        )}
        {copiedFrom && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setCopiedFrom("")} data-testid="copy-registration-setup-done">
            {Locale.label("registrations.copySetup.done", "Setup copied from {title}.").replace("{title}", copiedFrom)}
          </Alert>
        )}
        <Stack spacing={2}>
          <Box>
            <Button size="small" startIcon={<ContentCopyIcon />} onClick={() => setShowCopy(true)} disabled={anyDirty} title={anyDirty ? Locale.label("registrations.copySetup.saveFirst", "Save or discard your changes before copying") : undefined} data-testid="copy-registration-setup-button">
              {Locale.label("registrations.copySetup.title", "Copy setup from another event")}
            </Button>
          </Box>
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
          <Controller
            control={control}
            name="allowSelfCancel"
            render={({ field }) => (
              <FormControlLabel control={<Switch checked={!!field.value} onChange={(ev) => field.onChange(ev.target.checked)} data-testid="allow-self-cancel-switch" />} label={Locale.label("registrations.registrationSettingsEdit.allowSelfCancel")} />
            )}
          />
          <Controller
            control={control}
            name="allowPayLater"
            render={({ field }) => (
              <Box>
                <FormControlLabel control={<Switch checked={!!field.value} onChange={(ev) => field.onChange(ev.target.checked)} data-testid="allow-pay-later-switch" />} label={Locale.label("registrations.registrationSettingsEdit.allowPayLater")} />
                <Typography variant="body2" color="text.secondary">{Locale.label("registrations.registrationSettingsEdit.allowPayLaterHelper")}</Typography>
              </Box>
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
          <TextField select label={Locale.label("registrations.registrationSettingsEdit.registrationQuestions")} size="small" fullWidth value={watch("formId") || ""} {...register("formId")} slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}>
            <MenuItem value="">{Locale.label("registrations.registrationSettingsEdit.none")}</MenuItem>
            {forms.map((f) => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
          </TextField>
          <TextField
            label={Locale.label("registrations.registrationSettingsEdit.confirmationMessage", "Confirmation Message")}
            helperText={Locale.label("registrations.registrationSettingsEdit.confirmationMessageHelper", "Optional. Added to the registration confirmation email as plain text.")}
            size="small"
            fullWidth
            multiline
            minRows={3}
            slotProps={{ htmlInput: { maxLength: 2000 } }}
            data-testid="registration-confirmation-message"
            {...register("confirmationMessage")}
          />
          <Button variant="contained" onClick={handleSubmit(onValid)} disabled={saving}>
            {saving ? Locale.label("common.saving") : Locale.label("registrations.registrationSettingsEdit.saveSettings")}
          </Button>
        </Stack>

        <Box sx={{ mt: 2 }} key={listsVersion}>
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
      {showCopy && <CopyRegistrationSetupDialog event={event} onCopied={handleCopied} onClose={() => setShowCopy(false)} />}
    </CardWithHeader>
  );
};
