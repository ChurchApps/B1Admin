import { useEffect, useState, useCallback, useImperativeHandle, forwardRef } from "react";
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  Alert,
  Box,
  Button
} from "@mui/material";
import { ExpandMore } from "@mui/icons-material";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import type { SelectChangeEvent } from "@mui/material/Select";

export interface ReminderDefinition {
  id?: string;
  entityType?: string;
  entityId?: string;
  offsets?: string;
  sendLocalTime?: string;
  message?: string;
  channels?: string;
  recipientMode?: string;
  enabled?: boolean;
}

interface ReminderPreview {
  recipientCount?: number;
  unlinkedAttendeeCount?: number;
  nextFires?: string[];
}

export interface EventReminderEditRef {
  save: (eventId: string) => Promise<void>;
}

interface Props {
  /** Provided when editing an existing event; omit for new events (caller uses ref.save). */
  eventId?: string;
  hasRegistration?: boolean;
}

const OFFSET_PRESETS = [
  { label: "7 days before", minutes: 10080 },
  { label: "3 days before", minutes: 4320 },
  { label: "1 day before", minutes: 1440 },
  { label: "Day of", minutes: 0 }
] as const;

const MAX_OFFSETS = 3;

function parseOffsets(csv: string): number[] {
  if (!csv) return [];
  return csv.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
}

function formatLocalTime(raw: string): string {
  return raw ? raw.slice(0, 5) : "";
}

function formatFireTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export const EventReminderEdit = forwardRef<EventReminderEditRef, Props>(
  function EventReminderEdit({ eventId, hasRegistration }, ref) {
    const [enabled, setEnabled] = useState(false);
    const [defId, setDefId] = useState<string | undefined>(undefined);
    const [selectedOffsets, setSelectedOffsets] = useState<number[]>([1440]);
    const [sendLocalTime, setSendLocalTime] = useState("09:00");
    const [recipientMode, setRecipientMode] = useState<string>(hasRegistration ? "registrants" : "group");
    const [message, setMessage] = useState("");
    const [channels, setChannels] = useState<string[]>(["push", "email"]);
    const [preview, setPreview] = useState<ReminderPreview | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
      if (!eventId) return;
      ApiHelper.get("/reminders/event/" + eventId, "MessagingApi")
        .then((defs: ReminderDefinition[]) => {
          const def = defs?.[0];
          if (!def) return;
          setDefId(def.id);
          setEnabled(def.enabled !== false);
          setSelectedOffsets(parseOffsets(def.offsets || ""));
          setSendLocalTime(formatLocalTime(def.sendLocalTime || "09:00"));
          setRecipientMode(def.recipientMode || (hasRegistration ? "registrants" : "group"));
          setMessage(def.message || "");
          const ch = def.channels
            ? def.channels.split(",").map((s) => s.trim()).filter(Boolean)
            : ["push", "email"];
          setChannels(ch);
        })
        .catch(() => {});
    }, [eventId]);

    const fetchPreview = useCallback(() => {
      if (!eventId || !enabled || selectedOffsets.length === 0) {
        setPreview(null);
        return;
      }
      setPreviewLoading(true);
      const params = new URLSearchParams({ recipientMode, offsets: selectedOffsets.join(","), sendLocalTime });
      ApiHelper.get("/reminders/event/" + eventId + "/preview?" + params.toString(), "MessagingApi")
        .then((data: ReminderPreview) => setPreview(data))
        .catch(() => setPreview(null))
        .finally(() => setPreviewLoading(false));
    }, [eventId, enabled, selectedOffsets, recipientMode, sendLocalTime]);

    useEffect(() => {
      const t = setTimeout(fetchPreview, 600);
      return () => clearTimeout(t);
    }, [fetchPreview]);

    const doSave = async (id: string) => {
      if (!enabled && defId) {
        await ApiHelper.delete("/reminders/" + defId, "MessagingApi");
        setDefId(undefined);
      } else if (enabled) {
        const body = {
          offsets: selectedOffsets.join(","),
          sendLocalTime,
          message: message || undefined,
          channels,
          recipientMode,
          enabled: true
        };
        const saved: ReminderDefinition = await ApiHelper.post("/reminders/event/" + id, body, "MessagingApi");
        if (saved?.id) setDefId(saved.id);
      }
    };

    useImperativeHandle(ref, () => ({ save: async (id: string) => { await doSave(id); } }));

    const handleSaveClick = async () => {
      if (!eventId) return;
      setSaving(true);
      try { await doSave(eventId); } finally { setSaving(false); }
    };

    const toggleOffset = (minutes: number) => {
      setSelectedOffsets((prev) => {
        if (prev.includes(minutes)) return prev.filter((m) => m !== minutes);
        if (prev.length >= MAX_OFFSETS) return prev;
        return [...prev, minutes];
      });
    };

    const toggleChannel = (ch: string) => {
      setChannels((prev) => prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]);
    };

    const previewText = (): string | null => {
      if (!preview) return null;
      const parts: string[] = [];
      if (typeof preview.recipientCount === "number") parts.push(`~${preview.recipientCount} people will be reminded`);
      if (typeof preview.unlinkedAttendeeCount === "number" && preview.unlinkedAttendeeCount > 0) {
        parts.push(`${preview.unlinkedAttendeeCount} unlinked attendee${preview.unlinkedAttendeeCount !== 1 ? "s" : ""}`);
      }
      if (preview.nextFires?.length) {
        parts.push("Next: " + preview.nextFires.slice(0, 2).map(formatFireTime).join(", "));
      }
      return parts.join(" · ") || null;
    };

    return (
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1" fontWeight={600}>{Locale.label("calendars.eventReminders.title")}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <FormControlLabel
              control={<Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} data-testid="reminder-enabled-toggle" />}
              label={Locale.label("calendars.eventReminders.enableReminders")}
            />

            {enabled && (
              <>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {Locale.label("calendars.eventReminders.when")}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {OFFSET_PRESETS.map((p) => (
                      <Chip
                        key={p.minutes}
                        label={p.label}
                        clickable
                        color={selectedOffsets.includes(p.minutes) ? "primary" : "default"}
                        onClick={() => toggleOffset(p.minutes)}
                        disabled={!selectedOffsets.includes(p.minutes) && selectedOffsets.length >= MAX_OFFSETS}
                        data-testid={`reminder-offset-${p.minutes}`}
                      />
                    ))}
                  </Stack>
                  {selectedOffsets.length >= MAX_OFFSETS && (
                    <Typography variant="caption" color="text.secondary">
                      {Locale.label("calendars.eventReminders.maxOffsets")}
                    </Typography>
                  )}
                </Box>

                <TextField
                  label={Locale.label("calendars.eventReminders.timeOfDay")}
                  type="time"
                  value={sendLocalTime}
                  onChange={(e) => setSendLocalTime(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  helperText={Locale.label("calendars.eventReminders.timeOfDayHint")}
                  size="small"
                  data-testid="reminder-time-input"
                />

                <FormControl size="small" fullWidth>
                  <InputLabel>{Locale.label("calendars.eventReminders.who")}</InputLabel>
                  <Select
                    label={Locale.label("calendars.eventReminders.who")}
                    value={recipientMode}
                    onChange={(e: SelectChangeEvent) => setRecipientMode(e.target.value)}
                    data-testid="reminder-recipient-mode-select"
                  >
                    <MenuItem value="registrants">{Locale.label("calendars.eventReminders.modeRegistrants")}</MenuItem>
                    <MenuItem value="registrantsHoh">{Locale.label("calendars.eventReminders.modeRegistrantsHoh")}</MenuItem>
                    <MenuItem value="group">{Locale.label("calendars.eventReminders.modeGroup")}</MenuItem>
                    <MenuItem value="auto">{Locale.label("calendars.eventReminders.modeAuto")}</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label={Locale.label("calendars.eventReminders.message")}
                  multiline
                  minRows={2}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={"Don't miss it! {{eventTitle}} starts soon"}
                  helperText={Locale.label("calendars.eventReminders.messageHint")}
                  size="small"
                  data-testid="reminder-message-input"
                />

                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    {Locale.label("calendars.eventReminders.channels")}
                  </Typography>
                  <Stack direction="row">
                    <FormControlLabel
                      control={<Checkbox checked={channels.includes("push")} onChange={() => toggleChannel("push")} size="small" data-testid="reminder-channel-push" />}
                      label="Push"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={channels.includes("email")} onChange={() => toggleChannel("email")} size="small" data-testid="reminder-channel-email" />}
                      label="Email"
                    />
                  </Stack>
                </Box>

                {!previewLoading && previewText() && (
                  <Alert severity="info" data-testid="reminder-preview">{previewText()}</Alert>
                )}
              </>
            )}

            {eventId && (
              <Box>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleSaveClick}
                  disabled={saving || (enabled && selectedOffsets.length === 0)}
                  data-testid="reminder-save-button"
                >
                  {saving ? Locale.label("common.saving") : Locale.label("common.save")}
                </Button>
              </Box>
            )}
          </Stack>
        </AccordionDetails>
      </Accordion>
    );
  }
);
