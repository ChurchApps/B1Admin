import React from "react";
import { type GenericSettingInterface } from "@churchapps/helpers";
import { ApiHelper, UniqueIdHelper, Locale } from "@churchapps/apphelper";
import { Alert, Box, FormControl, Grid, InputLabel, MenuItem, Select, Stack, Switch, Typography } from "@mui/material";

interface Props {
  churchId: string;
  saveTrigger: Date | null;
  onSaveComplete?: (ok: boolean) => void;
}

const MONTHS = [
  "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"
];
const monthLabel = (m: string) => new Date(2000, Number(m) - 1, 1).toLocaleString(undefined, { month: "long" });
const daysInMonth = (m: string) => new Date(2001, Number(m), 0).getDate();

export const GradePromotionSettingsEdit: React.FC<Props> = (props) => {
  const [enabled, setEnabled] = React.useState(false);
  const [month, setMonth] = React.useState("08");
  const [day, setDay] = React.useState("01");
  const [setting, setSetting] = React.useState<GenericSettingInterface | null>(null);
  const [error, setError] = React.useState("");

  const loadData = async () => {
    const allSettings: GenericSettingInterface[] = await ApiHelper.get("/settings", "MembershipApi");
    const found = allSettings.filter((s) => s.keyName === "gradePromotionDate");
    if (found.length > 0) {
      setSetting(found[0]);
      const [m, d] = (found[0].value || "").split("-");
      if (m && d) {
        setEnabled(true);
        setMonth(m);
        setDay(d);
      }
    }
  };

  const save = async () => {
    try {
      if (enabled) {
        const s: GenericSettingInterface = setting === null ? { churchId: props.churchId, public: 1, keyName: "gradePromotionDate" } : setting;
        s.value = `${month}-${day}`;
        await ApiHelper.post("/settings", [s], "MembershipApi");
      } else if (setting?.id) {
        await ApiHelper.delete("/settings/" + setting.id, "MembershipApi");
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

  const dayCount = daysInMonth(month);
  const days = Array.from({ length: dayCount }, (_, i) => String(i + 1).padStart(2, "0"));

  const handleMonthChange = (m: string) => {
    setMonth(m);
    if (Number(day) > daysInMonth(m)) setDay(String(daysInMonth(m)).padStart(2, "0"));
  };

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.7 }}>
        {Locale.label("settings.gradePromotionSettingsEdit.help")}
      </Typography>
      <Stack direction="row" alignItems="center" sx={{ mb: 2 }}>
        <Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} data-testid="grade-promotion-enabled-switch" />
        <Typography variant="body2" sx={{ ml: 1, color: "text.secondary" }}>
          {enabled ? Locale.label("settings.gradePromotionSettingsEdit.enabled") : Locale.label("settings.gradePromotionSettingsEdit.disabled")}
        </Typography>
      </Stack>
      {enabled && (
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, sm: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="gradePromotionMonth">{Locale.label("settings.gradePromotionSettingsEdit.month")}</InputLabel>
              <Select labelId="gradePromotionMonth" label={Locale.label("settings.gradePromotionSettingsEdit.month")} value={month} onChange={(e) => handleMonthChange(e.target.value)} data-testid="grade-promotion-month-select">
                {MONTHS.map((m) => <MenuItem key={m} value={m}>{monthLabel(m)}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 6, sm: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="gradePromotionDay">{Locale.label("settings.gradePromotionSettingsEdit.day")}</InputLabel>
              <Select labelId="gradePromotionDay" label={Locale.label("settings.gradePromotionSettingsEdit.day")} value={day} onChange={(e) => setDay(e.target.value)} data-testid="grade-promotion-day-select">
                {days.map((d) => <MenuItem key={d} value={d}>{Number(d)}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};
