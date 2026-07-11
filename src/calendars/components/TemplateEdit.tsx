import { useState, useEffect } from "react";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { TextField, MenuItem, Checkbox, ListItemText } from "@mui/material";
import { FormCard } from "../../components/ui";
import { useConfirmDelete } from "../../hooks";
import { type EventTemplateInterface, type ResourceInterface, type RoomInterface } from "../interfaces";

type Props = {
  template: EventTemplateInterface;
  rooms: RoomInterface[];
  resources: ResourceInterface[];
  updatedCallback: () => void;
};

export function TemplateEdit(props: Props) {
  const [template, setTemplate] = useState<EventTemplateInterface>(props.template);
  const [saving, setSaving] = useState(false);
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  useEffect(() => setTemplate(props.template), [props.template]);

  const roomIds = template.roomIds ? template.roomIds.split(",").filter((r) => r) : [];
  const resourceIds: string[] = template.resourcesJson ? JSON.parse(template.resourcesJson).map((r: any) => r.resourceId) : [];

  const handleSave = () => {
    setSaving(true);
    ApiHelper.post("/eventTemplates", [template], "ContentApi").then(() => {
      setSaving(false);
      props.updatedCallback();
    }).catch(() => setSaving(false));
  };

  const handleDelete = async () => {
    if (await confirm(Locale.label("calendars.rooms.confirmDeleteTemplate"))) {
      ApiHelper.delete("/eventTemplates/" + template.id, "ContentApi").then(() => props.updatedCallback());
    }
  };

  const isNew = !template.id;

  return (
    <>
      {ConfirmDialogElement}
      <FormCard
        title={isNew ? Locale.label("calendars.rooms.addTemplate") : Locale.label("calendars.rooms.editTemplate")}
        icon="content_copy"
        onSave={handleSave}
        onCancel={props.updatedCallback}
        onDelete={isNew ? undefined : handleDelete}
        isSubmitting={saving}
        disabled={saving || !template.name?.trim()}
        saveTestId="save-template-button"
        deleteTestId="delete-template-button">
        <TextField
          fullWidth
          label={Locale.label("calendars.rooms.templateName")}
          value={template.name || ""}
          onChange={(e) => setTemplate({ ...template, name: e.target.value })}
          data-testid="template-name-input"
        />
        <TextField
          fullWidth
          label={Locale.label("calendars.rooms.eventTitle")}
          value={template.title || ""}
          onChange={(e) => setTemplate({ ...template, title: e.target.value })}
          data-testid="template-title-input"
        />
        <TextField
          fullWidth
          label={Locale.label("calendars.rooms.eventDescription")}
          value={template.description || ""}
          onChange={(e) => setTemplate({ ...template, description: e.target.value })}
          data-testid="template-description-input"
        />
        <TextField
          fullWidth
          type="number"
          label={Locale.label("calendars.rooms.durationMinutes")}
          value={template.durationMinutes ?? ""}
          onChange={(e) => setTemplate({ ...template, durationMinutes: e.target.value === "" ? undefined : parseInt(e.target.value, 10) })}
          data-testid="template-duration-input"
        />
        <TextField
          fullWidth
          select
          label={Locale.label("calendars.rooms.rooms")}
          value={roomIds}
          onChange={(e) => {
            const value = e.target.value as unknown as string[];
            setTemplate({ ...template, roomIds: value.join(",") });
          }}
          SelectProps={{ multiple: true, renderValue: (selected: any) => props.rooms.filter((r) => selected.includes(r.id)).map((r) => r.name).join(", ") }}
          data-testid="template-rooms-select"
        >
          {props.rooms.map((r) => (
            <MenuItem key={r.id} value={r.id}>
              <Checkbox checked={roomIds.includes(r.id || "")} size="small" />
              <ListItemText primary={r.name} />
            </MenuItem>
          ))}
        </TextField>
        <TextField
          fullWidth
          select
          label={Locale.label("calendars.rooms.resources")}
          value={resourceIds}
          onChange={(e) => {
            const value = e.target.value as unknown as string[];
            setTemplate({ ...template, resourcesJson: JSON.stringify(value.map((id) => ({ resourceId: id, quantity: 1 }))) });
          }}
          SelectProps={{ multiple: true, renderValue: (selected: any) => props.resources.filter((r) => selected.includes(r.id)).map((r) => r.name).join(", ") }}
          data-testid="template-resources-select"
        >
          {props.resources.map((r) => (
            <MenuItem key={r.id} value={r.id}>
              <Checkbox checked={resourceIds.includes(r.id || "")} size="small" />
              <ListItemText primary={r.name} />
            </MenuItem>
          ))}
        </TextField>
      </FormCard>
    </>
  );
}
