import React from "react";
import { Link } from "react-router-dom";
import { Box, Button, Icon, Stack, Switch, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { ApiHelper, Locale, UniqueIdHelper, UserHelper, Permissions } from "@churchapps/apphelper";
import type { GenericSettingInterface } from "@churchapps/helpers";
import { QRCodeCanvas } from "qrcode.react";
import { FormCard, TextAction } from "../components/ui";
import { EnvironmentHelper } from "../helpers";
import { useRequirePermission } from "../hooks";
import { KioskThemeEdit } from "./KioskThemeEdit";
import { MobileChrome } from "./components/MobileChrome";

type FieldMode = "off" | "optional" | "required";
type FieldKey = "email" | "phone" | "address" | "birthDate" | "gender" | "maritalStatus" | "grade";
type FieldModes = Record<FieldKey, FieldMode>;

const FIELD_KEYS: FieldKey[] = ["email", "phone", "address", "birthDate", "gender", "maritalStatus", "grade"];
const DEFAULT_FIELDS: FieldModes = { email: "optional", phone: "optional", address: "off", birthDate: "off", gender: "off", maritalStatus: "off", grade: "off" };

const parseFields = (raw?: string): FieldModes => {
  const result = { ...DEFAULT_FIELDS };
  try {
    const parsed = raw ? JSON.parse(raw) : {};
    FIELD_KEYS.forEach((k) => { if (["off", "optional", "required"].includes(parsed?.[k])) result[k] = parsed[k]; });
  } catch { /* fall back to defaults */ }
  return result;
};

export const CheckInPage: React.FC = () => {
  const [enabled, setEnabled] = React.useState(false);
  const [setting, setSetting] = React.useState<GenericSettingInterface | null>(null);
  const [fields, setFields] = React.useState<FieldModes>(DEFAULT_FIELDS);
  const [fieldsSetting, setFieldsSetting] = React.useState<GenericSettingInterface | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const churchId = UserHelper.currentUserChurch?.church?.id;
  const subDomain = UserHelper.currentUserChurch?.church?.subDomain || "";
  // Plain per-church link suffices for signage (serviceId ignored at guest-register endpoint)
  const registrationUrl = subDomain ? `${EnvironmentHelper.B1Url.replace("{subdomain}", subDomain)}/guest-register` : "";

  const loadData = React.useCallback(async () => {
    if (!churchId || UniqueIdHelper.isMissing(churchId)) return;
    const allSettings: GenericSettingInterface[] = await ApiHelper.get("/settings", "MembershipApi");
    const qrSetting = allSettings.find((s: GenericSettingInterface) => s.keyName === "enableQRGuestRegistration");
    if (qrSetting) {
      setSetting(qrSetting);
      setEnabled(qrSetting.value === "true");
    }
    const savedFields = allSettings.find((s: GenericSettingInterface) => s.keyName === "guestRegistrationFields");
    setFieldsSetting(savedFields || null);
    setFields(parseFields(savedFields?.value));
  }, [churchId]);

  React.useEffect(() => { loadData(); }, [loadData]);

  const denied = useRequirePermission(Permissions.membershipApi.settings.edit);
  if (denied) return denied;

  const handleSave = async () => {
    setSaving(true);
    try {
      const s: GenericSettingInterface = setting || { churchId, public: 1, keyName: "enableQRGuestRegistration" };
      s.value = enabled ? "true" : "false";
      const f: GenericSettingInterface = fieldsSetting || { churchId, public: 1, keyName: "guestRegistrationFields" };
      f.value = JSON.stringify(fields);
      await ApiHelper.post("/settings", [s, f], "MembershipApi");
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

  // Required only makes sense once a field is included; turning Include off clears it.
  const setInclude = (key: FieldKey, include: boolean) => setFields({ ...fields, [key]: include ? "optional" : "off" });
  const setRequired = (key: FieldKey, req: boolean) => setFields({ ...fields, [key]: req ? "required" : "optional" });

  return (
    <MobileChrome
      title={Locale.label("mobile.checkInPage.title")}
      subtitle={Locale.label("mobile.checkInPage.subtitle")}>
      <FormCard title={Locale.label("mobile.checkInPage.qrGuestRegistration")} icon="qr_code_2" onSave={handleSave} isSubmitting={saving} saveTestId="qr-guest-registration-save">
        <Typography variant="body2" color="text.secondary">{Locale.label("mobile.checkInPage.qrTooltip")}</Typography>
        <Stack direction="row" alignItems="center">
          <Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          <Typography variant="body2" sx={{ ml: 1, color: "text.secondary" }}>
            {enabled ? Locale.label("mobile.checkInPage.enabled") : Locale.label("mobile.checkInPage.disabled")}
          </Typography>
        </Stack>

        {enabled && (
          <Box data-testid="guest-registration-fields">
            <Typography variant="h3" sx={{ mb: 0.5 }}>{Locale.label("mobile.checkInPage.fields.title")}</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>{Locale.label("mobile.checkInPage.fields.description")}</Typography>
            <Table size="small" sx={{ maxWidth: 520 }}>
              <TableHead>
                <TableRow>
                  <TableCell>{Locale.label("mobile.checkInPage.fields.field")}</TableCell>
                  <TableCell align="center">{Locale.label("mobile.checkInPage.fields.include")}</TableCell>
                  <TableCell align="center">{Locale.label("mobile.checkInPage.fields.required")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {FIELD_KEYS.map((key) => {
                  const label = Locale.label("mobile.checkInPage.fields." + key);
                  return (
                    <TableRow key={key} data-testid={"guest-field-" + key}>
                      <TableCell>{label}</TableCell>
                      <TableCell align="center">
                        <Switch checked={fields[key] !== "off"} onChange={(e) => setInclude(key, e.target.checked)} slotProps={{ input: { "aria-label": Locale.label("mobile.checkInPage.fields.include") + " " + label } }} />
                      </TableCell>
                      <TableCell align="center">
                        <Switch checked={fields[key] === "required"} disabled={fields[key] === "off"} onChange={(e) => setRequired(key, e.target.checked)} slotProps={{ input: { "aria-label": Locale.label("mobile.checkInPage.fields.required") + " " + label } }} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        )}

        {enabled && registrationUrl && (
          <Box>
            <Typography variant="h3" sx={{ mb: 0.5 }}>{Locale.label("mobile.checkInPage.qrShareTitle")}</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>{Locale.label("mobile.checkInPage.qrShareDescription")}</Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={3} alignItems={{ xs: "center", sm: "flex-start" }}>
              <Box sx={{ p: 1.5, backgroundColor: "common.white", border: 1, borderColor: "divider", borderRadius: "var(--b1-radius-control)" }}>
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
          headerActions={<TextAction to="/mobile/checkin/labels" component={Link}>{Locale.label("mobile.checkInPage.manageLabels")}</TextAction>}
        >
          <Typography variant="body2" color="text.secondary">{Locale.label("attendance.labels.subtitle")}</Typography>
        </FormCard>
      )}

      <KioskThemeEdit />
    </MobileChrome>
  );
};
