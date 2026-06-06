import { Card, CardContent, Typography, Stack, Box, Button, TextField, Switch, FormControlLabel, FormControl, InputLabel, Select, MenuItem, IconButton, type SelectChangeEvent } from "@mui/material";
import React from "react";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { ViewKanban as WorkflowsIcon, Save as SaveIcon, Cancel as CancelIcon, Delete as DeleteIcon, Check as CheckIcon } from "@mui/icons-material";
import { type WorkflowInterface, type WorkflowCategoryInterface } from "@churchapps/helpers";

const ADD_CATEGORY = "__add__";

interface Props {
  workflow: WorkflowInterface;
  categories?: WorkflowCategoryInterface[];
  onCancel: () => void;
  onSave: (workflow: WorkflowInterface) => void;
  onDelete?: () => void;
  onCategoriesChanged?: () => void;
}

export const WorkflowEdit = (props: Props) => {
  const [workflow, setWorkflow] = React.useState<WorkflowInterface>(null);
  const [categories, setCategories] = React.useState<WorkflowCategoryInterface[]>([]);
  const [addingCategory, setAddingCategory] = React.useState(false);
  const [newCategoryName, setNewCategoryName] = React.useState("");

  React.useEffect(() => {
    setWorkflow(props.workflow);
  }, [props.workflow]);

  React.useEffect(() => {
    setCategories(props.categories || []);
  }, [props.categories]);

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
    else if (e.target.name === "categoryId") {
      if (e.target.value === ADD_CATEGORY) { setAddingCategory(true); return; }
      w.categoryId = e.target.value || undefined;
    }
    setWorkflow(w);
  };

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    const result = await ApiHelper.post("/workflowCategories", [{ name }], "DoingApi");
    const category: WorkflowCategoryInterface = result[0];
    setCategories([...categories, category]);
    setWorkflow({ ...workflow, categoryId: category.id });
    setAddingCategory(false);
    setNewCategoryName("");
    props.onCategoriesChanged?.();
  };

  const cancelAddCategory = () => {
    setAddingCategory(false);
    setNewCategoryName("");
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

            {addingCategory ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  fullWidth
                  autoFocus
                  label={Locale.label("tasks.workflowCategories.newCategory")}
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCategory(); } }}
                  data-testid="new-category-input"
                  variant="outlined"
                />
                <IconButton color="primary" onClick={handleAddCategory} data-testid="new-category-save" aria-label={Locale.label("common.save")}><CheckIcon /></IconButton>
                <IconButton onClick={cancelAddCategory} data-testid="new-category-cancel" aria-label={Locale.label("common.cancel")}><CancelIcon /></IconButton>
              </Stack>
            ) : (
              <FormControl fullWidth variant="outlined">
                <InputLabel>{Locale.label("tasks.workflowCategories.title")}</InputLabel>
                <Select label={Locale.label("tasks.workflowCategories.title")} value={workflow?.categoryId || ""} name="categoryId" onChange={handleChange} data-testid="workflow-category-select">
                  <MenuItem value="">{Locale.label("tasks.workflowCategories.uncategorized")}</MenuItem>
                  {categories.map((c) => (
                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                  ))}
                  <MenuItem value={ADD_CATEGORY} data-testid="workflow-category-add">+ {Locale.label("tasks.workflowCategories.addCategory")}</MenuItem>
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
