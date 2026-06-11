import { useState, useEffect } from "react";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { Box, Card, CardContent, TextField, Button, Stack, Typography, Divider, MenuItem } from "@mui/material";
import { Save as SaveIcon, Close as CloseIcon, Delete as DeleteIcon, EventBusy as BlockoutIcon } from "@mui/icons-material";
import { AppIconButton } from "../../components/ui/AppIconButton";
import { type CalendarBlockoutInterface, type ResourceInterface, type RoomInterface } from "../interfaces";

type Props = {
  blockout: CalendarBlockoutInterface;
  rooms: RoomInterface[];
  resources: ResourceInterface[];
  updatedCallback: () => void;
};

const toInputValue = (d: Date | string | undefined) => {
  if (!d) return "";
  const date = new Date(d);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export function BlockoutEdit(props: Props) {
  const [blockout, setBlockout] = useState<CalendarBlockoutInterface>(props.blockout);
  const [saving, setSaving] = useState(false);

  useEffect(() => setBlockout(props.blockout), [props.blockout]);

  const target = blockout.roomId ? "room:" + blockout.roomId : blockout.resourceId ? "resource:" + blockout.resourceId : "";

  const handleTargetChange = (value: string) => {
    const b = { ...blockout, roomId: undefined as string | undefined, resourceId: undefined as string | undefined };
    if (value.startsWith("room:")) b.roomId = value.substring(5);
    else if (value.startsWith("resource:")) b.resourceId = value.substring(9);
    setBlockout(b);
  };

  const handleSave = () => {
    setSaving(true);
    ApiHelper.post("/calendarBlockouts", [blockout], "ContentApi").then(() => {
      setSaving(false);
      props.updatedCallback();
    }).catch(() => setSaving(false));
  };

  const handleDelete = () => {
    if (window.confirm(Locale.label("calendars.rooms.confirmDeleteBlockout"))) {
      ApiHelper.delete("/calendarBlockouts/" + blockout.id, "ContentApi").then(() => props.updatedCallback());
    }
  };

  const isNew = !blockout.id;
  const valid = blockout.startTime && blockout.endTime && new Date(blockout.endTime) > new Date(blockout.startTime);

  return (
    <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "grey.200", height: "fit-content" }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center">
            <BlockoutIcon sx={{ color: "primary.main" }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
              {isNew ? Locale.label("calendars.rooms.addBlockout") : Locale.label("calendars.rooms.editBlockout")}
            </Typography>
          </Stack>
          <AppIconButton tone="card" label={Locale.label("common.close")} icon={<CloseIcon />} onClick={props.updatedCallback} />
        </Stack>
      </Box>
      <CardContent>
        <Stack spacing={3}>
          <TextField
            fullWidth
            select
            label={Locale.label("calendars.rooms.blockoutTarget")}
            value={target}
            onChange={(e) => handleTargetChange(e.target.value)}
            data-testid="blockout-target-select"
          >
            <MenuItem value="">{Locale.label("calendars.rooms.allRoomsResources")}</MenuItem>
            {props.rooms.map((r) => <MenuItem key={r.id} value={"room:" + r.id}>{r.name}</MenuItem>)}
            {props.resources.map((r) => <MenuItem key={r.id} value={"resource:" + r.id}>{r.name}</MenuItem>)}
          </TextField>
          <TextField
            fullWidth
            type="datetime-local"
            label={Locale.label("calendars.rooms.startTime")}
            value={toInputValue(blockout.startTime)}
            onChange={(e) => setBlockout({ ...blockout, startTime: e.target.value ? new Date(e.target.value) : undefined })}
            InputLabelProps={{ shrink: true }}
            data-testid="blockout-start-input"
          />
          <TextField
            fullWidth
            type="datetime-local"
            label={Locale.label("calendars.rooms.endTime")}
            value={toInputValue(blockout.endTime)}
            onChange={(e) => setBlockout({ ...blockout, endTime: e.target.value ? new Date(e.target.value) : undefined })}
            InputLabelProps={{ shrink: true }}
            data-testid="blockout-end-input"
          />
          <TextField
            fullWidth
            label={Locale.label("calendars.rooms.reason")}
            value={blockout.reason || ""}
            onChange={(e) => setBlockout({ ...blockout, reason: e.target.value })}
            data-testid="blockout-reason-input"
          />
          <Divider />
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button variant="outlined" onClick={props.updatedCallback} sx={{ textTransform: "none", borderRadius: 2 }}>
              {Locale.label("common.cancel")}
            </Button>
            {!isNew && (
              <Button variant="outlined" onClick={handleDelete} startIcon={<DeleteIcon />} sx={{ textTransform: "none", borderRadius: 2 }} data-testid="delete-blockout-button">
                {Locale.label("common.delete")}
              </Button>
            )}
            <Button variant="contained" onClick={handleSave} disabled={saving || !valid} startIcon={<SaveIcon />} sx={{ textTransform: "none", borderRadius: 2, fontWeight: 600 }} data-testid="save-blockout-button">
              {Locale.label("common.save")}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
