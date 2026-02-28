import React, { useState, useEffect } from "react";
import {
  Card,
  Box,
  Typography,
  Stack,
  TextField,
  FormControlLabel,
  Switch,
  Button
} from "@mui/material";
import { Settings as SettingsIcon } from "@mui/icons-material";
import { ApiHelper } from "@churchapps/apphelper";
import { type EventInterface } from "@churchapps/helpers";

interface Props {
  event: EventInterface;
  onUpdate: () => void;
}

export const RegistrationSettingsEdit: React.FC<Props> = ({ event, onUpdate }) => {
  const [registrationEnabled, setRegistrationEnabled] = useState(event.registrationEnabled || false);
  const [capacity, setCapacity] = useState<string>(event.capacity?.toString() || "");
  const [registrationOpenDate, setRegistrationOpenDate] = useState(event.registrationOpenDate ? new Date(event.registrationOpenDate).toISOString().slice(0, 16) : "");
  const [registrationCloseDate, setRegistrationCloseDate] = useState(event.registrationCloseDate ? new Date(event.registrationCloseDate).toISOString().slice(0, 16) : "");
  const [tags, setTags] = useState(event.tags || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRegistrationEnabled(event.registrationEnabled || false);
    setCapacity(event.capacity?.toString() || "");
    setRegistrationOpenDate(event.registrationOpenDate ? new Date(event.registrationOpenDate).toISOString().slice(0, 16) : "");
    setRegistrationCloseDate(event.registrationCloseDate ? new Date(event.registrationCloseDate).toISOString().slice(0, 16) : "");
    setTags(event.tags || "");
  }, [event]);

  const handleSave = async () => {
    setSaving(true);
    const updated: EventInterface = {
      ...event,
      registrationEnabled,
      capacity: capacity ? parseInt(capacity) : null,
      registrationOpenDate: registrationOpenDate ? new Date(registrationOpenDate) : null,
      registrationCloseDate: registrationCloseDate ? new Date(registrationCloseDate) : null,
      tags
    };
    await ApiHelper.post("/events", [updated], "ContentApi");
    setSaving(false);
    onUpdate();
  };

  return (
    <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "grey.200" }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <SettingsIcon sx={{ color: "primary.main" }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
            Registration Settings
          </Typography>
        </Stack>
      </Box>
      <Box sx={{ p: 2 }}>
        <Stack spacing={2}>
          <FormControlLabel
            control={<Switch checked={registrationEnabled} onChange={(e) => setRegistrationEnabled(e.target.checked)} />}
            label="Enable Registration"
          />

          <TextField
            label="Capacity"
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            placeholder="Leave empty for unlimited"
            size="small"
            fullWidth
          />

          <TextField
            label="Registration Opens"
            type="datetime-local"
            value={registrationOpenDate}
            onChange={(e) => setRegistrationOpenDate(e.target.value)}
            size="small"
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          />

          <TextField
            label="Registration Closes"
            type="datetime-local"
            value={registrationCloseDate}
            onChange={(e) => setRegistrationCloseDate(e.target.value)}
            size="small"
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          />

          <TextField
            label="Tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="youth, retreat, vbs"
            helperText="Comma-separated tags for filtering"
            size="small"
            fullWidth
          />

          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </Stack>
      </Box>
    </Card>
  );
};
