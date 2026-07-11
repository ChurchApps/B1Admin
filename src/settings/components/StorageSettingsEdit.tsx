import React from "react";
import { FormControl, InputLabel, MenuItem, Select, Grid, Typography, type SelectChangeEvent } from "@mui/material";
import { ApiHelper, ErrorMessages, UniqueIdHelper, Locale } from "@churchapps/apphelper";

interface StorageProviderInterface {
  id?: string;
  churchId?: string;
  provider?: string;
  enabled?: boolean;
}

interface Props {
  churchId: string;
  saveTrigger: Date | null;
  onError?: (errors: string[]) => void;
  onSaveComplete?: (ok: boolean) => void;
}

export const StorageSettingsEdit: React.FC<Props> = (props) => {
  const [storageProvider, setStorageProvider] = React.useState<StorageProviderInterface | null>(null);
  const [provider, setProvider] = React.useState("");
  const [errors, setErrors] = React.useState<string[]>([]);
  const [status, setStatus] = React.useState<{ provider?: string; usedBytes?: number; quotaBytes?: number } | null>(null);

  const handleChange = (e: SelectChangeEvent) => {
    e.preventDefault();
    setProvider(e.target.value);
  };

  const save = async () => {
    try {
      if (provider === "") {
        if (!UniqueIdHelper.isMissing(storageProvider?.id)) await ApiHelper.delete("/storage/providers/" + storageProvider?.id, "ContentApi");
      } else {
        const sp: StorageProviderInterface = storageProvider === null ? { churchId: props.churchId } : { ...storageProvider };
        sp.provider = provider;
        sp.enabled = true;
        await ApiHelper.post("/storage/providers", [sp], "ContentApi");
      }
      setErrors([]);
      props.onSaveComplete?.(true);
    } catch (error: any) {
      const message = error?.message || Locale.label("settings.storageSettingsEdit.saveError");
      setErrors([message]);
      if (props.onError) props.onError([message]);
      props.onSaveComplete?.(false);
    }
  };

  const checkSave = () => {
    if (props.saveTrigger !== null) save();
  };

  const loadData = async () => {
    const providers = await ApiHelper.get("/storage/providers", "ContentApi");
    if (providers.length === 0) {
      setStorageProvider(null);
      setProvider("");
    } else {
      setStorageProvider(providers[0]);
      setProvider(providers[0].provider || "");
    }
    ApiHelper.get("/storage/status", "ContentApi").then(setStatus).catch(() => setStatus(null));
  };

  React.useEffect(() => {
    if (!UniqueIdHelper.isMissing(props.churchId)) loadData();
  }, [props.churchId]);
  React.useEffect(checkSave, [props.saveTrigger]);

  const gb = (bytes: number) => (bytes / 1073741824).toFixed(2);

  return (
    <>
      <ErrorMessages errors={errors} />
      <Grid container spacing={3} marginBottom={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <FormControl fullWidth>
            <InputLabel>{Locale.label("settings.storageSettingsEdit.provider")}</InputLabel>
            <Select name="provider" label={Locale.label("settings.storageSettingsEdit.provider")} value={provider || ""} onChange={handleChange}>
              <MenuItem value="">{Locale.label("settings.storageSettingsEdit.churchAppsFree")}</MenuItem>
              <MenuItem value="ministrystuff">{Locale.label("settings.storageSettingsEdit.ministryStuff")}</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        {provider === "ministrystuff" && (
          <Grid size={{ xs: 12 }}>
            <Typography variant="body2" color="textSecondary" component="div">
              {status?.provider === "ministrystuff" && status?.quotaBytes
                ? Locale.label("settings.storageSettingsEdit.usage").replace("{used}", gb(status.usedBytes || 0)).replace("{quota}", gb(status.quotaBytes))
                : Locale.label("settings.storageSettingsEdit.ministryStuffHelper")}{" "}
              <a href="https://ministrystuff.org" target="_blank" rel="noopener noreferrer">{Locale.label("settings.storageSettingsEdit.ministryStuffHelperLink")}</a>
            </Typography>
          </Grid>
        )}
      </Grid>
    </>
  );
};
