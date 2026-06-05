import { Card, CardContent, Typography, Stack, Box, Button, TextField, Switch, FormControlLabel, FormControl, InputLabel, Select, MenuItem, type SelectChangeEvent } from "@mui/material";
import React from "react";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { ViewKanban as WorkflowsIcon, Save as SaveIcon, Cancel as CancelIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { type WorkflowInterface, type WorkflowCategoryInterface } from "../interfaces";

interface Props {
  workflow: WorkflowInterface;
  categories?: WorkflowCategoryInterface[];
  onCancel: () => void;
  onSave: (workflow: WorkflowInterface) => void;
  onDelete?: () => void;
}

export const WorkflowEdit = (props: Props) => {
  const [workflow, setWorkflow] = React.useState<WorkflowInterface>(null);

  React.useEffect(() => {
    setWorkflow(props.workflow);
  }, [props.workflow]);

  const handleSave = async () => {
    const result = await ApiHelper.post("/workflows", [workflow], "DoingApi");
    props.onSave(result[0]);
  };

  const handleDelete = async () => {
    await ApiHelper.delete("/workflows/" + workflow.id, "DoingApi");
    props.onDelete?.();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent) => {
    const w = { ...workflow };
    if (e.target.name === "name") w.name = e.target.value;
    else if (e.target.name === "categoryId") w.categoryId = e.target.value || undefined;
    setWorkflow(w);
  };

  return (
    <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "grey.200", "&:hover": { boxShadow: 2 } }}>
      <CardContent>
        <Stack spacing={3}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <WorkflowsIcon sx={{ color: "primary.main" }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
                {Locale.label("tasks.workflowEdit.editWorkflow")}
              </Typography>
            </Stack>
          </Box>

          <Stack spacing={2}>
            <TextField
              fullWidth
              label={Locale.label("tasks.workflowEdit.name")}
              value={workflow?.name || ""}
              name="name"
              onChange={handleChange}
              data-testid="workflow-name-input"
              aria-label={Locale.label("tasks.workflowEdit.name")}
              variant="outlined"
            />

            {props.categories && props.categories.length > 0 && (
              <FormControl fullWidth variant="outlined">
                <InputLabel>{Locale.label("tasks.workflowCategories.title")}</InputLabel>
                <Select label={Locale.label("tasks.workflowCategories.title")} value={workflow?.categoryId || ""} name="categoryId" onChange={handleChange} data-testid="workflow-category-select">
                  <MenuItem value="">{Locale.label("tasks.workflowCategories.uncategorized")}</MenuItem>
                  {props.categories.map((c) => (
                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <FormControlLabel
              control={<Switch checked={workflow?.active ?? true} onChange={(e) => setWorkflow({ ...workflow, active: e.target.checked })} color="primary" />}
              label={<Typography variant="body1">{workflow?.active ?? true ? Locale.label("tasks.workflowEdit.active") : Locale.label("tasks.workflowEdit.inactive")}</Typography>}
            />
          </Stack>

          <Stack direction="row" spacing={2} justifyContent="flex-end">
            {workflow?.id && (
              <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={handleDelete} data-testid="workflow-delete-button" sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}>
                {Locale.label("common.delete")}
              </Button>
            )}
            <Button variant="outlined" startIcon={<CancelIcon />} onClick={props.onCancel} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}>
              {Locale.label("common.cancel")}
            </Button>
            <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} data-testid="workflow-save-button" sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}>
              {Locale.label("common.save")}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};
