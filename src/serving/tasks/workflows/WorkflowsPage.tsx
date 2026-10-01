import { Typography, Box, Link as MuiLink, Menu, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import React from "react";
import { ApiHelper, Locale, Loading } from "@churchapps/apphelper";
import { EmptyState, HeaderPrimaryButton, HeaderTextButton, PageContainer, PageHeader, PillTabs, ResultsBar, StatusBadge, Surface, TextAction, tableScrollSx } from "../../../components/ui";
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

  const startBlank = () => {
    setAddAnchor(null);
    setShowAdd(true);
    setTimeout(() => document.getElementById("add-workflow-bar")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

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
    return (
      <Box sx={tableScrollSx} role="region" aria-label={Locale.label("tasks.workflowsPage.title")} tabIndex={0}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{Locale.label("common.name")}</TableCell>
              <TableCell>{Locale.label("tasks.workflowsPage.category", "Category")}</TableCell>
              <TableCell>{Locale.label("tasks.workflowsPage.status", "Status")}</TableCell>
              {canManage && <TableCell />}
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map((workflow) => (
              <TableRow key={workflow.id} hover data-testid={"workflow-row-" + workflow.id} onClick={() => navigate("/serving/tasks/workflows/" + workflow.id)} sx={{ cursor: "pointer" }}>
                <TableCell sx={{ py: 1.5 }}>
                  <MuiLink component={RouterLink} to={"/serving/tasks/workflows/" + workflow.id} underline="hover" onClick={(e) => e.stopPropagation()} sx={{ fontWeight: 600, color: "text.primary", overflowWrap: "anywhere" }}>
                    {workflow.name}
                  </MuiLink>
                </TableCell>
                <TableCell sx={{ color: "text.secondary" }}>{catName(workflow.categoryId)}</TableCell>
                <TableCell>
                  <StatusBadge tone={workflow.active ? "success" : "neutral"} variant="dot">{workflow.active ? Locale.label("tasks.workflowEdit.active") : Locale.label("tasks.workflowEdit.inactive")}</StatusBadge>
                </TableCell>
                {canManage && (
                  <TableCell align="right" className="rowActions" onClick={(e) => e.stopPropagation()}>
                    <TextAction small onClick={() => duplicate(workflow.id || "")} data-testid={"duplicate-workflow-" + workflow.id}>{Locale.label("common.duplicate")}</TextAction>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    );
  };

  return (
    <>
      <PageHeader title={Locale.label("tasks.workflowsPage.title")} subtitle={Locale.label("tasks.workflowsPage.subtitle")}>
        <HeaderTextButton component={RouterLink} to="/serving/tasks" data-testid="workflows-my-cards-link">{Locale.label("tasks.myCards.title")}</HeaderTextButton>
        {canManage && (
          <HeaderPrimaryButton startIcon={<AddIcon />} data-testid="add-workflow-button" onClick={(e) => setAddAnchor(e.currentTarget)}>
            {Locale.label("tasks.workflowsPage.addWorkflow")}
          </HeaderPrimaryButton>
        )}
      </PageHeader>
      <PageContainer>
        <Surface>
          <Stack spacing={3}>
            {usedCategories.length > 0 && (
              <PillTabs
                aria-label={Locale.label("tasks.workflowsPage.categories", "Workflow categories")}
                value={category}
                onChange={setCategory}
                options={[
                  { value: "all", label: Locale.label("common.all", "All"), "data-testid": "workflow-category-all" },
                  ...usedCategories.map((c) => ({ value: c.id || "", label: c.name, "data-testid": "workflow-category-" + c.id }))
                ]}
              />
            )}
            {!workflows.isLoading && (
              <ResultsBar>
                <Typography variant="body2" color="text.secondary">
                  {Locale.label("tasks.workflowsPage.workflowCount", "{count} workflows").replace("{count}", list.length.toString())}
                </Typography>
              </ResultsBar>
            )}
            <Box data-testid="workflow-list">{getList()}</Box>
          </Stack>

          {canManage && showAdd && (
            <Box id="add-workflow-bar" sx={{ borderTop: 1, borderColor: "divider", pt: 3, mt: 3 }}>
              <WorkflowEdit workflow={{ name: "", active: true }} categories={categories.data} onCancel={() => setShowAdd(false)} onSave={handleAdded} onCategoriesChanged={() => categories.refetch()} />
            </Box>
          )}
        </Surface>
      </PageContainer>

      <Menu anchorEl={addAnchor} open={Boolean(addAnchor)} onClose={() => setAddAnchor(null)}>
        <MenuItem data-testid="add-workflow-blank" onClick={startBlank}>{Locale.label("tasks.workflowsPage.blankWorkflow")}</MenuItem>
        {(templates.data || []).map((t) => (
          <MenuItem key={t.key} data-testid={"add-workflow-template-" + t.key} onClick={() => createFromTemplate(t.key)}>{t.name}</MenuItem>
        ))}
      </Menu>
    </>
  );
};
