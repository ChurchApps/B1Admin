import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Paper } from "@mui/material";
import React from "react";
import { SelectGroup } from ".";
import { type GroupInterface, Locale, PersonHelper, type PersonInterface } from "@churchapps/apphelper";
import { PersonAdd } from "../../../components";
import { Person as PersonIcon, Group as GroupIcon, Close as CloseIcon } from "@mui/icons-material";
import { SmartTabs } from "../../../components/ui";

interface Props {
  onClose: () => void;
  onSelect: (contentType: string, contentId: string, label: string) => void;
}

export const ContentPicker: React.FC<Props> = (props) => {
  const [activeKey, setActiveKey] = React.useState("person");
  const handlePersonAdd = (p: PersonInterface) => {
    props.onSelect("person", p?.id, p?.name?.display || "Unknown");
  };
  const handleGroupAdd = (g: GroupInterface) => {
    props.onSelect("group", g.id, g.name);
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
          <PersonAdd getPhotoUrl={PersonHelper.getPhotoUrl} addFunction={handlePersonAdd} actionLabel={Locale.label("tasks.contentPicker.sel")} />
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
          <SelectGroup addFunction={handleGroupAdd} />
        </Box>
      )
    }
  ];

  return (
    <Dialog open={true} onClose={props.onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 2
        }}>
        {Locale.label("tasks.contentPicker.selPers")}
      </DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        <Paper sx={{ borderRadius: 2, overflow: "hidden", p: 2 }}>
          <SmartTabs tabs={tabs} value={activeKey} onChange={(k) => setActiveKey(k)} ariaLabel="content-picker-tabs" />
          <Box sx={{ minHeight: 400 }} />
        </Paper>
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button
          variant="outlined"
          onClick={props.onClose}
          startIcon={<CloseIcon />}
          sx={{
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 600
          }}>
          {Locale.label("common.close")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
