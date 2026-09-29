import React from "react";
import { type PersonInterface } from "@churchapps/helpers";
import { ApiHelper, Locale, Permissions, PersonHelper, UniqueIdHelper, UserHelper } from "@churchapps/apphelper";
import { useQuery } from "@tanstack/react-query";
import { Avatar, Box, Button, Chip, FormControl, InputLabel, MenuItem, Select, Stack, TextField, Typography } from "@mui/material";
import { PhotoCamera as PhotoCameraIcon } from "@mui/icons-material";
import { GalleryModal } from "../../components/gallery";
import { PersonAdd } from "../../components";
import { AppIconButton } from "../../components/ui/AppIconButton";
import { useConfirmDelete } from "../../hooks";
import { RecordHeading, TextAction } from "../../components/ui";
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
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

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

  const handleDelete = async (row: PickupInterface) => {
    if (!row.id) return;
    if (!(await confirm(Locale.label("people.pickup.confirmDelete") || "Are you sure you want to remove this pickup person?"))) return;
    ApiHelper.delete("/householdpickup/" + row.id, "MembershipApi").then(() => peopleQuery.refetch());
  };

  const editContent = canEdit ? (
    <TextAction small onClick={() => setAdding((a) => !a)} data-testid="pickup-add-toggle">
      {adding ? Locale.label("common.cancel") : Locale.label("people.pickup.add")}
    </TextAction>
  ) : undefined;

  const rows = people.map((row) => (
    <Stack component="li" key={row.id} direction="row" spacing={1.5} alignItems="flex-start" sx={{ py: 1 }} data-testid="pickup-row">
      <Avatar src={row.photoUrl || undefined} alt="" sx={{ width: 32, height: 32, mt: 0.25 }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, overflowWrap: "break-word" }}>{row.name}</Typography>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
          <Chip
            label={row.status === "notAuthorized" ? Locale.label("people.pickup.notAuthorized") : Locale.label("people.pickup.trusted")}
            color={row.status === "notAuthorized" ? "error" : "success"}
            size="small"
            variant="outlined"
            onClick={canEdit ? () => toggleStatus(row) : undefined}
            data-testid="pickup-status-chip"
          />
          {row.relationship && <Typography variant="caption" color="text.secondary">{row.relationship}</Typography>}
        </Stack>
      </Box>
      {canEdit && <AppIconButton intent="remove" label={Locale.label("common.delete")} icon={<DeleteIcon />} onClick={() => handleDelete(row)} data-testid="pickup-delete-button" />}
    </Stack>
  ));

  const addForm = adding && (
    <Box sx={{ mt: 2, p: 2, backgroundColor: "var(--b1-canvas)", borderRadius: "var(--b1-radius-control)" }}>
      <PersonAdd getPhotoUrl={PersonHelper.getPhotoUrl} addFunction={handleAddPerson} showCreatePersonOnNotFound={true} />
      <Typography variant="body2" color="text.secondary" sx={{ my: 1 }}>{Locale.label("people.pickup.orAddByName")}</Typography>
      <Stack spacing={2}>
        <TextField fullWidth size="small" label={Locale.label("people.pickup.name")} value={name} onChange={(e) => setName(e.target.value)} data-testid="pickup-name-input" />
        <TextField fullWidth size="small" label={Locale.label("people.pickup.relationship")} value={relationship} onChange={(e) => setRelationship(e.target.value)} data-testid="pickup-relationship-input" />
        <Stack spacing={2}>
          <FormControl size="small" fullWidth>
            <InputLabel>{Locale.label("people.pickup.status")}</InputLabel>
            <Select value={status} label={Locale.label("people.pickup.status")} onChange={(e) => setStatus(e.target.value as "trusted" | "notAuthorized")} data-testid="pickup-status-select">
              <MenuItem value="trusted">{Locale.label("people.pickup.trusted")}</MenuItem>
              <MenuItem value="notAuthorized">{Locale.label("people.pickup.notAuthorized")}</MenuItem>
            </Select>
          </FormControl>
          <Button variant="outlined" size="small" startIcon={<PhotoCameraIcon />} sx={{ alignSelf: "flex-start" }} onClick={() => setShowGallery(true)} data-testid="pickup-photo-button">
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
      {ConfirmDialogElement}
      {showGallery && <GalleryModal aspectRatio={1} onSelect={(url) => { setPhotoUrl(url); setShowGallery(false); }} onCancel={() => setShowGallery(false)} />}
      <Box component="section" id="pickupBox" data-testid="pickup-box" aria-labelledby="pickup-heading">
        <RecordHeading id="pickup-heading" label={Locale.label("people.pickup.title")}>{editContent}</RecordHeading>
        {people.length === 0 && !adding && <Typography variant="body2" color="text.secondary">{Locale.label("people.pickup.none")}</Typography>}
        {rows.length > 0 && <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>{rows}</Box>}
        {addForm}
      </Box>
    </>
  );
};
