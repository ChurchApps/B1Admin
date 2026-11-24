import { useEffect, useState } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Stack,
  FormControlLabel,
  Switch,
  Chip,
  TextField,
  Checkbox,
  Box,
  Button,
  Divider
} from "@mui/material";
import { ExpandMore } from "@mui/icons-material";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { useTextingEnabled } from "../../hooks";

interface ReminderDefinition {
  id?: string;
  offsets?: string;
  sendLocalTime?: string;
  message?: string;
  channels?: string;
  recipientMode?: string;
  enabled?: boolean;
}

interface Props {
  planTypeId: string;
}

const OFFSET_PRESETS = [
  { minutes: 10080, label: () => Locale.label("plans.planTypeReminders.days7") },
  { minutes: 4320, label: () => Locale.label("plans.planTypeReminders.days3") },
  { minutes: 2880, label: () => Locale.label("plans.planTypeReminders.days2") },
  { minutes: 1440, label: () => Locale.label("plans.planTypeReminders.day1") },
  { minutes: 0, label: () => Locale.label("plans.planTypeReminders.dayOf") }
] as const;
const MAX_OFFSETS = 3;
const MAX_CUSTOM_DAYS = 14;
// The leader gap alert is a second definition on the same plan type, told apart by this mode.
const GAP_MODE = "leaderGaps";
const DEFAULT_GAP_DAYS = 3;
const PRESET_MINUTES: number[] = OFFSET_PRESETS.map((p) => p.minutes);

const customLabel = (m: number) => (m % 1440 === 0
  ? Locale.label("plans.planTypeReminders.daysN", "{count} days before").replace("{count}", String(m / 1440))
  : Locale.label("plans.planTypeReminders.minutesN", "{count} minutes before").replace("{count}", String(m)));

const parseOffsets = (csv: string): number[] =>
  csv ? csv.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n)) : [];

export const PlanTypeReminderEdit = ({ planTypeId }: Props) => {
  const [enabled, setEnabled] = useState(false);
  const [defId, setDefId] = useState<string | undefined>(undefined);
  const [offsets, setOffsets] = useState<number[]>([1440]);
  const [sendLocalTime, setSendLocalTime] = useState("09:00");
  const [message, setMessage] = useState("");
  const [channels, setChannels] = useState<string[]>(["push", "email"]);
  const [customDays, setCustomDays] = useState("");
  const [gapEnabled, setGapEnabled] = useState(false);
  const [gapDefId, setGapDefId] = useState<string | undefined>(undefined);
  const [gapDays, setGapDays] = useState(String(DEFAULT_GAP_DAYS));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const textingEnabled = useTextingEnabled();

  useEffect(() => {
    if (!planTypeId) return;
    ApiHelper.get("/reminders/scope/plan/" + planTypeId, "MessagingApi")
      .then((defs: ReminderDefinition[]) => {
        const gapDef = defs?.find((d) => d.recipientMode === GAP_MODE);
        if (gapDef) {
          setGapDefId(gapDef.id);
          setGapEnabled(gapDef.enabled !== false);
          const minutes = parseOffsets(gapDef.offsets || "")[0];
          if (minutes !== undefined) setGapDays(String(Math.round(minutes / 1440)));
        }
        const def = defs?.find((d) => d.recipientMode !== GAP_MODE);
        if (!def) return;
        setDefId(def.id);
        setEnabled(def.enabled !== false);
        setOffsets(parseOffsets(def.offsets || ""));
        setSendLocalTime((def.sendLocalTime || "09:00").slice(0, 5));
        setMessage(def.message || "");
        setChannels(def.channels ? def.channels.split(",").map((s) => s.trim()).filter(Boolean) : ["push", "email"]);
      })
      .catch(() => {});
  }, [planTypeId]);

  const toggleOffset = (m: number) =>
    setOffsets((p) => (p.includes(m) ? p.filter((x) => x !== m) : p.length >= MAX_OFFSETS ? p : [...p, m]));
  const customValue = customDays.trim() === "" ? NaN : Number(customDays);
  const customValid = Number.isInteger(customValue) && customValue >= 0 && customValue <= MAX_CUSTOM_DAYS;
  const canAddCustom = customValid && (offsets.length < MAX_OFFSETS || offsets.includes(customValue * 1440));
  const addCustom = () => {
    if (!canAddCustom) return;
    const m = customValue * 1440;
    if (!offsets.includes(m)) setOffsets((p) => (p.includes(m) || p.length >= MAX_OFFSETS ? p : [...p, m]));
    setCustomDays("");
    setSaved(false);
  };
  const gapDaysValue = gapDays.trim() === "" ? NaN : Number(gapDays);
  const gapDaysValid = Number.isInteger(gapDaysValue) && gapDaysValue >= 0 && gapDaysValue <= MAX_CUSTOM_DAYS;
  const toggleChannel = (c: string) =>
    setChannels((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setSaveFailed(false);
    try {
      if (!enabled && defId) {
        await ApiHelper.delete("/reminders/" + defId, "MessagingApi");
        setDefId(undefined);
      } else if (enabled) {
        const body = { offsets: offsets.join(","), sendLocalTime, message: message || undefined, channels, recipientMode: "assignments", enabled: true };
        const savedDef: ReminderDefinition = await ApiHelper.post("/reminders/scope/plan/" + planTypeId, body, "MessagingApi");
        if (savedDef?.id) setDefId(savedDef.id);
      }
      if (!gapEnabled && gapDefId) {
        await ApiHelper.delete("/reminders/" + gapDefId, "MessagingApi");
        setGapDefId(undefined);
      } else if (gapEnabled) {
        const body = { offsets: String(gapDaysValue * 1440), sendLocalTime, channels: ["push", "email"], recipientMode: GAP_MODE, enabled: true };
        const savedGap: ReminderDefinition = await ApiHelper.post("/reminders/scope/plan/" + planTypeId, body, "MessagingApi");
        if (savedGap?.id) setGapDefId(savedGap.id);
      }
      setSaved(true);
    } catch {
      setSaveFailed(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Typography variant="subtitle1" fontWeight={600}>{Locale.label("plans.planTypeReminders.title")}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={2}>
          <FormControlLabel
            control={<Switch checked={enabled} onChange={(e) => { setEnabled(e.target.checked); setSaved(false); }} data-testid="plan-type-reminder-enabled-toggle" />}
            label={Locale.label("plans.planTypeReminders.enable")}
          />
          {enabled && (
            <>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{Locale.label("plans.planTypeReminders.when")}</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {OFFSET_PRESETS.map((p) => (
                    <Chip
                      key={p.minutes}
                      label={p.label()}
                      clickable
                      color={offsets.includes(p.minutes) ? "primary" : "default"}
                      onClick={() => toggleOffset(p.minutes)}
                      disabled={!offsets.includes(p.minutes) && offsets.length >= MAX_OFFSETS}
                      data-testid={`plan-type-reminder-offset-${p.minutes}`}
                    />
                  ))}
                  {offsets.filter((m) => !PRESET_MINUTES.includes(m)).sort((a, b) => b - a).map((m) => (
                    <Chip
                      key={m}
                      label={customLabel(m)}
                      color="primary"
                      onDelete={() => toggleOffset(m)}
                      data-testid={`plan-type-reminder-offset-${m}`}
                    />
                  ))}
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5 }}>
                  <Typography variant="body2" color="text.secondary">{Locale.label("plans.planTypeReminders.other")}</Typography>
                  <TextField
                    type="number"
                    size="small"
                    value={customDays}
                    onChange={(e) => setCustomDays(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
                    inputProps={{ min: 0, max: MAX_CUSTOM_DAYS, "data-testid": "plan-type-reminder-custom-days", "aria-label": Locale.label("plans.planTypeReminders.daysBefore") }}
                    sx={{ width: 80 }}
                  />
                  <Typography variant="body2" color="text.secondary">{Locale.label("plans.planTypeReminders.daysBefore")}</Typography>
                  <Button size="small" onClick={addCustom} disabled={!canAddCustom} data-testid="plan-type-reminder-custom-add">{Locale.label("plans.planTypeReminders.add")}</Button>
                </Stack>
              </Box>
              <TextField
                label={Locale.label("plans.planTypeReminders.timeOfDay")}
                type="time"
                value={sendLocalTime}
                onChange={(e) => setSendLocalTime(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
                sx={{ maxWidth: 200 }}
                data-testid="plan-type-reminder-time-input"
              />
              <TextField
                label={Locale.label("plans.planTypeReminders.message")}
                multiline
                minRows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                helperText={Locale.label("plans.planTypeReminders.messageHint")}
                size="small"
                data-testid="plan-type-reminder-message-input"
              />
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>{Locale.label("plans.planTypeReminders.channels")}</Typography>
                <Stack direction="row">
                  <FormControlLabel control={<Checkbox checked={channels.includes("push")} onChange={() => toggleChannel("push")} size="small" data-testid="plan-type-reminder-channel-push" />} label="Push" />
                  <FormControlLabel control={<Checkbox checked={channels.includes("email")} onChange={() => toggleChannel("email")} size="small" data-testid="plan-type-reminder-channel-email" />} label="Email" />
                  {textingEnabled && <FormControlLabel control={<Checkbox checked={channels.includes("sms")} onChange={() => toggleChannel("sms")} size="small" data-testid="plan-type-reminder-channel-sms" />} label={Locale.label("plans.planTypeReminders.text")} />}
                </Stack>
                {textingEnabled && channels.includes("sms") && <Typography variant="caption" color="text.secondary">{Locale.label("plans.planTypeReminders.textHint")}</Typography>}
              </Box>
            </>
          )}
          <Divider />
          <Box>
            <FormControlLabel
              control={<Switch checked={gapEnabled} onChange={(e) => { setGapEnabled(e.target.checked); setSaved(false); }} data-testid="plan-type-gap-alert-toggle" />}
              label={Locale.label("plans.planTypeReminders.gapAlert", "Alert ministry leaders about scheduling gaps")}
            />
            <Typography variant="body2" color="text.secondary">
              {Locale.label("plans.planTypeReminders.gapAlertHint", "Leaders of the plan's ministry get one message listing unfilled positions and people who haven't confirmed, with a link to the plan. Nothing is sent when the plan is fully scheduled.")}
            </Typography>
            {gapEnabled && (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5 }}>
                <TextField
                  type="number"
                  size="small"
                  value={gapDays}
                  onChange={(e) => { setGapDays(e.target.value); setSaved(false); }}
                  error={!gapDaysValid}
                  inputProps={{ min: 0, max: MAX_CUSTOM_DAYS, "data-testid": "plan-type-gap-alert-days", "aria-label": Locale.label("plans.planTypeReminders.daysBefore") }}
                  sx={{ width: 80 }}
                />
                <Typography variant="body2" color="text.secondary">{Locale.label("plans.planTypeReminders.daysBefore")}</Typography>
              </Stack>
            )}
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Button variant="contained" size="small" onClick={handleSave} disabled={saving || (enabled && (offsets.length === 0 || channels.length === 0)) || (gapEnabled && !gapDaysValid)} data-testid="plan-type-reminder-save-button">
              {saving ? Locale.label("common.saving") : Locale.label("plans.planTypeReminders.save")}
            </Button>
            {saved && <Typography variant="body2" color="success.main">{Locale.label("plans.planTypeReminders.saved")}</Typography>}
            {saveFailed && <Typography variant="body2" color="error">{Locale.label("common.saveError")}</Typography>}
          </Box>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
};
