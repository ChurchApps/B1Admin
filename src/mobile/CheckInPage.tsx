import React from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Icon, Stack, Switch, TextField, Typography } from "@mui/material";
import { ApiHelper, Locale, PageHeader, UniqueIdHelper, UserHelper, Permissions } from "@churchapps/apphelper";
import type { GenericSettingInterface } from "@churchapps/helpers";
import { QRCodeCanvas } from "qrcode.react";
import { PermissionDenied } from "../components";
import { FormCard } from "../components/ui";
import { EnvironmentHelper } from "../helpers";
import { KioskThemeEdit } from "./KioskThemeEdit";

export const CheckInPage: React.FC = () => {
  const navigate = useNavigate();
  const [enabled, setEnabled] = React.useState(false);
  const [setting, setSetting] = React.useState<GenericSettingInterface | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const churchId = UserHelper.currentUserChurch?.church?.id;
  const subDomain = UserHelper.currentUserChurch?.church?.subDomain || "";
  // The kiosk QR points guests at the public self-registration page; serviceId from the
  // kiosk is ignored there, so a plain per-church link is enough for flyers/signage.
  const registrationUrl = subDomain ? `${EnvironmentHelper.B1Url.replace("{subdomain}", subDomain)}/guest-register` : "";

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

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(registrationUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `checkin-qr-${subDomain}.png`;
    link.click();
  };

  const dirty = enabled !== (setting?.value === "true");

  return (
    <>
      <PageHeader title={Locale.label("mobile.checkInPage.title")} subtitle={Locale.label("mobile.checkInPage.subtitle")} />
      <Box sx={{ p: 3 }}>
        <FormCard title={Locale.label("mobile.checkInPage.qrGuestRegistration")} icon="qr_code_2" onSave={handleSave} isSubmitting={saving}>
          <Typography variant="body2" color="text.secondary">{Locale.label("mobile.checkInPage.qrTooltip")}</Typography>
          <Stack direction="row" alignItems="center">
            <Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            <Typography variant="body2" sx={{ ml: 1, color: "text.secondary" }}>
              {enabled ? Locale.label("mobile.checkInPage.enabled") : Locale.label("mobile.checkInPage.disabled")}
            </Typography>
          </Stack>

          {enabled && registrationUrl && (
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>{Locale.label("mobile.checkInPage.qrShareTitle")}</Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>{Locale.label("mobile.checkInPage.qrShareDescription")}</Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={3} alignItems={{ xs: "center", sm: "flex-start" }}>
                <Box sx={{ p: 1.5, backgroundColor: "#fff", border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                  <QRCodeCanvas ref={canvasRef} value={registrationUrl} size={1024} marginSize={2} style={{ width: 170, height: 170, display: "block" }} />
                </Box>
                <Stack spacing={1.5} sx={{ flex: 1, minWidth: 0, width: "100%" }}>
                  <TextField
                    label={Locale.label("mobile.checkInPage.registrationUrl")}
                    value={registrationUrl}
                    size="small"
                    fullWidth
                    slotProps={{ input: { readOnly: true } }}
                    onFocus={(e) => e.target.select()}
                  />
                  <Stack direction="row" spacing={1}>
                    <Button variant="outlined" startIcon={<Icon>{copied ? "check" : "content_copy"}</Icon>} onClick={handleCopyLink}>
                      {copied ? Locale.label("mobile.checkInPage.linkCopied") : Locale.label("mobile.checkInPage.copyLink")}
                    </Button>
                    <Button variant="outlined" startIcon={<Icon>download</Icon>} onClick={handleDownload}>
                      {Locale.label("mobile.checkInPage.downloadQr")}
                    </Button>
                  </Stack>
                  {dirty && (
                    <Typography variant="caption" sx={{ color: "warning.main" }}>{Locale.label("mobile.checkInPage.saveToActivate")}</Typography>
                  )}
                </Stack>
              </Stack>
            </Box>
          )}
        </FormCard>

        {UserHelper.checkAccess(Permissions.attendanceApi.attendance.edit) && (
          <FormCard
            title={Locale.label("attendance.labels.title")}
            icon="label"
            headerActions={
              <Button variant="outlined" endIcon={<Icon>arrow_forward</Icon>} onClick={() => navigate("/mobile/checkin/labels")}>
                {Locale.label("mobile.checkInPage.manageLabels")}
              </Button>
            }
          >
            <Typography variant="body2" color="text.secondary">{Locale.label("attendance.labels.subtitle")}</Typography>
          </FormCard>
        )}

        <KioskThemeEdit />
      </Box>
    </>
  );
};
