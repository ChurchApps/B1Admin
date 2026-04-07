import React from "react";
import { Box, Button, Icon, Stack, Switch, Tooltip, Typography } from "@mui/material";
import { ApiHelper, Locale, PageHeader, UniqueIdHelper, UserHelper, Permissions } from "@churchapps/apphelper";
import type { GenericSettingInterface } from "@churchapps/helpers";
import { PermissionDenied } from "../components";

export const CheckInPage: React.FC = () => {
  const [enabled, setEnabled] = React.useState(false);
  const [setting, setSetting] = React.useState<GenericSettingInterface | null>(null);
  const [saving, setSaving] = React.useState(false);

  const churchId = UserHelper.currentUserChurch?.church?.id;

  const loadData = React.useCallback(async () => {
    if (!churchId || UniqueIdHelper.isMissing(churchId)) return;
    const allSettings: GenericSettingInterface[] = await ApiHelper.get("/settings", "MembershipApi");
    const qrSetting = allSettings.find((s: GenericSettingInterface) => s.keyName === "enableQRGuestRegistration");
    if (qrSetting) {
      setSetting(qrSetting);
      setEnabled(qrSetting.value === "true");
    }
  }, [churchId]);

  React.useEffect(() => { loadData(); }, [loadData]);

  if (!UserHelper.checkAccess(Permissions.membershipApi.settings.edit)) return <PermissionDenied permissions={[Permissions.membershipApi.settings.edit]} />;

  const handleSave = async () => {
    setSaving(true);
    try {
      const s: GenericSettingInterface = setting || { churchId, public: 1, keyName: "enableQRGuestRegistration" };
      s.value = enabled ? "true" : "false";
      await ApiHelper.post("/settings", [s], "MembershipApi");
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title={Locale.label("mobile.checkInPage.title")} subtitle={Locale.label("mobile.checkInPage.subtitle")} />
      <Box sx={{ p: 3 }}>
        <Box sx={{ maxWidth: 600, p: 3, backgroundColor: "background.paper", borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
          <Stack direction="row" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{Locale.label("mobile.checkInPage.qrGuestRegistration")}</Typography>
            <Tooltip title={Locale.label("mobile.checkInPage.qrTooltip")} arrow>
              <Icon fontSize="small" sx={{ cursor: "pointer", color: "text.disabled", ml: 0.5 }}>help_outline</Icon>
            </Tooltip>
          </Stack>
          <Stack direction="row" alignItems="center" sx={{ mb: 3 }}>
            <Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            <Typography variant="body2" sx={{ ml: 1, color: "text.secondary" }}>
              {enabled ? Locale.label("mobile.checkInPage.enabled") : Locale.label("mobile.checkInPage.disabled")}
            </Typography>
          </Stack>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? Locale.label("common.saving") : Locale.label("common.save")}
          </Button>
        </Box>
      </Box>
    </>
  );
};
