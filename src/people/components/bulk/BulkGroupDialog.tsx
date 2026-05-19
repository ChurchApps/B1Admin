import React from "react";
import { type GroupInterface } from "@churchapps/helpers";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, FormControl, InputLabel, Select, MenuItem, TextField, Typography, FormControlLabel, Checkbox } from "@mui/material";
import { type BulkResult } from "./BulkFieldDialog";

interface Props {
  open: boolean;
  mode: "add" | "remove";
  personIds: string[];
  onClose: () => void;
  onComplete: (result: BulkResult) => void;
}

export const BulkGroupDialog: React.FC<Props> = (props) => {
  const [groups, setGroups] = React.useState<GroupInterface[]>([]);
  const [groupId, setGroupId] = React.useState("");
  const [createNew, setCreateNew] = React.useState(false);
  const [newGroupName, setNewGroupName] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!props.open) return;
    setGroupId("");
    setCreateNew(false);
    setNewGroupName("");
    ApiHelper.get("/groups", "MembershipApi").then((data: GroupInterface[]) => setGroups(data || []));
  }, [props.open]);

  const isAdd = props.mode === "add";
  const count = props.personIds.length;
  const canApply = (createNew && newGroupName.trim() !== "") || (!createNew && groupId !== "");

  const handleApply = async () => {
    if (!canApply) return;
    setIsSubmitting(true);
    try {
      let targetGroup: GroupInterface | undefined = groups.find((g) => g.id === groupId);
      if (isAdd && createNew) {
        const created = await ApiHelper.post("/groups", [{ name: newGroupName.trim(), tags: "standard" }], "MembershipApi");
        targetGroup = created?.[0];
      }
      if (!targetGroup?.id) throw new Error(Locale.label("people.bulk.error"));

      const route = isAdd ? "/groupMembers/bulk-add" : "/groupMembers/bulk-remove";
      const response = await ApiHelper.post(route, { groupId: targetGroup.id, personIds: props.personIds }, "MembershipApi");
      const affected = response?.count ?? count;
      const messageKey = isAdd ? "people.bulk.addSuccess" : "people.bulk.removeSuccess";
      props.onComplete({
        message: Locale.label(messageKey).replace("{count}", affected.toString()).replace("{group}", targetGroup.name || ""),
        severity: "success"
      });
      props.onClose();
    } catch (error) {
      props.onComplete({ message: error instanceof Error ? error.message : Locale.label("people.bulk.error"), severity: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={props.open} onClose={() => !isSubmitting && props.onClose()} maxWidth="xs" fullWidth>
      <DialogTitle>{Locale.label(isAdd ? "people.bulk.addToGroupTitle" : "people.bulk.removeFromGroupTitle")}</DialogTitle>
      <DialogContent>
        <Typography sx={{ mb: 2 }}>{Locale.label(isAdd ? "people.bulk.addToGroupPrompt" : "people.bulk.removeFromGroupPrompt").replace("{count}", count.toString())}</Typography>
        {!createNew && (
          <FormControl fullWidth>
            <InputLabel id="bulk-group-label">{Locale.label("people.bulk.group")}</InputLabel>
            <Select labelId="bulk-group-label" label={Locale.label("people.bulk.group")} value={groupId} onChange={(e) => setGroupId(e.target.value)} data-testid="bulk-group-select">
              {groups.map((g) => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
            </Select>
          </FormControl>
        )}
        {isAdd && createNew && (
          <TextField fullWidth label={Locale.label("people.bulk.newGroupName")} value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} data-testid="bulk-new-group-name" />
        )}
        {isAdd && (
          <FormControlLabel sx={{ mt: 1 }} control={<Checkbox checked={createNew} onChange={(e) => setCreateNew(e.target.checked)} data-testid="bulk-create-group-toggle" />} label={Locale.label("people.bulk.createNewGroup")} />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose} variant="outlined" disabled={isSubmitting}>{Locale.label("common.cancel")}</Button>
        <Button onClick={handleApply} variant="contained" disabled={isSubmitting || !canApply} data-testid="bulk-group-apply">{Locale.label("people.bulk.apply")}</Button>
      </DialogActions>
    </Dialog>
  );
};
