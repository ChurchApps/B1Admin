import React from "react";
import { Box, Icon, Stack, Switch, Tooltip, Typography } from "@mui/material";
import { type GenericSettingInterface } from "@churchapps/helpers";
import { ApiHelper, UniqueIdHelper } from "@churchapps/apphelper";

interface Props {
  churchId: string;
  saveTrigger: Date | null;
}

export const GuestRegistrationSettingsEdit: React.FC<Props> = (props) => {
  const [enabled, setEnabled] = React.useState<boolean>(false);
  const [setting, setSetting] = React.useState<GenericSettingInterface>(null);

  const save = () => {
    const s: GenericSettingInterface = setting === null
      ? { churchId: props.churchId, public: 1, keyName: "enableQRGuestRegistration" }
      : setting;
    s.value = enabled ? "true" : "false";
    ApiHelper.post("/settings", [s], "MembershipApi");
  };

  const checkSave = () => {
    if (props.saveTrigger !== null) save();
  };

  const loadData = async () => {
    const allSettings = await ApiHelper.get("/settings", "MembershipApi");
    const qrSetting = allSettings.filter((d: GenericSettingInterface) => d.keyName === "enableQRGuestRegistration");
    if (qrSetting.length > 0) {
      setSetting(qrSetting[0]);
      setEnabled(qrSetting[0].value === "true");
    }
  };

  React.useEffect(() => {
    if (!UniqueIdHelper.isMissing(props.churchId)) loadData();
  }, [props.churchId]);
  React.useEffect(checkSave, [props.saveTrigger]);

  return (
    <Box sx={{ mb: 2.5, pb: 2.5, borderBottom: "1px solid", borderColor: "divider" }}>
      <Stack direction="row" alignItems="center" sx={{ mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>QR Guest Registration</Typography>
        <Tooltip title="Display a QR code on the check-in kiosk so guests can self-register on their phone" arrow>
          <Icon fontSize="small" sx={{ cursor: "pointer", color: "text.disabled", ml: 0.5 }}>help_outline</Icon>
        </Tooltip>
      </Stack>
      <Stack direction="row" alignItems="center">
        <Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        <Typography variant="body2" sx={{ ml: 1, color: "text.secondary" }}>
          {enabled ? "Enabled — QR code will appear on kiosk" : "Disabled"}
        </Typography>
      </Stack>
    </Box>
  );
};
