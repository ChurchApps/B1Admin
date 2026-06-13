import React from "react";
import { Alert, TextField, MenuItem, Grid } from "@mui/material";
import { useForm } from "react-hook-form";
import { type CampusInterface } from "./CampusInterface";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { FormCard } from "../../components/ui";

interface Props {
  campus: CampusInterface;
  updatedFunction: () => void;
}

type AnyRecord = Record<string, any>;

// IANA time zone list for the selector. Intl.supportedValuesOf is available in
// all evergreen browsers; fall back to a small common set if unavailable.
const getTimezones = (): string[] => {
  try {
    const anyIntl = Intl as any;
    if (typeof anyIntl.supportedValuesOf === "function") return anyIntl.supportedValuesOf("timeZone");
  } catch {
    /* ignore */
  }
  return ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Anchorage", "Pacific/Honolulu", "UTC"];
};

const TIMEZONES = getTimezones();

export const CampusEdit: React.FC<Props> = (props) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const { register, handleSubmit, reset, formState } = useForm<AnyRecord>({ defaultValues: { name: "" } });
  const e = formState.errors as any;
  const summaryErrors: string[] = [];
  if (e.name?.message) summaryErrors.push(e.name.message);

  const onValid = (values: AnyRecord) => {
    setIsSubmitting(true);
    const campus = { ...props.campus, ...values };
    ApiHelper.post("/campuses", [campus], "MembershipApi")
      .then(props.updatedFunction)
      .finally(() => { setIsSubmitting(false); });
  };

  const handleDelete = () => {
    if (window.confirm(Locale.label("settings.campusEdit.confirmDelete"))) {
      ApiHelper.delete("/campuses/" + props.campus.id, "MembershipApi").then(props.updatedFunction);
    }
  };

  React.useEffect(() => {
    reset({
      name: props.campus?.name || "",
      address1: props.campus?.address1 || "",
      address2: props.campus?.address2 || "",
      city: props.campus?.city || "",
      state: props.campus?.state || "",
      zip: props.campus?.zip || "",
      timezone: props.campus?.timezone || "",
      website: props.campus?.website || ""
    });
  }, [props.campus, reset]);

  if (props.campus === null) return null;

  return (
    <FormCard
      id="campusBox"
      data-testid="campus-box"
      onCancel={props.updatedFunction}
      onSave={handleSubmit(onValid)}
      onDelete={props.campus?.id ? handleDelete : undefined}
      title={props.campus.name || Locale.label("settings.campuses.campus")}
      icon="business"
      isSubmitting={isSubmitting}
      help="docs/b1-admin/settings/">
      {summaryErrors.length > 0 && <Alert severity="error" sx={{ mb: 2 }}>{summaryErrors.map((msg) => <div key={msg}>{msg}</div>)}</Alert>}
      <TextField fullWidth label={Locale.label("settings.campusEdit.name")} id="name" type="text" data-testid="campus-name-input" error={!!e.name} helperText={e.name?.message} {...register("name", { required: Locale.label("settings.campusEdit.validate.name") })} sx={{ mb: 1 }} />
      <Grid container spacing={1} sx={{ mb: 1 }}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField fullWidth label={Locale.label("person.address")} id="address1" type="text" {...register("address1")} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField fullWidth label={Locale.label("settings.campusEdit.address2")} id="address2" type="text" {...register("address2")} />
        </Grid>
      </Grid>
      <Grid container spacing={1} sx={{ mb: 1 }}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField fullWidth label={Locale.label("person.city")} id="city" type="text" {...register("city")} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <TextField fullWidth label={Locale.label("person.state")} id="state" type="text" {...register("state")} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <TextField fullWidth label={Locale.label("person.zip")} id="zip" type="text" {...register("zip")} />
        </Grid>
      </Grid>
      <TextField fullWidth select label={Locale.label("settings.campusEdit.timezone")} id="timezone" defaultValue="" {...register("timezone")} sx={{ mb: 1 }}>
        <MenuItem value="">{Locale.label("settings.campusEdit.noTimezone")}</MenuItem>
        {TIMEZONES.map((tz) => <MenuItem key={tz} value={tz}>{tz}</MenuItem>)}
      </TextField>
      <TextField fullWidth label={Locale.label("settings.campusEdit.website")} id="website" type="text" {...register("website")} />
    </FormCard>
  );
};
