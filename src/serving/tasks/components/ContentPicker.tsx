import { Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Paper } from "@mui/material";
import React from "react";
import { SelectGroup } from ".";
import { Locale, Permissions, PersonHelper, UserHelper, type PersonInterface } from "@churchapps/apphelper";
import { type GroupInterface } from "@churchapps/helpers";
import { PersonAdd } from "../../../components";
import { Person as PersonIcon, Group as GroupIcon, Close as CloseIcon } from "@mui/icons-material";
import { SmartTabs } from "../../../components/ui";

interface Props {
  onClose: () => void;
  onSelect: (contentType: string, contentId: string, label: string) => void;
  /** Offer a "No person or group" choice; it calls onSelect with empty values. */
  allowNone?: boolean;
  /** Pick several people: the dialog stays open after a person pick and shows the people picked so far. */
  multiple?: boolean;
  selected?: { contentType: string; contentId: string; label: string }[];
  onRemove?: (contentId: string) => void;
  /** Multiple mode: called instead of onSelect when a group is picked with "a separate task for each member" checked. */
  onExpandGroup?: (group: GroupInterface) => void;
  /** Offer to add a new person when the search finds no one. */
  allowCreatePerson?: boolean;
}

export const ContentPicker: React.FC<Props> = (props) => {
  const [activeKey, setActiveKey] = React.useState("person");
  const [perMember, setPerMember] = React.useState(false);
  const selected = props.selected || [];
  const { onRemove } = props;
  const canCreatePerson = !!props.allowCreatePerson && UserHelper.checkAccess(Permissions.membershipApi.people.edit);
  const handlePersonAdd = (p: PersonInterface) => {
    props.onSelect("person", p?.id || "", p?.name?.display || Locale.label("person.unknown"));
  };
  const handleGroupAdd = (g: GroupInterface) => {
    if (props.multiple && perMember && props.onExpandGroup) props.onExpandGroup(g);
    else props.onSelect("group", g.id || "", g.name || "");
  };

  const tabs = [
    {
      key: "person",
      label: (
        <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
          <PersonIcon fontSize="small" /> {Locale.label("tasks.contentPicker.pers")}
        </Box>
      ),
      content: (
        <Box sx={{ pt: 2 }}>
          <PersonAdd getPhotoUrl={PersonHelper.getPhotoUrl} addFunction={handlePersonAdd} actionLabel={Locale.label("tasks.contentPicker.sel")} autoSearch filterList={props.multiple ? selected.map((s) => s.contentId) : undefined} showCreatePersonOnNotFound={canCreatePerson} onCreate={canCreatePerson ? handlePersonAdd : undefined} />
        </Box>
      )
    },
    {
      key: "group",
      label: (
        <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
          <GroupIcon fontSize="small" /> {Locale.label("tasks.contentPicker.group")}
        </Box>
      ),
      content: (
        <Box sx={{ pt: 2 }}>
          {props.multiple && (
            <FormControlLabel
              control={<Checkbox checked={perMember} onChange={(e) => setPerMember(e.target.checked)} />}
              label={Locale.label("tasks.contentPicker.perMember", "Create a separate task for each member")}
              data-testid="content-picker-per-member"
            />
          )}
          <SelectGroup addFunction={handleGroupAdd} />
        </Box>
      )
    }
  ];

  return (
    <Dialog open={true} onClose={props.onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 2
        }}>
        {props.multiple ? Locale.label("tasks.contentPicker.selPeople", "Select people or a group") : Locale.label("tasks.contentPicker.selPers")}
      </DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        {props.multiple && selected.length > 0 && (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }} data-testid="content-picker-selected">
            {selected.map((s) => (
              <Chip key={s.contentId} label={s.label} onDelete={onRemove ? () => onRemove(s.contentId) : undefined} data-testid={"content-picker-chip-" + s.contentId} />
            ))}
          </Box>
        )}
        <Paper variant="outlined" sx={{ overflow: "hidden", p: 2 }}>
          <SmartTabs tabs={tabs} value={activeKey} onChange={(k) => setActiveKey(k)} ariaLabel="content-picker-tabs" />
          {/* <Box sx={{ minHeight: 400 }} /> */}
        </Paper>
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 0, justifyContent: props.allowNone ? "space-between" : "flex-end" }}>
        {props.allowNone && (
          <Button variant="text" onClick={() => props.onSelect("", "", "")} data-testid="content-picker-none">
            {Locale.label("tasks.contentPicker.none", "No person or group")}
          </Button>
        )}
        {props.multiple ? (
          <Button variant="contained" onClick={props.onClose} data-testid="content-picker-done">
            {Locale.label("tasks.contentPicker.done", "Done")}
          </Button>
        ) : (
          <Button
            variant="outlined"
            onClick={props.onClose}
            startIcon={<CloseIcon />}>
            {Locale.label("common.close")}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
