import React from "react";
import { type GenericSettingInterface } from "@churchapps/helpers";
import { ApiHelper, UniqueIdHelper, Locale } from "@churchapps/apphelper";
import { Alert, Box, FormControl, Grid, InputLabel, MenuItem, Select, Typography } from "@mui/material";

interface Props {
  churchId: string;
  saveTrigger: Date | null;
  onSaveComplete?: (ok: boolean) => void;
}

export const CheckinSettingsEdit: React.FC<Props> = (props) => {
  const [ratioEnforcement, setRatioEnforcement] = React.useState("warn");
  const [setting, setSetting] = React.useState<GenericSettingInterface | null>(null);
  const [error, setError] = React.useState("");

  const loadData = async () => {
    const allSettings: GenericSettingInterface[] = await ApiHelper.get("/settings", "MembershipApi");
    const found = allSettings.filter((s) => s.keyName === "ratioEnforcement");
    if (found.length > 0) {
      setSetting(found[0]);
      if (found[0].value) setRatioEnforcement(found[0].value === "block" ? "block" : "warn");
    }
  };

  const save = async () => {
    const s: GenericSettingInterface = setting === null ? { churchId: props.churchId, public: 1, keyName: "ratioEnforcement" } : setting;
    s.value = ratioEnforcement;
    try {
      await ApiHelper.post("/settings", [s], "MembershipApi");
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

  React.useEffect(() => {
    if (!UniqueIdHelper.isMissing(props.churchId)) loadData();
  }, [props.churchId]);
  React.useEffect(checkSave, [props.saveTrigger]);

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.7 }}>
        {Locale.label("settings.checkinSettingsEdit.help")}
      </Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControl fullWidth size="small">
            <InputLabel id="ratioEnforcement">{Locale.label("settings.checkinSettingsEdit.ratioEnforcement")}</InputLabel>
            <Select labelId="ratioEnforcement" label={Locale.label("settings.checkinSettingsEdit.ratioEnforcement")} value={ratioEnforcement} onChange={(e) => setRatioEnforcement(e.target.value)} data-testid="ratio-enforcement-select">
              <MenuItem value="warn">{Locale.label("settings.checkinSettingsEdit.warn")}</MenuItem>
              <MenuItem value="block">{Locale.label("settings.checkinSettingsEdit.block")}</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    </Box>
  );
};
