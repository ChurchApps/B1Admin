import { useState, useEffect } from "react";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { type GroupInterface } from "@churchapps/helpers";
import { Box, Card, CardContent, TextField, Button, Stack, Typography, Divider, MenuItem } from "@mui/material";
import { Save as SaveIcon, Close as CloseIcon, Delete as DeleteIcon, MeetingRoom as RoomIcon } from "@mui/icons-material";
import { AppIconButton } from "../../components/ui/AppIconButton";
import { type RoomInterface } from "../interfaces";

type Props = {
  room: RoomInterface;
  groups: GroupInterface[];
  updatedCallback: () => void;
};

export function RoomEdit(props: Props) {
  const [room, setRoom] = useState<RoomInterface>(props.room);
  const [saving, setSaving] = useState(false);

  useEffect(() => setRoom(props.room), [props.room]);

  const handleSave = () => {
    setSaving(true);
    ApiHelper.post("/rooms", [room], "ContentApi").then(() => {
      setSaving(false);
      props.updatedCallback();
    }).catch(() => setSaving(false));
  };

  const handleDelete = () => {
    if (window.confirm(Locale.label("calendars.rooms.confirmDeleteRoom"))) {
      ApiHelper.delete("/rooms/" + room.id, "ContentApi").then(() => props.updatedCallback());
    }
  };

  const isNew = !room.id;

  return (
    <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "grey.200", height: "fit-content" }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center">
            <RoomIcon sx={{ color: "primary.main" }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
              {isNew ? Locale.label("calendars.rooms.addRoom") : Locale.label("calendars.rooms.editRoom")}
            </Typography>
          </Stack>
          <AppIconButton tone="card" label={Locale.label("common.close")} icon={<CloseIcon />} onClick={props.updatedCallback} />
        </Stack>
      </Box>
      <CardContent>
        <Stack spacing={3}>
          <TextField
            fullWidth
            label={Locale.label("calendars.rooms.roomName")}
            value={room.name || ""}
            onChange={(e) => setRoom({ ...room, name: e.target.value })}
            data-testid="room-name-input"
          />
          <TextField
            fullWidth
            type="number"
            label={Locale.label("calendars.rooms.capacity")}
            value={room.capacity ?? ""}
            onChange={(e) => setRoom({ ...room, capacity: e.target.value === "" ? undefined : parseInt(e.target.value, 10) })}
            data-testid="room-capacity-input"
          />
          <TextField
            fullWidth
            label={Locale.label("calendars.rooms.description")}
            value={room.description || ""}
            onChange={(e) => setRoom({ ...room, description: e.target.value })}
            data-testid="room-description-input"
          />
          <TextField
            fullWidth
            select
            label={Locale.label("calendars.rooms.approvalGroup")}
            value={room.approvalGroupId || ""}
            onChange={(e) => setRoom({ ...room, approvalGroupId: e.target.value || undefined })}
            helperText={Locale.label("calendars.rooms.approvalGroupHint")}
            data-testid="room-approval-group-select"
          >
            <MenuItem value="">{Locale.label("calendars.rooms.noApprovalNeeded")}</MenuItem>
            {props.groups.map((g) => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
          </TextField>
          <Divider />
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button variant="outlined" onClick={props.updatedCallback} sx={{ textTransform: "none", borderRadius: 2 }}>
              {Locale.label("common.cancel")}
            </Button>
            {!isNew && (
              <Button variant="outlined" onClick={handleDelete} startIcon={<DeleteIcon />} sx={{ textTransform: "none", borderRadius: 2 }} data-testid="delete-room-button">
                {Locale.label("common.delete")}
              </Button>
            )}
            <Button variant="contained" onClick={handleSave} disabled={saving || !room.name?.trim()} startIcon={<SaveIcon />} sx={{ textTransform: "none", borderRadius: 2, fontWeight: 600 }} data-testid="save-room-button">
              {Locale.label("common.save")}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
