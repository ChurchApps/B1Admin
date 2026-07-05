import { useState, useEffect } from "react";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { type GroupInterface } from "@churchapps/helpers";
import { TextField, MenuItem } from "@mui/material";
import { FormCard } from "../../components/ui";
import { useConfirmDelete } from "../../hooks";
import { type ResourceInterface } from "../interfaces";

type Props = {
  resource: ResourceInterface;
  groups: GroupInterface[];
  updatedCallback: () => void;
};

export function ResourceEdit(props: Props) {
  const [resource, setResource] = useState<ResourceInterface>(props.resource);
  const [saving, setSaving] = useState(false);
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  useEffect(() => setResource(props.resource), [props.resource]);

  const handleSave = () => {
    setSaving(true);
    ApiHelper.post("/resources", [resource], "ContentApi").then(() => {
      setSaving(false);
      props.updatedCallback();
    }).catch(() => setSaving(false));
  };

  const handleDelete = async () => {
    if (await confirm(Locale.label("calendars.rooms.confirmDeleteResource"))) {
      ApiHelper.delete("/resources/" + resource.id, "ContentApi").then(() => props.updatedCallback());
    }
  };

  const isNew = !resource.id;

  return (
    <>
      {ConfirmDialogElement}
      <FormCard
        title={isNew ? Locale.label("calendars.rooms.addResource") : Locale.label("calendars.rooms.editResource")}
        icon="inventory_2"
        onSave={handleSave}
        onCancel={props.updatedCallback}
        onDelete={isNew ? undefined : handleDelete}
        isSubmitting={saving}
        disabled={saving || !resource.name?.trim()}
        saveTestId="save-resource-button"
        deleteTestId="delete-resource-button">
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
      </FormCard>
    </>
  );
}
