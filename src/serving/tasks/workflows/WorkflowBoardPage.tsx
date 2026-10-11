import { Box, Button, Typography, Select, MenuItem, Menu } from "@mui/material";
import React from "react";
import { ApiHelper, Locale, Loading } from "@churchapps/apphelper";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Add as AddIcon, ArrowBack as BackIcon, Bolt as TriggersIcon, CheckCircle as CompleteIcon, EditOutlined as EditIcon, Snooze as SnoozeIcon, Person as PersonIcon, Close as ClearIcon, ViewKanbanOutlined as BoardIcon } from "@mui/icons-material";
import { WorkflowStepColumn } from "./components/WorkflowStepColumn";
import { WorkflowStepEdit } from "./components/WorkflowStepEdit";
import { WorkflowEdit } from "./components/WorkflowEdit";
import { WorkflowCardDrawer } from "./components/WorkflowCardDrawer";
import { WorkflowTriggersManager } from "./components/WorkflowTriggersManager";
import { ContentPicker } from "../components/ContentPicker";
import { BulkBar, HeaderPrimaryButton, HeaderSecondaryButton, HeaderTextButton, PageContainer, PageHeader, ResultsBar, StatusBadge, ViewToggle, formWidthSx } from "../../../components/ui";
import { type WorkflowBoardInterface, type WorkflowStepInterface, type TaskInterface, type WorkflowInterface, type WorkflowCategoryInterface } from "@churchapps/helpers";
import { canViewWorkflows, canEditCards, canManageWorkflows } from "./permissions";

export const WorkflowBoardPage = () => {
  const params = useParams();
  const navigate = useNavigate();
  const workflowId = params.id || "";
  const [editStep, setEditStep] = React.useState<WorkflowStepInterface | null>(null);
  const [editWorkflow, setEditWorkflow] = React.useState<WorkflowInterface | null>(null);
  const [openCard, setOpenCard] = React.useState<TaskInterface | null>(null);
  const [tab, setTab] = React.useState<"board" | "triggers">("board");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [snoozeAnchor, setSnoozeAnchor] = React.useState<null | HTMLElement>(null);
  const [showBulkReassign, setShowBulkReassign] = React.useState(false);

  const canView = canViewWorkflows();
  const canEdit = canEditCards();
  const canManage = canManageWorkflows();

  const board = useQuery<WorkflowBoardInterface>({ queryKey: ["/tasks/board/" + workflowId, "DoingApi"], enabled: !!workflowId && canView });
  // Hand-off targets for the routing editor; also names hand-off routes in board annotations.
  const workflows = useQuery<WorkflowInterface[]>({ queryKey: ["/workflows", "DoingApi"], placeholderData: [], enabled: canView });
  const categories = useQuery<WorkflowCategoryInterface[]>({ queryKey: ["/workflowCategories", "DoingApi"], placeholderData: [], enabled: canView });

  const refetch = () => board.refetch();
  const clearSelection = () => setSelectedIds(new Set());

  const toggleSelect = (cardId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId); else next.add(cardId);
      return next;
    });
  };

  const handleDropCard = async (cardId: string, stepId: string) => {
    if (!canEdit) return;
    if (board.data?.cards?.find((c) => c.id === cardId)?.stepId === stepId) return;
    await ApiHelper.post("/tasks/" + cardId + "/moveStep", { stepId }, "DoingApi");
    refetch();
  };

  const handleAddStep = () => {
    setTab("board");
    setEditWorkflow(null);
    const nextSort = (board.data?.steps?.length || 0) + 1;
    setEditStep({ workflowId, name: "", sort: nextSort });
  };

  const handleEditWorkflow = () => {
    setTab("board");
    setEditStep(null);
    setEditWorkflow(board.data?.workflow || null);
  };

  const handleWorkflowSaved = () => {
    setEditWorkflow(null);
    board.refetch();
    workflows.refetch();
  };

  const handleWorkflowDeleted = () => {
    setEditWorkflow(null);
    navigate("/serving/tasks/workflows");
  };

  const ids = () => Array.from(selectedIds);
  const afterBulk = () => { clearSelection(); refetch(); };

  const bulkComplete = async () => { await ApiHelper.post("/tasks/bulk/complete", { ids: ids() }, "DoingApi"); afterBulk(); };
  const bulkMove = async (stepId: string) => { await ApiHelper.post("/tasks/bulk/moveStep", { ids: ids(), stepId }, "DoingApi"); afterBulk(); };
  const bulkSnooze = async (days: number) => { setSnoozeAnchor(null); await ApiHelper.post("/tasks/bulk/snooze", { ids: ids(), days }, "DoingApi"); afterBulk(); };
  const bulkReassign = async (contentType: string, contentId: string, label: string) => {
    setShowBulkReassign(false);
    await ApiHelper.post("/tasks/bulk/reassign", { ids: ids(), assignedToType: contentType, assignedToId: contentId, assignedToLabel: label }, "DoingApi");
    afterBulk();
  };

  if (!canView) return <Box sx={{ p: 4 }}><Typography>{Locale.label("common.noAccess")}</Typography></Box>;
  if (board.isLoading) return <Loading />;
  const steps = board.data?.steps || [];
  const cards = board.data?.cards || [];
  const routes = board.data?.routes || [];
  const actions = board.data?.actions || [];
  const cardsForStep = (stepId: string) => cards.filter((c) => c.stepId === stepId);
  const routesForStep = (stepId: string) => routes.filter((r) => r.stepId === stepId);
  const actionsForStep = (stepId: string) => actions.filter((a) => a.stepId === stepId);

  const wf = board.data?.workflow;
  const onBoard = tab === "board" && !editWorkflow && !editStep;
  const showBoard = () => { setTab("board"); setEditWorkflow(null); setEditStep(null); };
  const showTriggers = () => { setTab("triggers"); setEditWorkflow(null); setEditStep(null); };

  const getSlice = () => {
    if (tab === "triggers") return <WorkflowTriggersManager workflowId={workflowId} canManage={canManage} />;
    if (editWorkflow && canManage) {
      return (
        <Box sx={formWidthSx}>
          <WorkflowEdit workflow={editWorkflow} categories={categories.data} onCancel={() => setEditWorkflow(null)} onSave={handleWorkflowSaved} onDelete={handleWorkflowDeleted} onCategoriesChanged={() => categories.refetch()} />
        </Box>
      );
    }
    if (editStep && canManage) {
      return (
        <Box sx={formWidthSx}>
          <WorkflowStepEdit step={editStep} steps={steps} workflows={(workflows.data || []).filter((w) => w.id !== workflowId)}
            onCancel={() => setEditStep(null)} onSave={(keepOpen) => { if (!keepOpen) setEditStep(null); refetch(); }} onDelete={() => { setEditStep(null); refetch(); }} />
        </Box>
      );
    }
    return (
      <Box sx={{ overflowX: "auto" }}>
        <Box sx={{ display: "flex", flexDirection: "row", alignItems: "flex-start", pb: 2 }} data-testid="workflow-board">
          {steps.map((step) => (
            <WorkflowStepColumn
              key={step.id}
              workflowId={workflowId}
              step={step}
              cards={cardsForStep(step.id || "")}
              routes={routesForStep(step.id || "")}
              actions={actionsForStep(step.id || "")}
              steps={steps}
              workflows={workflows.data || []}
              canEdit={canEdit}
              canManage={canManage}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onDropCard={handleDropCard}
              onOpenCard={setOpenCard}
              onEditStep={setEditStep}
              onChanged={refetch}
            />
          ))}
          {steps.length === 0 && canManage && (
            <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddStep} data-testid="add-first-step-button">{Locale.label("tasks.workflowBoard.addStep")}</Button>
          )}
        </Box>
      </Box>
    );
  };

  const selectedNames = cards.filter((c) => c.id && selectedIds.has(c.id)).slice(0, 3).map((c) => c.title).filter(Boolean).join(", ");

  return (
    <>
      <PageHeader
        title={wf?.name || Locale.label("tasks.workflowsPage.title")}
        subtitle={Locale.label("tasks.workflowBoard.subtitle")}
        chips={wf && <StatusBadge tone={wf.active ? "success" : "neutral"} variant="dot">{wf.active ? Locale.label("tasks.workflowEdit.active") : Locale.label("tasks.workflowEdit.inactive")}</StatusBadge>}>
        <HeaderTextButton component={RouterLink} to="/serving/tasks/workflows" startIcon={<BackIcon />} data-testid="board-workflows-link">{Locale.label("tasks.workflowsPage.title")}</HeaderTextButton>
        <HeaderTextButton component={RouterLink} to={"/serving/tasks/workflows/" + workflowId + "/reports"} data-testid="board-reports-button">{Locale.label("tasks.workflowReports.title")}</HeaderTextButton>
        {canManage && <HeaderSecondaryButton startIcon={<EditIcon />} onClick={handleEditWorkflow} data-testid="edit-workflow-button">{Locale.label("tasks.workflowEdit.editWorkflow")}</HeaderSecondaryButton>}
        {canManage && <HeaderPrimaryButton startIcon={<AddIcon />} onClick={handleAddStep} data-testid="add-step-button">{Locale.label("tasks.workflowBoard.addStep")}</HeaderPrimaryButton>}
      </PageHeader>
      <PageContainer>
        <Box sx={{ mb: 2 }} data-testid="workflow-identity">
          <ResultsBar
            end={
              <ViewToggle<"board" | "triggers">
                value={(tab === "triggers" ? "triggers" : onBoard ? "board" : "") as "board" | "triggers"}
                onChange={(v) => (v === "triggers" ? showTriggers() : showBoard())}
                options={[
                  { value: "board", label: Locale.label("tasks.workflowBoard.boardTab"), icon: <BoardIcon />, "data-testid": "board-tab" },
                  { value: "triggers", label: Locale.label("tasks.eventTriggers.title"), icon: <TriggersIcon />, "data-testid": "board-triggers-tab" }
                ]}
              />
            }>
            <Typography variant="body2" color="text.secondary">
              {steps.length} {Locale.label("tasks.workflowBoard.stepsCount", "steps")} · {cards.length} {Locale.label("tasks.workflowBoard.cardsCount", "cards")}
            </Typography>
          </ResultsBar>
        </Box>

        {getSlice()}

        {onBoard && (
          <BulkBar count={selectedIds.size} names={selectedNames} data-testid="bulk-action-bar">
            <Button size="small" variant="contained" startIcon={<CompleteIcon />} data-testid="bulk-complete-button" onClick={bulkComplete}>{Locale.label("tasks.workflowCard.complete")}</Button>
            <Button size="small" startIcon={<SnoozeIcon />} data-testid="bulk-snooze-button" onClick={(e) => setSnoozeAnchor(e.currentTarget)}>{Locale.label("tasks.workflowCard.snooze")}</Button>
            <Button size="small" startIcon={<PersonIcon />} data-testid="bulk-reassign-button" onClick={() => setShowBulkReassign(true)}>{Locale.label("tasks.workflowCard.assign")}</Button>
            <Select size="small" displayEmpty value="" data-testid="bulk-move-select" onChange={(e) => e.target.value && bulkMove(e.target.value)} sx={{ minWidth: 160, bgcolor: "background.paper" }}>
              <MenuItem value="" disabled>{Locale.label("tasks.workflowBoard.moveTo")}</MenuItem>
              {steps.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
            </Select>
            <Button size="small" startIcon={<ClearIcon />} data-testid="bulk-clear-button" onClick={clearSelection}>{Locale.label("tasks.workflowBoard.clearSelection")}</Button>
          </BulkBar>
        )}
        <Menu anchorEl={snoozeAnchor} open={Boolean(snoozeAnchor)} onClose={() => setSnoozeAnchor(null)}>
          <MenuItem onClick={() => bulkSnooze(1)}>{Locale.label("tasks.workflowCard.snooze1Day")}</MenuItem>
          <MenuItem onClick={() => bulkSnooze(3)}>{Locale.label("tasks.workflowCard.snooze3Days")}</MenuItem>
          <MenuItem onClick={() => bulkSnooze(7)}>{Locale.label("tasks.workflowCard.snooze1Week")}</MenuItem>
        </Menu>

        {openCard && <WorkflowCardDrawer card={cards.find((c) => c.id === openCard.id) || openCard} steps={steps} routes={board.data?.routes || []} onClose={() => setOpenCard(null)} onChanged={refetch} />}
        {showBulkReassign && <ContentPicker onClose={() => setShowBulkReassign(false)} onSelect={bulkReassign} />}
      </PageContainer>
    </>
  );
};
