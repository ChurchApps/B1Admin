import { useState, useEffect } from "react";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { Box, Card, CardContent, TextField, Button, Stack, Typography, Divider, MenuItem, Checkbox, ListItemText } from "@mui/material";
import { Save as SaveIcon, Close as CloseIcon, Delete as DeleteIcon, ContentCopy as TemplateIcon } from "@mui/icons-material";
import { AppIconButton } from "../../components/ui/AppIconButton";
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

  const handleDelete = () => {
    if (window.confirm(Locale.label("calendars.rooms.confirmDeleteTemplate"))) {
      ApiHelper.delete("/eventTemplates/" + template.id, "ContentApi").then(() => props.updatedCallback());
    }
  };

  const isNew = !template.id;

  return (
    <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "grey.200", height: "fit-content" }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center">
            <TemplateIcon sx={{ color: "primary.main" }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
              {isNew ? Locale.label("calendars.rooms.addTemplate") : Locale.label("calendars.rooms.editTemplate")}
            </Typography>
          </Stack>
          <AppIconButton tone="card" label={Locale.label("common.close")} icon={<CloseIcon />} onClick={props.updatedCallback} />
        </Stack>
      </Box>
      <CardContent>
        <Stack spacing={3}>
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
                <Checkbox checked={roomIds.includes(r.id)} size="small" />
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
                <Checkbox checked={resourceIds.includes(r.id)} size="small" />
                <ListItemText primary={r.name} />
              </MenuItem>
            ))}
          </TextField>
          <Divider />
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button variant="outlined" onClick={props.updatedCallback} sx={{ textTransform: "none", borderRadius: 2 }}>
              {Locale.label("common.cancel")}
            </Button>
            {!isNew && (
              <Button variant="outlined" onClick={handleDelete} startIcon={<DeleteIcon />} sx={{ textTransform: "none", borderRadius: 2 }} data-testid="delete-template-button">
                {Locale.label("common.delete")}
              </Button>
            )}
            <Button variant="contained" onClick={handleSave} disabled={saving || !template.name?.trim()} startIcon={<SaveIcon />} sx={{ textTransform: "none", borderRadius: 2, fontWeight: 600 }} data-testid="save-template-button">
              {Locale.label("common.save")}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
