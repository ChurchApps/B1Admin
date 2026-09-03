import React from "react";
import { FormControl, Grid, InputLabel, MenuItem, Select, TextField, Typography } from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { ApiHelper, Locale, UniqueIdHelper } from "@churchapps/apphelper";
import { type GenericSettingInterface } from "@churchapps/helpers";

interface Props {
  churchId: string;
  saveTrigger: Date | null;
}

type AnyRecord = Record<string, any>;

const KEYS = ["statementFormat", "statementRegistrationNumber", "statementOrgAddress", "statementSignatory", "statementCityOfIssue"] as const;

const registrationLabelKey = (format: string) => {
  switch (format) {
    case "canada": return "settings.statementFormat.craNumber";
    case "australia": return "settings.statementFormat.abn";
    case "newZealand": return "settings.statementFormat.nzNumber";
    default: return "settings.statementFormat.registrationNumber";
  }
};

export const StatementFormatSettingsEdit: React.FC<Props> = (props) => {
  "use no memo"; // compiler caches register() results, breaking RHF field re-registration after reset()
  const [existing, setExisting] = React.useState<Record<string, GenericSettingInterface>>({});

  const { register, reset, control, watch, getValues } = useForm<AnyRecord>({ defaultValues: { statementFormat: "", statementRegistrationNumber: "", statementOrgAddress: "", statementSignatory: "", statementCityOfIssue: "" } });
  const format = watch("statementFormat");

  const loadData = async () => {
    const allSettings: GenericSettingInterface[] = await ApiHelper.get("/settings", "MembershipApi");
    const found: Record<string, GenericSettingInterface> = {};
    const next: AnyRecord = { statementFormat: "", statementRegistrationNumber: "", statementOrgAddress: "", statementSignatory: "", statementCityOfIssue: "" };
    KEYS.forEach((key) => {
      const setting = allSettings.find((s) => s.keyName === key);
      if (setting) {
        found[key] = setting;
        next[key] = setting.value ?? "";
      }
    });
    setExisting(found);
    reset(next);
  };

  const save = () => {
    const values = getValues();
    const settings = KEYS.map((key) => {
      const setting: GenericSettingInterface = existing[key] || { churchId: props.churchId, public: 1, keyName: key };
      setting.value = values[key] || "";
      return setting;
    });
    ApiHelper.post("/settings", settings, "MembershipApi");
  };

  React.useEffect(() => {
    if (!UniqueIdHelper.isMissing(props.churchId)) loadData();
  }, [props.churchId]);

  React.useEffect(() => {
    if (props.saveTrigger !== null) save();
  }, [props.saveTrigger]);

  return (
    <Grid container spacing={2} marginTop={1}>
      <Grid size={{ xs: 12 }}>
        <Typography variant="body2" color="textSecondary">{Locale.label("settings.statementFormat.helper")}</Typography>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <Controller
          control={control}
          name="statementFormat"
          render={({ field }) => (
            <FormControl fullWidth>
              <InputLabel>{Locale.label("settings.statementFormat.format")}</InputLabel>
              <Select {...field} label={Locale.label("settings.statementFormat.format")} data-testid="statement-format-select">
                <MenuItem value="">{Locale.label("settings.statementFormat.standard")}</MenuItem>
                <MenuItem value="canada">{Locale.label("settings.statementFormat.canada")}</MenuItem>
                <MenuItem value="australia">{Locale.label("settings.statementFormat.australia")}</MenuItem>
                <MenuItem value="newZealand">{Locale.label("settings.statementFormat.newZealand")}</MenuItem>
              </Select>
            </FormControl>
          )}
        />
      </Grid>
      {format && (
        <>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth label={Locale.label(registrationLabelKey(format))} {...register("statementRegistrationNumber")} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth label={Locale.label("settings.statementFormat.orgAddress")} {...register("statementOrgAddress")} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth label={Locale.label("settings.statementFormat.signatory")} {...register("statementSignatory")} />
          </Grid>
          {format === "canada" && (
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label={Locale.label("settings.statementFormat.cityOfIssue")} {...register("statementCityOfIssue")} />
            </Grid>
          )}
        </>
      )}
    </Grid>
  );
};
