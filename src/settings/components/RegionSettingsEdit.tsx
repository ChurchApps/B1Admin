import React, { useEffect, useState } from "react";
import { Alert, Box, FormControl, FormHelperText, InputLabel, MenuItem, Select, Typography } from "@mui/material";
import { UniqueIdHelper, ApiHelper, Locale, DateHelper } from "@churchapps/apphelper";
import { type GenericSettingInterface } from "@churchapps/helpers";

export const REGIONS = [
  "en-US", "en-GB", "en-AU", "en-CA", "de-DE", "fr-FR", "es-ES", "es-MX", "pt-BR", "nl-NL"
];

const SAMPLE_DATE = new Date(2026, 8, 28);

export const regionName = (region: string) => {
  try {
    return new Intl.DisplayNames([navigator.language || "en", "en"], { type: "language", languageDisplay: "standard" }).of(region) || region;
  } catch { return region; }
};

export const regionSample = (region: string) => new Intl.DateTimeFormat(region, { dateStyle: "medium" }).format(SAMPLE_DATE) + " · " + new Intl.DateTimeFormat(region, { year: "numeric", month: "numeric", day: "numeric" }).format(SAMPLE_DATE);

interface Props {
  churchId: string;
  saveTrigger: Date | null;
  onSaveComplete?: (ok: boolean) => void;
}

export const RegionSettingsEdit: React.FC<Props> = (props) => {
  const [value, setValue] = useState<string>("en-US");
  const [setting, setSetting] = useState<GenericSettingInterface | null>(null);
  const [error, setError] = useState("");

  const save = async () => {
    const s: GenericSettingInterface = setting === null ? { churchId: props.churchId, public: 1, keyName: "region" } : setting;
    s.value = value;
    s.public = 1;
    try {
      await ApiHelper.post("/settings", [s], "MembershipApi");
      DateHelper.setLocale(value);
      setError("");
      props.onSaveComplete?.(true);
    } catch (e: any) {
      setError(e?.message || Locale.label("common.saveError"));
      props.onSaveComplete?.(false);
    }
  };

  const checkSave = () => {
    if (props.saveTrigger !== null) save();
  };

  const loadData = async () => {
    const settings = await ApiHelper.get("/settings", "MembershipApi");
    const regionSetting = settings.filter((c: GenericSettingInterface) => c.keyName === "region");
    if (regionSetting.length > 0) {
      setSetting(regionSetting[0]);
      setValue(DateHelper.normalizeLocale(regionSetting[0].value));
    }
  };

  useEffect(() => {
    if (!UniqueIdHelper.isMissing(props.churchId)) loadData();
  }, [props.churchId]);
  useEffect(checkSave, [props.saveTrigger]);

  const options = REGIONS.includes(value) ? REGIONS : [...REGIONS, value];

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
      <FormControl fullWidth size="small">
        <InputLabel id="region-select-label">{Locale.label("settings.regionSettingsEdit.region")}</InputLabel>
        <Select
          labelId="region-select-label"
          label={Locale.label("settings.regionSettingsEdit.region")}
          name="region"
          value={value}
          onChange={(e) => setValue(e.target.value as string)}
          inputProps={{ "data-testid": "region-select-input" }}
          data-testid="region-select"
        >
          {options.map((r) => (
            <MenuItem key={r} value={r} data-testid={"region-option-" + r}>
              <Box>
                <Typography variant="body2">{regionName(r)}</Typography>
                <Typography variant="caption" color="text.secondary">{regionSample(r)}</Typography>
              </Box>
            </MenuItem>
          ))}
        </Select>
        <FormHelperText>{Locale.label("settings.regionSettingsEdit.helperText")}</FormHelperText>
      </FormControl>
    </Box>
  );
};
