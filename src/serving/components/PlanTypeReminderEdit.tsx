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
  Button
} from "@mui/material";
import { ExpandMore } from "@mui/icons-material";
import { ApiHelper, Locale } from "@churchapps/apphelper";

interface ReminderDefinition {
  id?: string;
  offsets?: string;
  sendLocalTime?: string;
  message?: string;
  channels?: string;
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

const parseOffsets = (csv: string): number[] =>
  csv ? csv.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n)) : [];

export const PlanTypeReminderEdit = ({ planTypeId }: Props) => {
  const [enabled, setEnabled] = useState(false);
  const [defId, setDefId] = useState<string | undefined>(undefined);
  const [offsets, setOffsets] = useState<number[]>([1440]);
  const [sendLocalTime, setSendLocalTime] = useState("09:00");
  const [message, setMessage] = useState("");
  const [channels, setChannels] = useState<string[]>(["push", "email"]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!planTypeId) return;
    ApiHelper.get("/reminders/scope/plan/" + planTypeId, "MessagingApi")
      .then((defs: ReminderDefinition[]) => {
        const def = defs?.[0];
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
  const toggleChannel = (c: string) =>
    setChannels((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      if (!enabled && defId) {
        await ApiHelper.delete("/reminders/" + defId, "MessagingApi");
        setDefId(undefined);
      } else if (enabled) {
        const body = { offsets: offsets.join(","), sendLocalTime, message: message || undefined, channels, recipientMode: "assignments", enabled: true };
        const savedDef: ReminderDefinition = await ApiHelper.post("/reminders/scope/plan/" + planTypeId, body, "MessagingApi");
        if (savedDef?.id) setDefId(savedDef.id);
      }
      setSaved(true);
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
                </Stack>
              </Box>
            </>
          )}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Button variant="contained" size="small" onClick={handleSave} disabled={saving || (enabled && offsets.length === 0)} data-testid="plan-type-reminder-save-button">
              {saving ? Locale.label("common.saving") : Locale.label("plans.planTypeReminders.save")}
            </Button>
            {saved && <Typography variant="body2" color="success.main">{Locale.label("plans.planTypeReminders.saved")}</Typography>}
          </Box>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
};
