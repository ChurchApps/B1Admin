import React from "react";
import { type GenericSettingInterface } from "@churchapps/helpers";
import { ApiHelper, UniqueIdHelper, Locale } from "@churchapps/apphelper";
import { Alert, Box, Stack, Switch, Typography } from "@mui/material";

interface Props {
  churchId: string;
  saveTrigger: Date | null;
  onSaveComplete?: (ok: boolean) => void;
}

export const VolunteerSignupSettingsEdit: React.FC<Props> = (props) => {
  const [enabled, setEnabled] = React.useState(false);
  const [setting, setSetting] = React.useState<GenericSettingInterface | null>(null);
  const [error, setError] = React.useState("");

  const loadData = async () => {
    const allSettings: GenericSettingInterface[] = await ApiHelper.get("/settings", "MembershipApi");
    const found = allSettings.find((s) => s.keyName === "volunteerSignupNextOnly");
    if (found) {
      setSetting(found);
      setEnabled(found.value === "true");
    }
  };

  const save = async () => {
    try {
      if (enabled) {
        const s: GenericSettingInterface = setting === null ? { churchId: props.churchId, public: 1, keyName: "volunteerSignupNextOnly" } : setting;
        s.value = "true";
        await ApiHelper.post("/settings", [s], "MembershipApi");
      } else if (setting?.id) {
        await ApiHelper.delete("/settings/" + setting.id, "MembershipApi");
        setSetting(null);
      }
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
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.7 }}>
        {Locale.label("settings.volunteerSignupSettingsEdit.help")}
      </Typography>
      <Stack direction="row" alignItems="center">
        <Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} data-testid="volunteer-signup-next-only-switch" />
        <Typography variant="body2" sx={{ ml: 1, color: "text.secondary" }}>
          {Locale.label("settings.volunteerSignupSettingsEdit.nextOnly")}
        </Typography>
      </Stack>
    </Box>
  );
};
