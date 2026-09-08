import React from "react";
import { useForm } from "react-hook-form";
import { type ChurchInterface } from "@churchapps/helpers";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { FormCard } from "../../components/ui";
import { Box, Grid, TextField, MenuItem } from "@mui/material";
import { verbSx, dlRowSx, SectionLabel } from "../plated";

type AnyRecord = Record<string, any>;

const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const dayLabel = (day: number) => Locale.label("common.days." + DAY_KEYS[day]);

interface Props {
  church: ChurchInterface;
  onSaved: () => void;
}

const Fact: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
  <Box component="dl" sx={dlRowSx}>
    <Box component="dt">{label}</Box>
    <Box component="dd">{value || "—"}</Box>
  </Box>
);

export const ChurchInfoSection: React.FC<Props> = ({ church, onSaved }) => {
  "use no memo";
  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const { register, handleSubmit, reset, formState } = useForm<AnyRecord>({ defaultValues: { ...church, churchName: church?.name || "" } });
  const fe = formState.errors as any;

  React.useEffect(() => { reset({ ...church, churchName: church?.name || "" }); }, [church, reset]);

  const onValid = async (values: AnyRecord) => {
    setSaving(true);
    const { churchName, ...rest } = values;
    const updated: ChurchInterface = { ...church, ...rest, name: churchName };
    const resp = await ApiHelper.post("/churches", [updated], "MembershipApi");
    setSaving(false);
    if (resp?.errors !== undefined) return;
    setEditing(false);
    onSaved();
  };

  if (editing) {
    return (
      <FormCard title={Locale.label("settings.churchSettingsEdit.churchInfo")} icon="business" onSave={handleSubmit(onValid)} onCancel={() => { reset(); setEditing(false); }} isSubmitting={saving}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth label={Locale.label("settings.churchSettingsEdit.churchName")} id="churchName" data-testid="church-name-input" error={!!fe.churchName} helperText={fe.churchName?.message} {...register("churchName", { required: Locale.label("settings.churchSettingsEdit.noNameMsg") })} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth label={Locale.label("settings.churchSettingsEdit.subdom")} id="subDomain" data-testid="subdomain-input" error={!!fe.subDomain} helperText={fe.subDomain?.message} {...register("subDomain", { required: Locale.label("settings.churchSettingsEdit.noSubMsg") })} />
          </Grid>
        </Grid>

        <SectionLabel>{Locale.label("person.address")}</SectionLabel>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth label={Locale.label("settings.churchSettingsEdit.address1")} id="address1" data-testid="address1-input" {...register("address1")} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth label={Locale.label("settings.churchSettingsEdit.address2")} id="address2" {...register("address2")} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth label={Locale.label("person.city")} id="city" {...register("city")} />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField fullWidth label={Locale.label("person.state")} id="state" {...register("state")} />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField fullWidth label={Locale.label("person.zip")} id="zip" {...register("zip")} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth label={Locale.label("person.country")} id="country" {...register("country")} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth select label={Locale.label("settings.churchSettingsEdit.firstDayOfWeek") || "First Day of Week"} id="firstDayOfWeek" {...register("firstDayOfWeek", { valueAsNumber: true })} defaultValue={(church as any)?.firstDayOfWeek || 0}>
              {DAY_KEYS.map((key, i) => <MenuItem key={key} value={i}>{dayLabel(i)}</MenuItem>)}
            </TextField>
          </Grid>
        </Grid>
      </FormCard>
    );
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", mb: 1 }}>
        <SectionLabel sx={{ mt: 0 }}>{Locale.label("settings.churchSettingsEdit.churchInfo")}</SectionLabel>
        <Box component="button" type="button" data-testid="small-button-edit" onClick={() => setEditing(true)} sx={verbSx}>{Locale.label("common.edit")}</Box>
      </Box>
      <Fact label={Locale.label("settings.churchSettingsEdit.churchName")} value={church?.name} />
      <Fact label={Locale.label("settings.churchSettingsEdit.subdom")} value={church?.subDomain ? `${church.subDomain}.b1.church` : ""} />
      <SectionLabel>{Locale.label("person.address")}</SectionLabel>
      <Fact label={Locale.label("settings.churchSettingsEdit.address1")} value={church?.address1} />
      <Fact label={Locale.label("settings.churchSettingsEdit.address2")} value={church?.address2} />
      <Fact label={Locale.label("person.city")} value={church?.city} />
      <Fact label={Locale.label("person.state")} value={church?.state} />
      <Fact label={Locale.label("person.zip")} value={church?.zip} />
      <Fact label={Locale.label("person.country")} value={church?.country} />
      <Fact label={Locale.label("settings.churchSettingsEdit.firstDayOfWeek") || "First Day of Week"} value={dayLabel((church as any)?.firstDayOfWeek || 0)} />
    </Box>
  );
};
