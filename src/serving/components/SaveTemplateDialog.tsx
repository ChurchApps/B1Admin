import React from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { type PlanInterface } from "../../helpers";

interface Props {
  plan: PlanInterface;
  onClose: () => void;
}

export const SaveTemplateDialog: React.FC<Props> = ({ plan, onClose }) => {
  const [name, setName] = React.useState(plan?.name || "");
  const [loading, setLoading] = React.useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await ApiHelper.post("/plantemplates/fromPlan/" + plan.id, { name: name.trim(), ministryId: plan.ministryId }, "DoingApi");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{Locale.label("plans.templates.saveTitle") || "Save as Template"}</DialogTitle>
      <DialogContent>
        <TextField autoFocus fullWidth margin="normal" label={Locale.label("common.name")} value={name} onChange={(e) => setName(e.target.value)} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>{Locale.label("common.cancel")}</Button>
        <Button variant="contained" onClick={save} disabled={loading || !name.trim()}>{Locale.label("common.save")}</Button>
      </DialogActions>
    </Dialog>
  );
};
