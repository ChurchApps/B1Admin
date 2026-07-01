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
  Alert
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
  taskId: string;
  dueDate?: Date | string | null;
}

const OFFSET_PRESETS = [
  { key: "days7", minutes: 10080 },
  { key: "days3", minutes: 4320 },
  { key: "day1", minutes: 1440 },
  { key: "dayOf", minutes: 0 }
] as const;
const MAX_OFFSETS = 3;

const parseOffsets = (csv: string): number[] =>
  csv ? csv.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n)) : [];

export const TaskReminderEdit = ({ taskId, dueDate }: Props) => {
  const [enabled, setEnabled] = useState(false);
  const [defId, setDefId] = useState<string | undefined>(undefined);
  const [offsets, setOffsets] = useState<number[]>([1440]);
  const [sendLocalTime, setSendLocalTime] = useState("09:00");
  const [message, setMessage] = useState("");
  const [channels, setChannels] = useState<string[]>(["push", "email"]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!taskId) return;
    ApiHelper.get("/reminders/task/" + taskId, "MessagingApi")
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
  }, [taskId]);

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
        const body = { offsets: offsets.join(","), sendLocalTime, message: message || undefined, channels, enabled: true };
        const savedDef: ReminderDefinition = await ApiHelper.post("/reminders/task/" + taskId, body, "MessagingApi");
        if (savedDef?.id) setDefId(savedDef.id);
      }
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const l = (k: string) => Locale.label("tasks.reminders." + k);

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Typography variant="subtitle1" fontWeight={600}>{l("title")}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={2}>
          {enabled && !dueDate && <Alert severity="warning">{l("noDueDate")}</Alert>}
          <FormControlLabel
            control={<Switch checked={enabled} onChange={(e) => { setEnabled(e.target.checked); setSaved(false); }} data-testid="task-reminder-enabled-toggle" />}
            label={l("enable")}
          />
          {enabled && (
            <>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{l("when")}</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {OFFSET_PRESETS.map((p) => (
                    <Chip
                      key={p.minutes}
                      label={l(p.key)}
                      clickable
                      color={offsets.includes(p.minutes) ? "primary" : "default"}
                      onClick={() => toggleOffset(p.minutes)}
                      disabled={!offsets.includes(p.minutes) && offsets.length >= MAX_OFFSETS}
                    />
                  ))}
                </Stack>
              </Box>
              <TextField
                label={l("timeOfDay")}
                type="time"
                value={sendLocalTime}
                onChange={(e) => setSendLocalTime(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
                sx={{ maxWidth: 200 }}
              />
              <TextField
                label={l("message")}
                multiline
                minRows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                helperText={l("messageHint")}
                size="small"
              />
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>{l("channels")}</Typography>
                <Stack direction="row">
                  <FormControlLabel control={<Checkbox checked={channels.includes("push")} onChange={() => toggleChannel("push")} size="small" />} label="Push" />
                  <FormControlLabel control={<Checkbox checked={channels.includes("email")} onChange={() => toggleChannel("email")} size="small" />} label="Email" />
                </Stack>
              </Box>
            </>
          )}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Button variant="contained" size="small" onClick={handleSave} disabled={saving || (enabled && offsets.length === 0)} data-testid="task-reminder-save-button">
              {saving ? Locale.label("common.saving") : l("save")}
            </Button>
            {saved && <Typography variant="body2" color="success.main">{l("saved")}</Typography>}
          </Box>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
};
