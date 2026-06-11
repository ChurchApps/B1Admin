import { useState, useEffect } from "react";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { type GroupInterface } from "@churchapps/helpers";
import { Box, Card, CardContent, TextField, Button, Stack, Typography, Divider, MenuItem } from "@mui/material";
import { Save as SaveIcon, Close as CloseIcon, Delete as DeleteIcon, Inventory2 as ResourceIcon } from "@mui/icons-material";
import { AppIconButton } from "../../components/ui/AppIconButton";
import { type ResourceInterface } from "../interfaces";

type Props = {
  resource: ResourceInterface;
  groups: GroupInterface[];
  updatedCallback: () => void;
};

export function ResourceEdit(props: Props) {
  const [resource, setResource] = useState<ResourceInterface>(props.resource);
  const [saving, setSaving] = useState(false);

  useEffect(() => setResource(props.resource), [props.resource]);

  const handleSave = () => {
    setSaving(true);
    ApiHelper.post("/resources", [resource], "ContentApi").then(() => {
      setSaving(false);
      props.updatedCallback();
    }).catch(() => setSaving(false));
  };

  const handleDelete = () => {
    if (window.confirm(Locale.label("calendars.rooms.confirmDeleteResource"))) {
      ApiHelper.delete("/resources/" + resource.id, "ContentApi").then(() => props.updatedCallback());
    }
  };

  const isNew = !resource.id;

  return (
    <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "grey.200", height: "fit-content" }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center">
            <ResourceIcon sx={{ color: "primary.main" }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
              {isNew ? Locale.label("calendars.rooms.addResource") : Locale.label("calendars.rooms.editResource")}
            </Typography>
          </Stack>
          <AppIconButton tone="card" label={Locale.label("common.close")} icon={<CloseIcon />} onClick={props.updatedCallback} />
        </Stack>
      </Box>
      <CardContent>
        <Stack spacing={3}>
          <TextField
            fullWidth
            label={Locale.label("calendars.rooms.resourceName")}
            value={resource.name || ""}
            onChange={(e) => setResource({ ...resource, name: e.target.value })}
            data-testid="resource-name-input"
          />
          <TextField
            fullWidth
            type="number"
            label={Locale.label("calendars.rooms.quantity")}
            value={resource.quantity ?? ""}
            onChange={(e) => setResource({ ...resource, quantity: e.target.value === "" ? undefined : parseInt(e.target.value, 10) })}
            data-testid="resource-quantity-input"
          />
          <TextField
            fullWidth
            label={Locale.label("calendars.rooms.description")}
            value={resource.description || ""}
            onChange={(e) => setResource({ ...resource, description: e.target.value })}
            data-testid="resource-description-input"
          />
          <TextField
            fullWidth
            select
            label={Locale.label("calendars.rooms.approvalGroup")}
            value={resource.approvalGroupId || ""}
            onChange={(e) => setResource({ ...resource, approvalGroupId: e.target.value || undefined })}
            helperText={Locale.label("calendars.rooms.approvalGroupHint")}
            data-testid="resource-approval-group-select"
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
              <Button variant="outlined" onClick={handleDelete} startIcon={<DeleteIcon />} sx={{ textTransform: "none", borderRadius: 2 }} data-testid="delete-resource-button">
                {Locale.label("common.delete")}
              </Button>
            )}
            <Button variant="contained" onClick={handleSave} disabled={saving || !resource.name?.trim()} startIcon={<SaveIcon />} sx={{ textTransform: "none", borderRadius: 2, fontWeight: 600 }} data-testid="save-resource-button">
              {Locale.label("common.save")}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
