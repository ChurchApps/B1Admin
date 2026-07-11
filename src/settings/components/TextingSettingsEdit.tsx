import React from "react";
import { FormControl, InputLabel, MenuItem, Select, TextField, Grid, Typography, type SelectChangeEvent } from "@mui/material";
import { ApiHelper, ErrorMessages, UniqueIdHelper, Locale } from "@churchapps/apphelper";
import { type TextingProviderInterface } from "@churchapps/helpers";
import { MINISTRYSTUFF_ENABLED } from "../../helpers/MinistryStuffFlag";

interface Props {
  churchId: string;
  saveTrigger: Date | null;
  onError?: (errors: string[]) => void;
  onSaveComplete?: (ok: boolean) => void;
}

export const TextingSettingsEdit: React.FC<Props> = (props) => {
  const [textingProvider, setTextingProvider] = React.useState<TextingProviderInterface | null>(null);
  const [provider, setProvider] = React.useState("");
  const [apiKey, setApiKey] = React.useState("");
  const [apiSecret, setApiSecret] = React.useState("");
  const [errors, setErrors] = React.useState<string[]>([]);
  const [credits, setCredits] = React.useState<{ supported?: boolean; hasCredits?: boolean; remaining?: number } | null>(null);

  React.useEffect(() => {
    if (provider === "MinistryStuff" && textingProvider?.provider === "MinistryStuff") {
      ApiHelper.get("/texting/credits", "MessagingApi").then(setCredits).catch(() => setCredits(null));
    } else setCredits(null);
  }, [provider, textingProvider]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | SelectChangeEvent) => {
    e.preventDefault();
    switch (e.target.name) {
      case "provider": setProvider(e.target.value); break;
      case "apiKey": setApiKey(e.target.value); break;
      case "apiSecret": setApiSecret(e.target.value); break;
    }
  };

  const getKeys = () => {
    if (provider === "" || provider === "MinistryStuff") return null;
    if (provider === "TextInChurch" || provider === "Clearstream") {
      return (
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField fullWidth name="apiKey" label={Locale.label("settings.textingSettingsEdit.apiKey")} value={apiKey} onChange={handleChange} type="password" />
        </Grid>
      );
    }
    // Default: show both key and secret (for future providers like Twilio)
    return (
      <>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField fullWidth name="apiKey" label={Locale.label("settings.textingSettingsEdit.apiKey")} value={apiKey} onChange={handleChange} type="password" />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField fullWidth name="apiSecret" label={Locale.label("settings.textingSettingsEdit.apiSecret")} value={apiSecret} onChange={handleChange} type="password" />
        </Grid>
      </>
    );
  };

  const save = async () => {
    try {
      if (provider === "") {
        if (!UniqueIdHelper.isMissing(textingProvider?.id)) await ApiHelper.delete("/texting/providers/" + textingProvider?.id, "MessagingApi");
      } else {
        const tp: TextingProviderInterface = textingProvider === null ? { churchId: props.churchId } : { ...textingProvider };
        tp.provider = provider;
        if (apiKey !== "" && apiKey !== "********") tp.apiKey = apiKey;
        if (apiSecret !== "" && apiSecret !== "********") tp.apiSecret = apiSecret;
        tp.enabled = true;
        await ApiHelper.post("/texting/providers", [tp], "MessagingApi");
      }
      setErrors([]);
      props.onSaveComplete?.(true);
    } catch (error: any) {
      let message = Locale.label("settings.textingSettingsEdit.saveError");
      if (error?.message) {
        try {
          const parsed = JSON.parse(error.message);
          message = parsed.message || error.message;
        } catch {
          message = error.message;
        }
      }
      setErrors([message]);
      if (props.onError) props.onError([message]);
      props.onSaveComplete?.(false);
    }
  };

  const checkSave = () => {
    if (props.saveTrigger !== null) save();
  };

  const loadData = async () => {
    const providers = await ApiHelper.get("/texting/providers", "MessagingApi");
    if (providers.length === 0) {
      setTextingProvider(null);
      setProvider("");
      setApiKey("");
      setApiSecret("");
    } else {
      setTextingProvider(providers[0]);
      setProvider(providers[0].provider || "");
      setApiKey(providers[0].apiKey || "");
      setApiSecret(providers[0].apiSecret || "");
    }
  };

  React.useEffect(() => {
    if (!UniqueIdHelper.isMissing(props.churchId)) loadData();
  }, [props.churchId]);
  React.useEffect(checkSave, [props.saveTrigger]);

  return (
    <>
      <ErrorMessages errors={errors} />
      <Grid container spacing={3} marginBottom={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <FormControl fullWidth>
            <InputLabel>{Locale.label("settings.textingSettingsEdit.provider")}</InputLabel>
            <Select name="provider" label={Locale.label("settings.textingSettingsEdit.provider")} value={provider || ""} onChange={handleChange}>
              <MenuItem value="">{Locale.label("settings.textingSettingsEdit.none")}</MenuItem>
              {MINISTRYSTUFF_ENABLED && <MenuItem value="MinistryStuff">{Locale.label("settings.textingSettingsEdit.ministryStuff")}</MenuItem>}
              <MenuItem value="Clearstream">{Locale.label("settings.textingSettingsEdit.clearstream")}</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        {provider === "Clearstream" && (
          <Grid size={{ xs: 12 }}>
            <Typography variant="body2" color="textSecondary" component="div">
              {Locale.label("settings.textingSettingsEdit.clearstreamHelper")} <a href="https://app.clearstream.io/settings/api/keys" target="_blank" rel="noopener noreferrer">{Locale.label("settings.textingSettingsEdit.clearstreamHelperLink")}</a> {Locale.label("settings.textingSettingsEdit.clearstreamHelperSuffix")}
            </Typography>
          </Grid>
        )}
        {provider === "MinistryStuff" && (
          <Grid size={{ xs: 12 }}>
            <Typography variant="body2" color="textSecondary" component="div">
              {credits?.supported && credits?.hasCredits
                ? Locale.label("settings.textingSettingsEdit.ministryStuffActive").replace("{}", String(credits.remaining ?? 0))
                : Locale.label("settings.textingSettingsEdit.ministryStuffHelper")}{" "}
              <a href="https://ministrystuff.org" target="_blank" rel="noopener noreferrer">{Locale.label("settings.textingSettingsEdit.ministryStuffHelperLink")}</a>
            </Typography>
          </Grid>
        )}
        {provider === "TextInChurch" && (
          <Grid size={{ xs: 12 }}>
            <Typography variant="body2" color="textSecondary" component="div">
              {Locale.label("settings.textingSettingsEdit.textInChurchHelper")} <a href="https://textinchurch.com/support" target="_blank" rel="noopener noreferrer">{Locale.label("settings.textingSettingsEdit.textInChurchHelperLink")}</a> {Locale.label("settings.textingSettingsEdit.textInChurchHelperSuffix")}
            </Typography>
          </Grid>
        )}
        {getKeys()}
      </Grid>
    </>
  );
};
