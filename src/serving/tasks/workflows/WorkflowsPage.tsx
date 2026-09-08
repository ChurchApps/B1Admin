import { Box, Button, Menu, MenuItem } from "@mui/material";
import React from "react";
import { ApiHelper, Locale, Loading } from "@churchapps/apphelper";
import { WorkflowEdit } from "./components/WorkflowEdit";
import { type WorkflowInterface, type WorkflowCategoryInterface } from "@churchapps/helpers";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { canViewWorkflows, canManageWorkflows } from "./permissions";
import { AddBlock, DirectoryPage, ListPills, Pill, Verb, Verbs, platedColor } from "../../plated";

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

  const duplicate = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await ApiHelper.post("/workflows/" + id + "/duplicate", {}, "DoingApi");
    workflows.refetch();
  };

  if (!canView) return <Box sx={{ p: 4 }}>{Locale.label("common.noAccess")}</Box>;

  const catName = (id?: string) => categories.data?.find((c) => c.id === id)?.name || Locale.label("tasks.workflowCategories.uncategorized");
  const list = (workflows.data || []).filter((w) => category === "all" || catName(w.categoryId) === category);

  return (
    <DirectoryPage title={Locale.label("tasks.workflowsPage.title")} lede={Locale.label("tasks.workflowsPage.subtitle")}>
      <ListPills>
        <Pill on={category === "all"} onClick={() => setCategory("all")}>{Locale.label("common.all") || "All"}</Pill>
        {(categories.data || []).map((c) => (
          <Pill key={c.id} on={category === c.name} onClick={() => setCategory(c.name || "")}>{c.name}</Pill>
        ))}
      </ListPills>
      <Verbs>
        <Verb to="/serving/tasks">{Locale.label("tasks.myCards.title")}</Verb>
      </Verbs>

      {workflows.isLoading && <Loading />}
      {!workflows.isLoading && list.length === 0 && (
        <p style={{ color: platedColor.mute }}>{Locale.label("tasks.workflowsPage.noWorkflows")}</p>
      )}
      {list.map((workflow) => (
        <Box
          key={workflow.id}
          data-testid={"workflow-row-" + workflow.id}
          onClick={() => navigate("/serving/tasks/workflows/" + workflow.id)}
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr auto" },
            gap: "8px 18px",
            padding: "11px 0",
            borderTop: `1px solid ${platedColor.line}`,
            cursor: "pointer"
          }}>
          <Box>
            <Box sx={{ fontSize: "1.12rem", fontWeight: 650, color: platedColor.ink }}>{workflow.name}</Box>
            <Box sx={{ color: platedColor.mute, fontSize: "0.9rem", mt: "2px" }}>
              {catName(workflow.categoryId)} · {workflow.active ? Locale.label("tasks.workflowEdit.active") : Locale.label("tasks.workflowEdit.inactive")}
            </Box>
          </Box>
          {canManage && (
            <Verb testId={"duplicate-workflow-" + workflow.id} onClick={(e) => { e.stopPropagation(); duplicate(e, workflow.id || ""); }}>
              {Locale.label("common.duplicate")}
            </Verb>
          )}
        </Box>
      ))}

      {showAdd && canManage && (
        <AddBlock title={Locale.label("tasks.workflowsPage.addWorkflow")}>
          <WorkflowEdit workflow={{ name: "", active: true }} categories={categories.data} onCancel={() => setShowAdd(false)} onSave={handleAdded} onCategoriesChanged={() => categories.refetch()} />
        </AddBlock>
      )}

      {canManage && !showAdd && (
        <AddBlock title={Locale.label("tasks.workflowsPage.addWorkflow")}>
          <Button data-testid="add-workflow-button" onClick={(e) => setAddAnchor(e.currentTarget)} sx={{ color: platedColor.accent, fontWeight: 600, textTransform: "none" }}>
            {Locale.label("tasks.workflowsPage.addWorkflow")}
          </Button>
        </AddBlock>
      )}

      <Menu anchorEl={addAnchor} open={Boolean(addAnchor)} onClose={() => setAddAnchor(null)}>
        <MenuItem data-testid="add-workflow-blank" onClick={() => { setAddAnchor(null); setShowAdd(true); }}>{Locale.label("tasks.workflowsPage.blankWorkflow")}</MenuItem>
        {(templates.data || []).map((t) => (
          <MenuItem key={t.key} data-testid={"add-workflow-template-" + t.key} onClick={() => createFromTemplate(t.key)}>{t.name}</MenuItem>
        ))}
      </Menu>
    </DirectoryPage>
  );
};
