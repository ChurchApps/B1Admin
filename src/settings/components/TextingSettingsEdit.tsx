import React from "react";
import { FormControl, InputLabel, MenuItem, Select, TextField, Grid, Typography, type SelectChangeEvent } from "@mui/material";
import { ApiHelper, ErrorMessages, UniqueIdHelper } from "@churchapps/apphelper";
import { type TextingProviderInterface } from "@churchapps/helpers";

interface Props {
  churchId: string;
  saveTrigger: Date | null;
  onError?: (errors: string[]) => void;
}

export const TextingSettingsEdit: React.FC<Props> = (props) => {
  const [textingProvider, setTextingProvider] = React.useState<TextingProviderInterface>(null);
  const [provider, setProvider] = React.useState("");
  const [apiKey, setApiKey] = React.useState("");
  const [apiSecret, setApiSecret] = React.useState("");
  const [errors, setErrors] = React.useState<string[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | SelectChangeEvent) => {
    e.preventDefault();
    switch (e.target.name) {
      case "provider": setProvider(e.target.value); break;
      case "apiKey": setApiKey(e.target.value); break;
      case "apiSecret": setApiSecret(e.target.value); break;
    }
  };

  const getKeys = () => {
    if (provider === "") return null;
    if (provider === "TextInChurch" || provider === "Clearstream") {
      return (
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField fullWidth name="apiKey" label="API Key" value={apiKey} onChange={handleChange} type="password" />
        </Grid>
      );
    }
    // Default: show both key and secret (for future providers like Twilio)
    return (
      <>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField fullWidth name="apiKey" label="API Key" value={apiKey} onChange={handleChange} type="password" />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField fullWidth name="apiSecret" label="API Secret" value={apiSecret} onChange={handleChange} type="password" />
        </Grid>
      </>
    );
  };

  const save = async () => {
    try {
      if (provider === "") {
        if (!UniqueIdHelper.isMissing(textingProvider?.id)) await ApiHelper.delete("/texting/providers/" + textingProvider.id, "MessagingApi");
      } else {
        const tp: TextingProviderInterface = textingProvider === null ? { churchId: props.churchId } : { ...textingProvider };
        tp.provider = provider;
        if (apiKey !== "" && apiKey !== "********") tp.apiKey = apiKey;
        if (apiSecret !== "" && apiSecret !== "********") tp.apiSecret = apiSecret;
        tp.enabled = true;
        await ApiHelper.post("/texting/providers", [tp], "MessagingApi");
      }
    } catch (error: any) {
      let message = "Error saving texting settings.";
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
            <InputLabel>Provider</InputLabel>
            <Select name="provider" label="Provider" value={provider || ""} onChange={handleChange}>
              <MenuItem value="">None</MenuItem>
              <MenuItem value="Clearstream">Clearstream</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        {provider === "Clearstream" && (
          <Grid size={{ xs: 12 }}>
            <Typography variant="body2" color="textSecondary" component="div">
              Create an API Key in your <a href="https://app.clearstream.io/settings/api/keys" target="_blank" rel="noopener noreferrer">Clearstream Account Settings</a> under API Keys.
            </Typography>
          </Grid>
        )}
        {provider === "TextInChurch" && (
          <Grid size={{ xs: 12 }}>
            <Typography variant="body2" color="textSecondary" component="div">
              Visit <a href="https://textinchurch.com/support" target="_blank" rel="noopener noreferrer">Text In Church Support</a> to request developer API access. Once approved, create an API Key in your Account Settings &gt; Developer API section.
            </Typography>
          </Grid>
        )}
        {getKeys()}
      </Grid>
    </>
  );
};
