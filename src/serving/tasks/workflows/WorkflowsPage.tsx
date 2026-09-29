import { Typography, Box, Button, Link as MuiLink, Menu, MenuItem, Stack } from "@mui/material";
import React from "react";
import { ApiHelper, Locale, Loading } from "@churchapps/apphelper";
import { AddBar, EmptyState, PageContainer, PageHeader, PillTabs, StatusBadge, Surface, TextAction, VerbRow } from "../../../components/ui";
import { WorkflowEdit } from "./components/WorkflowEdit";
import { type WorkflowInterface, type WorkflowCategoryInterface } from "@churchapps/helpers";
import { useQuery } from "@tanstack/react-query";
import { ViewKanban as WorkflowsIcon, Add as AddIcon } from "@mui/icons-material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { canViewWorkflows, canManageWorkflows } from "./permissions";

interface TemplateInterface { key: string; name: string; description: string }

export const WorkflowsPage = () => {
  const [showAdd, setShowAdd] = React.useState(false);
  const [addAnchor, setAddAnchor] = React.useState<null | HTMLElement>(null);
  const [category, setCategory] = React.useState("all");
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

  const duplicate = async (id: string) => {
    await ApiHelper.post("/workflows/" + id + "/duplicate", {}, "DoingApi");
    workflows.refetch();
  };

  if (!canView) return <Box sx={{ p: 4 }}><Typography>{Locale.label("common.noAccess")}</Typography></Box>;

  const catName = (id?: string) => categories.data?.find((c) => c.id === id)?.name || Locale.label("tasks.workflowCategories.uncategorized");
  const usedCategories = (categories.data || []).filter((c) => (workflows.data || []).some((w) => w.categoryId === c.id));
  const list = (workflows.data || []).filter((w) => category === "all" || w.categoryId === category);

  const getList = () => {
    if (workflows.isLoading) return <Loading />;
    if (list.length === 0) return <EmptyState variant="plain" icon={<WorkflowsIcon />} title={Locale.label("tasks.workflowsPage.noWorkflows")} />;
    return list.map((workflow) => (
      <Box
        key={workflow.id}
        data-testid={"workflow-row-" + workflow.id}
        onClick={() => navigate("/serving/tasks/workflows/" + workflow.id)}
        sx={{ display: "flex", alignItems: "center", gap: 2, py: 1.5, minHeight: 56, borderTop: 1, borderColor: "divider", cursor: "pointer", "&:first-of-type": { borderTop: 0 }, "&:hover": { bgcolor: "action.hover" } }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <MuiLink component={RouterLink} to={"/serving/tasks/workflows/" + workflow.id} underline="hover" onClick={(e) => e.stopPropagation()} sx={{ fontWeight: 600, color: "text.primary", overflowWrap: "anywhere" }}>
            {workflow.name}
          </MuiLink>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.25, color: "text.secondary", typography: "body2" }}>
            <span>{catName(workflow.categoryId)}</span>
            <span aria-hidden>·</span>
            <StatusBadge tone={workflow.active ? "success" : "neutral"} variant="dot">{workflow.active ? Locale.label("tasks.workflowEdit.active") : Locale.label("tasks.workflowEdit.inactive")}</StatusBadge>
          </Stack>
        </Box>
        {canManage && (
          <Box onClick={(e) => e.stopPropagation()}>
            <TextAction small onClick={() => duplicate(workflow.id || "")} data-testid={"duplicate-workflow-" + workflow.id}>{Locale.label("common.duplicate")}</TextAction>
          </Box>
        )}
      </Box>
    ));
  };

  return (
    <>
      <PageHeader title={Locale.label("tasks.workflowsPage.title")} subtitle={Locale.label("tasks.workflowsPage.subtitle")} />
      <PageContainer>
        <Surface sx={{ maxWidth: 880 }}>
          <VerbRow sx={{ mb: 2 }}>
            <TextAction to="/serving/tasks" component={RouterLink} data-testid="workflows-my-cards-link">{Locale.label("tasks.myCards.title")}</TextAction>
          </VerbRow>
          {usedCategories.length > 0 && (
            <PillTabs
              aria-label={Locale.label("tasks.workflowsPage.categories", "Workflow categories")}
              value={category}
              onChange={setCategory}
              sx={{ mb: 2 }}
              options={[
                { value: "all", label: Locale.label("common.all", "All"), "data-testid": "workflow-category-all" },
                ...usedCategories.map((c) => ({ value: c.id || "", label: c.name, "data-testid": "workflow-category-" + c.id }))
              ]}
            />
          )}
          <Box data-testid="workflow-list">{getList()}</Box>

          {canManage && (
            <AddBar>
              {showAdd
                ? <WorkflowEdit workflow={{ name: "", active: true }} categories={categories.data} onCancel={() => setShowAdd(false)} onSave={handleAdded} onCategoriesChanged={() => categories.refetch()} />
                : (
                  <Button startIcon={<AddIcon />} data-testid="add-workflow-button" onClick={(e) => setAddAnchor(e.currentTarget)}>
                    {Locale.label("tasks.workflowsPage.addWorkflow")}
                  </Button>
                )}
            </AddBar>
          )}
        </Surface>
      </PageContainer>

      <Menu anchorEl={addAnchor} open={Boolean(addAnchor)} onClose={() => setAddAnchor(null)}>
        <MenuItem data-testid="add-workflow-blank" onClick={() => { setAddAnchor(null); setShowAdd(true); }}>{Locale.label("tasks.workflowsPage.blankWorkflow")}</MenuItem>
        {(templates.data || []).map((t) => (
          <MenuItem key={t.key} data-testid={"add-workflow-template-" + t.key} onClick={() => createFromTemplate(t.key)}>{t.name}</MenuItem>
        ))}
      </Menu>
    </>
  );
};
