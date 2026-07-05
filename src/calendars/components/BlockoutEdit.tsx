import { useState, useEffect } from "react";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { TextField, MenuItem } from "@mui/material";
import { FormCard } from "../../components/ui";
import { useConfirmDelete } from "../../hooks";
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
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

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

  const handleDelete = async () => {
    if (await confirm(Locale.label("calendars.rooms.confirmDeleteBlockout"))) {
      ApiHelper.delete("/calendarBlockouts/" + blockout.id, "ContentApi").then(() => props.updatedCallback());
    }
  };

  const isNew = !blockout.id;
  const valid = blockout.startTime && blockout.endTime && new Date(blockout.endTime) > new Date(blockout.startTime);

  return (
    <>
      {ConfirmDialogElement}
      <FormCard
        title={isNew ? Locale.label("calendars.rooms.addBlockout") : Locale.label("calendars.rooms.editBlockout")}
        icon="event_busy"
        onSave={handleSave}
        onCancel={props.updatedCallback}
        onDelete={isNew ? undefined : handleDelete}
        isSubmitting={saving}
        disabled={saving || !valid}
        saveTestId="save-blockout-button"
        deleteTestId="delete-blockout-button">
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
      </FormCard>
    </>
  );
}
