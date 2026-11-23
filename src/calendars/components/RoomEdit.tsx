import { useState, useEffect } from "react";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { type GroupInterface } from "@churchapps/helpers";
import { FormControlLabel, MenuItem, Switch, TextField, Typography } from "@mui/material";
import { ComboBox } from "../../components";
import { FormCard } from "../../components/ui";
import { useConfirmDelete } from "../../hooks";
import { type RoomInterface } from "../interfaces";

type Props = {
  room: RoomInterface;
  groups: GroupInterface[];
  categories: string[];
  updatedCallback: () => void;
};

export function RoomEdit(props: Props) {
  const [room, setRoom] = useState<RoomInterface>(props.room);
  const [saving, setSaving] = useState(false);
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  useEffect(() => setRoom(props.room), [props.room]);

  const handleSave = () => {
    setSaving(true);
    ApiHelper.post("/rooms", [{ ...room, categoryName: room.categoryName?.trim() || undefined }], "ContentApi").then(() => {
      setSaving(false);
      props.updatedCallback();
    }).catch(() => setSaving(false));
  };

  const handleDelete = async () => {
    if (await confirm(Locale.label("calendars.rooms.confirmDeleteRoom"))) {
      ApiHelper.delete("/rooms/" + room.id, "ContentApi").then(() => props.updatedCallback());
    }
  };

  const isNew = !room.id;

  return (
    <>
      {ConfirmDialogElement}
      <FormCard
        title={isNew ? Locale.label("calendars.rooms.addRoom") : Locale.label("calendars.rooms.editRoom")}
        icon="meeting_room"
        onSave={handleSave}
        onCancel={props.updatedCallback}
        onDelete={isNew ? undefined : handleDelete}
        isSubmitting={saving}
        disabled={saving || !room.name?.trim()}
        saveTestId="save-room-button"
        deleteTestId="delete-room-button">
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
        <ComboBox
          label={Locale.label("calendars.rooms.category")}
          placeholder={Locale.label("calendars.rooms.categoryPlaceholder")}
          options={props.categories}
          value={room.categoryName || ""}
          onChange={(value) => setRoom({ ...room, categoryName: value })}
          testId="room-category"
        />
        <TextField
          fullWidth
          select
          label={Locale.label("calendars.rooms.approvalGroup")}
          value={room.approvalGroupId || ""}
          onChange={(e) => setRoom({ ...room, approvalGroupId: e.target.value || null })}
          helperText={Locale.label("calendars.rooms.approvalGroupHint")}
          data-testid="room-approval-group-select"
        >
          <MenuItem value="">{Locale.label("calendars.rooms.noApprovalNeeded")}</MenuItem>
          {props.groups.map((g) => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
        </TextField>
        <FormControlLabel
          control={<Switch checked={room.active ?? true} onChange={(e) => setRoom({ ...room, active: e.target.checked })} color="primary" />}
          label={<Typography variant="body1">{room.active ?? true ? Locale.label("calendars.rooms.active") : Locale.label("calendars.rooms.inactive")}</Typography>}
          data-testid="room-active-toggle"
        />
      </FormCard>
    </>
  );
}
