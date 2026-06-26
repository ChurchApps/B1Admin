import React from "react";
import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, FormGroup, MenuItem, Paper, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { Delete as DeleteIcon, Edit as EditIcon, ContentCopy as ApplyIcon, Sync as SyncIcon } from "@mui/icons-material";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { AppIconButton } from "../../components/ui/AppIconButton";
import { useQuery } from "@tanstack/react-query";
import { type PlanInterface, type PlanTemplateInterface } from "../../helpers";

interface Props {
  ministryId: string;
  plans: PlanInterface[];
  onClose: () => void;
}

export const PlanTemplateManager: React.FC<Props> = ({ ministryId, plans, onClose }) => {
  const templatesQuery = useQuery<PlanTemplateInterface[]>({
    queryKey: [`/plantemplates/ministry/${ministryId}`, "DoingApi"],
    enabled: !!ministryId,
    placeholderData: []
  });
  const templates = templatesQuery.data || [];

  const [renameItem, setRenameItem] = React.useState<PlanTemplateInterface | null>(null);
  const [updateItem, setUpdateItem] = React.useState<PlanTemplateInterface | null>(null);
  const [applyItem, setApplyItem] = React.useState<PlanTemplateInterface | null>(null);

  const refresh = () => templatesQuery.refetch();

  const handleDelete = async (t: PlanTemplateInterface) => {
    if (!window.confirm(Locale.label("plans.templates.confirmDelete") || "Delete this template?")) return;
    await ApiHelper.delete("/plantemplates/" + t.id, "DoingApi");
    refresh();
  };

  return (
    <>
      <Dialog open={true} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>{Locale.label("plans.templates.title") || "Plan Templates"}</DialogTitle>
        <DialogContent>
          {templates.length === 0 ? (
            <Box sx={{ py: 2 }}>
              <Typography color="text.secondary">{Locale.label("plans.templates.none") || "No templates yet. Open a plan and choose \"Save as Template\"."}</Typography>
            </Box>
          ) : (
            <Paper variant="outlined" sx={{ mt: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: "background.subtle" }}>
                    <TableCell sx={{ fontWeight: 600 }}>{Locale.label("common.name")}</TableCell>
                    <TableCell align="right" sx={{ width: 170 }}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {templates.map((t) => (
                    <TableRow key={t.id} hover sx={{ "&:last-child td": { border: 0 } }}>
                      <TableCell>{t.name}</TableCell>
                      <TableCell align="right">
                        <AppIconButton label={Locale.label("common.edit")} icon={<EditIcon />} onClick={() => setRenameItem(t)} />
                        <AppIconButton label={Locale.label("plans.templates.updateFromPlan") || "Update from plan"} icon={<SyncIcon />} onClick={() => setUpdateItem(t)} />
                        <AppIconButton label={Locale.label("plans.templates.apply") || "Apply"} icon={<ApplyIcon />} onClick={() => setApplyItem(t)} />
                        <AppIconButton label={Locale.label("common.delete")} icon={<DeleteIcon />} onClick={() => handleDelete(t)} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{Locale.label("common.close")}</Button>
        </DialogActions>
      </Dialog>

      {renameItem && <RenameDialog template={renameItem} onClose={() => { setRenameItem(null); refresh(); }} />}
      {updateItem && <UpdateFromPlanDialog template={updateItem} plans={plans} onClose={() => { setUpdateItem(null); refresh(); }} />}
      {applyItem && <ApplyDialog template={applyItem} plans={plans} onClose={() => setApplyItem(null)} />}
    </>
  );
};

const RenameDialog: React.FC<{ template: PlanTemplateInterface; onClose: () => void }> = ({ template, onClose }) => {
  const [name, setName] = React.useState(template.name || "");
  const [loading, setLoading] = React.useState(false);
  const save = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await ApiHelper.post("/plantemplates", [{ ...template, name: name.trim() }], "DoingApi");
      onClose();
    } finally {
      setLoading(false);
    }
  };
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{Locale.label("plans.templates.rename") || "Rename Template"}</DialogTitle>
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

const UpdateFromPlanDialog: React.FC<{ template: PlanTemplateInterface; plans: PlanInterface[]; onClose: () => void }> = ({ template, plans, onClose }) => {
  const [planId, setPlanId] = React.useState(plans[0]?.id || "");
  const [loading, setLoading] = React.useState(false);
  const save = async () => {
    if (!planId) return;
    setLoading(true);
    try {
      await ApiHelper.post("/plantemplates/fromPlan/" + planId, { id: template.id }, "DoingApi");
      onClose();
    } finally {
      setLoading(false);
    }
  };
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{Locale.label("plans.templates.updateFromPlan") || "Update from plan"}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{Locale.label("plans.templates.updateFromPlanHelp") || "Replace this template's contents with a plan's current order of service and positions."}</Typography>
        <TextField select fullWidth margin="normal" label={Locale.label("plans.templates.plan") || "Plan"} value={planId} onChange={(e) => setPlanId(e.target.value)}>
          {plans.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
        </TextField>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>{Locale.label("common.cancel")}</Button>
        <Button variant="contained" onClick={save} disabled={loading || !planId}>{Locale.label("common.save")}</Button>
      </DialogActions>
    </Dialog>
  );
};

const ApplyDialog: React.FC<{ template: PlanTemplateInterface; plans: PlanInterface[]; onClose: () => void }> = ({ template, plans, onClose }) => {
  const [selected, setSelected] = React.useState<string[]>([]);
  const [serviceOrder, setServiceOrder] = React.useState(true);
  const [positions, setPositions] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const toggle = (id: string) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const apply = async () => {
    if (selected.length === 0) return;
    setLoading(true);
    try {
      await ApiHelper.post("/plantemplates/apply/" + template.id, { planIds: selected, serviceOrder, positions }, "DoingApi");
      onClose();
    } finally {
      setLoading(false);
    }
  };
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{Locale.label("plans.templates.applyTitle") || "Apply Template"}: {template.name}</DialogTitle>
      <DialogContent>
        <Typography variant="subtitle2" sx={{ mt: 1 }}>{Locale.label("plans.templates.applyTo") || "Apply to plans"}</Typography>
        {plans.length === 0 ? (
          <Typography color="text.secondary" variant="body2">{Locale.label("plans.templates.noPlans") || "No upcoming plans."}</Typography>
        ) : (
          <FormGroup>
            {plans.map((p) => (
              <FormControlLabel key={p.id} control={<Checkbox checked={selected.includes(p.id || "")} onChange={() => toggle(p.id || "")} />} label={p.name} />
            ))}
          </FormGroup>
        )}
        <Box sx={{ mt: 2 }}>
          <FormControlLabel control={<Checkbox checked={serviceOrder} onChange={(e) => setServiceOrder(e.target.checked)} />} label={Locale.label("plans.templates.optServiceOrder") || "Order of Service"} />
          <FormControlLabel control={<Checkbox checked={positions} onChange={(e) => setPositions(e.target.checked)} />} label={Locale.label("plans.templates.optPositions") || "Positions"} />
          {positions && <Alert severity="warning" sx={{ mt: 1 }}>{Locale.label("plans.templates.positionsWarning") || "Applying positions replaces existing positions and their assignments on the selected plans."}</Alert>}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>{Locale.label("common.cancel")}</Button>
        <Button variant="contained" onClick={apply} disabled={loading || selected.length === 0 || (!serviceOrder && !positions)}>{Locale.label("plans.templates.apply") || "Apply"}</Button>
      </DialogActions>
    </Dialog>
  );
};
