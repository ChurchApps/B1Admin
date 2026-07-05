import React from "react";
import { type PersonInterface } from "@churchapps/helpers";
import { ApiHelper, DisplayBox, Locale, Permissions, PersonHelper, UniqueIdHelper, UserHelper } from "@churchapps/apphelper";
import { useQuery } from "@tanstack/react-query";
import { Avatar, Box, Button, Chip, FormControl, InputLabel, MenuItem, Select, Stack, TextField, Typography } from "@mui/material";
import { PhotoCamera as PhotoCameraIcon } from "@mui/icons-material";
import { GalleryModal } from "../../components/gallery";
import { PersonAdd } from "./PersonAdd";
import { AppIconButton } from "../../components/ui/AppIconButton";
import { Delete as DeleteIcon } from "@mui/icons-material";

interface PickupInterface {
  id?: string;
  churchId?: string;
  householdId?: string;
  personId?: string;
  name?: string;
  photoUrl?: string;
  relationship?: string;
  status?: "trusted" | "notAuthorized";
  notes?: string;
}

interface Props {
  person: PersonInterface;
}

export const PickupPeople: React.FC<Props> = (props) => {
  const householdId = props.person?.householdId;
  const canEdit = UserHelper.checkAccess(Permissions.membershipApi.people.edit);
  const [adding, setAdding] = React.useState(false);
  const [name, setName] = React.useState("");
  const [relationship, setRelationship] = React.useState("");
  const [status, setStatus] = React.useState<"trusted" | "notAuthorized">("trusted");
  const [photoUrl, setPhotoUrl] = React.useState("");
  const [showGallery, setShowGallery] = React.useState(false);

  const peopleQuery = useQuery<PickupInterface[]>({
    queryKey: ["/householdpickup/" + householdId, "MembershipApi"],
    placeholderData: [],
    enabled: !UniqueIdHelper.isMissing(householdId)
  });
  const people = peopleQuery.data || [];

  const save = (row: PickupInterface) => ApiHelper.post("/householdpickup", [{ ...row, householdId }], "MembershipApi").then(() => peopleQuery.refetch());

  const resetForm = () => {
    setName("");
    setRelationship("");
    setStatus("trusted");
    setPhotoUrl("");
    setAdding(false);
  };

  const handleAddNamed = () => {
    if (!name.trim()) return;
    save({ name: name.trim(), relationship: relationship.trim() || undefined, photoUrl: photoUrl || undefined, status }).then(resetForm);
  };

  const handleAddPerson = (person: PersonInterface) => {
    save({ personId: person.id, name: person.name?.display, photoUrl: PersonHelper.getPhotoUrl(person), status: "trusted" });
  };

  const toggleStatus = (row: PickupInterface) => save({ ...row, status: row.status === "trusted" ? "notAuthorized" : "trusted" });

  const handleDelete = (row: PickupInterface) => {
    if (!row.id) return;
    ApiHelper.delete("/householdpickup/" + row.id, "MembershipApi").then(() => peopleQuery.refetch());
  };

  const editContent = canEdit ? (
    <Button size="small" onClick={() => setAdding((a) => !a)} data-testid="pickup-add-toggle">
      {adding ? Locale.label("common.cancel") : Locale.label("people.pickup.add")}
    </Button>
  ) : undefined;

  const rows = people.map((row) => (
    <Stack key={row.id} direction="row" spacing={2} alignItems="center" sx={{ py: 1, borderBottom: "1px solid", borderColor: "divider" }} data-testid="pickup-row">
      <Avatar src={row.photoUrl || undefined} sx={{ width: 40, height: 40 }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body1">{row.name}</Typography>
        {row.relationship && <Typography variant="body2" color="text.secondary">{row.relationship}</Typography>}
      </Box>
      <Chip
        label={row.status === "notAuthorized" ? Locale.label("people.pickup.notAuthorized") : Locale.label("people.pickup.trusted")}
        color={row.status === "notAuthorized" ? "error" : "success"}
        size="small"
        variant="outlined"
        onClick={canEdit ? () => toggleStatus(row) : undefined}
        data-testid="pickup-status-chip"
      />
      {canEdit && <AppIconButton intent="remove" label={Locale.label("common.delete")} icon={<DeleteIcon />} onClick={() => handleDelete(row)} data-testid="pickup-delete-button" />}
    </Stack>
  ));

  const addForm = adding && (
    <Box sx={{ mt: 2, p: 2, backgroundColor: "grey.50", borderRadius: 1 }}>
      <PersonAdd getPhotoUrl={PersonHelper.getPhotoUrl} addFunction={handleAddPerson} />
      <Typography variant="body2" color="text.secondary" sx={{ my: 1 }}>{Locale.label("people.pickup.orAddByName")}</Typography>
      <Stack spacing={2}>
        <TextField fullWidth size="small" label={Locale.label("people.pickup.name")} value={name} onChange={(e) => setName(e.target.value)} data-testid="pickup-name-input" />
        <TextField fullWidth size="small" label={Locale.label("people.pickup.relationship")} value={relationship} onChange={(e) => setRelationship(e.target.value)} data-testid="pickup-relationship-input" />
        <Stack direction="row" spacing={2} alignItems="center">
          <FormControl size="small" fullWidth>
            <InputLabel>{Locale.label("people.pickup.status")}</InputLabel>
            <Select value={status} label={Locale.label("people.pickup.status")} onChange={(e) => setStatus(e.target.value as "trusted" | "notAuthorized")} data-testid="pickup-status-select">
              <MenuItem value="trusted">{Locale.label("people.pickup.trusted")}</MenuItem>
              <MenuItem value="notAuthorized">{Locale.label("people.pickup.notAuthorized")}</MenuItem>
            </Select>
          </FormControl>
          <Button variant="outlined" size="small" startIcon={<PhotoCameraIcon />} onClick={() => setShowGallery(true)} data-testid="pickup-photo-button">
            {photoUrl ? Locale.label("common.changePhoto") : Locale.label("groups.groupDetailsEdit.addPhoto")}
          </Button>
        </Stack>
        <Box>
          <Button variant="contained" size="small" onClick={handleAddNamed} data-testid="pickup-save-button">{Locale.label("common.add")}</Button>
        </Box>
      </Stack>
    </Box>
  );

  if (UniqueIdHelper.isMissing(householdId)) return null;

  return (
    <>
      {showGallery && <GalleryModal aspectRatio={1} onSelect={(url) => { setPhotoUrl(url); setShowGallery(false); }} onCancel={() => setShowGallery(false)} />}
      <DisplayBox id="pickupBox" headerIcon="verified_user" headerText={Locale.label("people.pickup.title")} editContent={editContent} data-testid="pickup-box">
        {people.length === 0 && !adding && <Typography variant="body2" color="text.secondary">{Locale.label("people.pickup.none")}</Typography>}
        {rows}
        {addForm}
      </DisplayBox>
    </>
  );
};
