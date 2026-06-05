import { Grid, Typography, Card, CardContent, Stack, Box, Button, List, ListItem, ListItemButton, ListItemIcon, ListItemText, IconButton, Menu, MenuItem, Tooltip } from "@mui/material";
import React from "react";
import { ApiHelper, Locale, Loading, PageHeader } from "@churchapps/apphelper";
import { EmptyState } from "../../../components/ui/EmptyState";
import { WorkflowEdit } from "./components/WorkflowEdit";
import { type WorkflowInterface, type WorkflowCategoryInterface } from "./interfaces";
import { useQuery } from "@tanstack/react-query";
import { ViewKanban as WorkflowsIcon, Add as AddIcon, Assignment as MyCardsIcon, ContentCopy as DuplicateIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { canViewWorkflows, canManageWorkflows } from "./permissions";

interface TemplateInterface { key: string; name: string; description: string }

export const WorkflowsPage = () => {
  const [showAdd, setShowAdd] = React.useState(false);
  const [addAnchor, setAddAnchor] = React.useState<null | HTMLElement>(null);
  const navigate = useNavigate();

  const canView = canViewWorkflows();
  const canManage = canManageWorkflows();

  const workflows = useQuery<WorkflowInterface[]>({ queryKey: ["/workflows", "DoingApi"], placeholderData: [], enabled: canView });
  const categories = useQuery<WorkflowCategoryInterface[]>({ queryKey: ["/workflowCategories", "DoingApi"], placeholderData: [], enabled: canView });
  const templates = useQuery<TemplateInterface[]>({ queryKey: ["/workflows/templates", "DoingApi"], placeholderData: [], enabled: canManage });

  const handleAdded = (workflow: WorkflowInterface) => {
    setShowAdd(false);
    workflows.refetch();
    if (workflow?.id) navigate("/serving/tasks/workflows/" + workflow.id);
  };

  const createFromTemplate = async (templateKey: string) => {
    setAddAnchor(null);
    const workflow: WorkflowInterface = await ApiHelper.post("/workflows/fromTemplate", { templateKey }, "DoingApi");
    if (workflow?.id) navigate("/serving/tasks/workflows/" + workflow.id);
  };

  const duplicate = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await ApiHelper.post("/workflows/" + id + "/duplicate", {}, "DoingApi");
    workflows.refetch();
  };

  const getGroupedList = () => {
    if (workflows.isLoading) return <Loading />;
    if (!workflows.data || workflows.data.length === 0) {
      return <EmptyState icon={<WorkflowsIcon />} title={Locale.label("tasks.workflowsPage.noWorkflows")} />;
    }

    const catName = (id?: string) => categories.data?.find((c) => c.id === id)?.name || Locale.label("tasks.workflowCategories.uncategorized");
    const groups: Record<string, WorkflowInterface[]> = {};
    workflows.data.forEach((w) => {
      const key = catName(w.categoryId);
      (groups[key] = groups[key] || []).push(w);
    });

    return (
      <>
        {Object.keys(groups).map((group) => (
          <Box key={group} sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ px: 1, py: 0.5, fontWeight: 600 }}>{group}</Typography>
            <List sx={{ p: 0 }}>
              {groups[group].map((workflow) => (
                <ListItem
                  key={workflow.id}
                  disablePadding
                  secondaryAction={canManage ? (
                    <Tooltip title={Locale.label("tasks.workflowsPage.duplicate")}>
                      <IconButton edge="end" data-testid={"duplicate-workflow-" + workflow.id} onClick={(e) => duplicate(e, workflow.id)}><DuplicateIcon fontSize="small" /></IconButton>
                    </Tooltip>
                  ) : undefined}>
                  <ListItemButton
                    data-testid={"workflow-row-" + workflow.id}
                    onClick={() => navigate("/serving/tasks/workflows/" + workflow.id)}
                    sx={{ borderRadius: 1, mb: 1, border: "1px solid", borderColor: "divider", "&:hover": { borderColor: "primary.main", backgroundColor: "action.hover" } }}>
                    <ListItemIcon><WorkflowsIcon sx={{ color: workflow.active ? "primary.main" : "grey.400" }} /></ListItemIcon>
                    <ListItemText
                      primary={<Typography variant="h6" sx={{ fontWeight: 600, fontSize: "1rem" }}>{workflow.name}</Typography>}
                      secondary={<Typography variant="body2" color="text.secondary">{workflow.active ? Locale.label("tasks.workflowEdit.active") : Locale.label("tasks.workflowEdit.inactive")}</Typography>}
                      slotProps={{ primary: { component: "div" }, secondary: { component: "div" } }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
        ))}
      </>
    );
  };

  if (!canView) return <Box sx={{ p: 4 }}><Typography>{Locale.label("common.noAccess")}</Typography></Box>;

  return (
    <>
      <PageHeader title={Locale.label("tasks.workflowsPage.title")} subtitle={Locale.label("tasks.workflowsPage.subtitle")}>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<MyCardsIcon />} onClick={() => navigate("/serving/tasks/workflows/mine")} sx={{ color: "#FFF", borderColor: "rgba(255,255,255,0.5)", "&:hover": { borderColor: "#FFF" } }}>
            {Locale.label("tasks.myCards.title")}
          </Button>
          {canManage && (
            <Button variant="outlined" startIcon={<AddIcon />} data-testid="add-workflow-button" onClick={(e) => setAddAnchor(e.currentTarget)} sx={{ color: "#FFF", borderColor: "rgba(255,255,255,0.5)", "&:hover": { borderColor: "#FFF", backgroundColor: "rgba(255,255,255,0.1)" } }}>
              {Locale.label("tasks.workflowsPage.addWorkflow")}
            </Button>
          )}
        </Stack>
      </PageHeader>

      <Menu anchorEl={addAnchor} open={Boolean(addAnchor)} onClose={() => setAddAnchor(null)}>
        <MenuItem data-testid="add-workflow-blank" onClick={() => { setAddAnchor(null); setShowAdd(true); }}>{Locale.label("tasks.workflowsPage.blankWorkflow")}</MenuItem>
        {(templates.data || []).map((t) => (
          <MenuItem key={t.key} data-testid={"add-workflow-template-" + t.key} onClick={() => createFromTemplate(t.key)}>{t.name}</MenuItem>
        ))}
      </Menu>

      <Box sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: showAdd ? 8 : 12 }}>
            <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                  <WorkflowsIcon sx={{ color: "primary.main" }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>{Locale.label("tasks.workflowsPage.title")}</Typography>
                </Stack>
                {getGroupedList()}
              </CardContent>
            </Card>
          </Grid>

          {showAdd && (
            <Grid size={{ xs: 12, md: 4 }}>
              <WorkflowEdit workflow={{ name: "", active: true }} categories={categories.data} onCancel={() => setShowAdd(false)} onSave={handleAdded} />
            </Grid>
          )}
        </Grid>
      </Box>
    </>
  );
};
