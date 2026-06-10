import React from "react";
import { useForm } from "react-hook-form";
import { type ChurchInterface } from "@churchapps/helpers";
import { ApiHelper, DisplayBox, Locale } from "@churchapps/apphelper";
import { FormCard } from "../../components/ui";
import { Box, Divider, Grid, Stack, TextField, Typography } from "@mui/material";

type AnyRecord = Record<string, any>;

interface Props {
  church: ChurchInterface;
  onSaved: () => void;
}

const DisplayRow: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
  <>
    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ py: 1.5 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 500, textAlign: "right" }}>{value || "—"}</Typography>
    </Stack>
    <Divider />
  </>
);

export const ChurchInfoSection: React.FC<Props> = ({ church, onSaved }) => {
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

        <Typography variant="subtitle2" sx={{ mt: 3, mb: 2, fontWeight: 600, color: "text.secondary" }}>
          {Locale.label("person.address")}
        </Typography>
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
        </Grid>
      </FormCard>
    );
  }

  return (
    <DisplayBox headerText={Locale.label("settings.churchSettingsEdit.churchInfo")} headerIcon="business" editFunction={() => setEditing(true)}>
      <Box>
        <DisplayRow label={Locale.label("settings.churchSettingsEdit.churchName")} value={church?.name} />
        <DisplayRow label={Locale.label("settings.churchSettingsEdit.subdom")} value={church?.subDomain ? `${church.subDomain}.b1.church` : ""} />
      </Box>
      <Typography variant="subtitle2" sx={{ mt: 2.5, mb: 0.5, fontWeight: 600, color: "text.secondary" }}>
        {Locale.label("person.address")}
      </Typography>
      <Box>
        <DisplayRow label={Locale.label("settings.churchSettingsEdit.address1")} value={church?.address1} />
        <DisplayRow label={Locale.label("settings.churchSettingsEdit.address2")} value={church?.address2} />
        <DisplayRow label={Locale.label("person.city")} value={church?.city} />
        <DisplayRow label={Locale.label("person.state")} value={church?.state} />
        <DisplayRow label={Locale.label("person.zip")} value={church?.zip} />
        <DisplayRow label={Locale.label("person.country")} value={church?.country} />
      </Box>
    </DisplayBox>
  );
};
