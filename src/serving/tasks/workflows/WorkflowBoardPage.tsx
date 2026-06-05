import { Box, Button, Stack, Paper, Typography, Select, MenuItem, Menu } from "@mui/material";
import React from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { ApiHelper, Locale, Loading, PageHeader } from "@churchapps/apphelper";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Add as AddIcon, BarChart as ReportIcon, ArrowBack as BackIcon, Bolt as TriggerIcon, CheckCircle as CompleteIcon, Snooze as SnoozeIcon, Person as PersonIcon, Close as ClearIcon } from "@mui/icons-material";
import { WorkflowStepColumn } from "./components/WorkflowStepColumn";
import { WorkflowStepEdit } from "./components/WorkflowStepEdit";
import { WorkflowCardDrawer } from "./components/WorkflowCardDrawer";
import { WorkflowTriggersDialog } from "./components/WorkflowTriggersDialog";
import { ContentPicker } from "../components/ContentPicker";
import { type WorkflowBoardInterface, type WorkflowStepInterface, type WorkflowCardInterface } from "./interfaces";
import { canViewWorkflows, canEditCards, canManageWorkflows } from "./permissions";

export const WorkflowBoardPage = () => {
  const params = useParams();
  const navigate = useNavigate();
  const workflowId = params.id;
  const [editStep, setEditStep] = React.useState<WorkflowStepInterface | null>(null);
  const [openCard, setOpenCard] = React.useState<WorkflowCardInterface | null>(null);
  const [showTriggers, setShowTriggers] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [snoozeAnchor, setSnoozeAnchor] = React.useState<null | HTMLElement>(null);
  const [showBulkReassign, setShowBulkReassign] = React.useState(false);

  const canView = canViewWorkflows();
  const canEdit = canEditCards();
  const canManage = canManageWorkflows();

  const board = useQuery<WorkflowBoardInterface>({ queryKey: ["/tasks/board/" + workflowId, "DoingApi"], enabled: !!workflowId && canView });

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
    await ApiHelper.post("/tasks/" + cardId + "/moveStep", { stepId }, "DoingApi");
    refetch();
  };

  const handleAddStep = () => {
    const nextSort = (board.data?.steps?.length || 0) + 1;
    setEditStep({ workflowId, name: "", sort: nextSort });
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
  const cardsForStep = (stepId: string) => cards.filter((c) => c.stepId === stepId);

  return (
    <>
      <PageHeader title={board.data?.workflow?.name || Locale.label("tasks.workflowsPage.title")} subtitle={Locale.label("tasks.workflowBoard.subtitle")}>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<BackIcon />} onClick={() => navigate("/serving/tasks/workflows")} sx={{ color: "#FFF", borderColor: "rgba(255,255,255,0.5)" }}>{Locale.label("tasks.workflowsPage.title")}</Button>
          {canManage && <Button variant="outlined" startIcon={<TriggerIcon />} data-testid="board-triggers-button" onClick={() => setShowTriggers(true)} sx={{ color: "#FFF", borderColor: "rgba(255,255,255,0.5)" }}>{Locale.label("tasks.workflowTriggers.title")}</Button>}
          <Button variant="outlined" startIcon={<ReportIcon />} data-testid="board-reports-button" onClick={() => navigate("/serving/tasks/workflows/" + workflowId + "/reports")} sx={{ color: "#FFF", borderColor: "rgba(255,255,255,0.5)" }}>{Locale.label("tasks.workflowReports.title")}</Button>
          {canManage && <Button variant="outlined" startIcon={<AddIcon />} data-testid="add-step-button" onClick={handleAddStep} sx={{ color: "#FFF", borderColor: "rgba(255,255,255,0.5)", "&:hover": { borderColor: "#FFF" } }}>{Locale.label("tasks.workflowBoard.addStep")}</Button>}
        </Stack>
      </PageHeader>

      {selectedIds.size > 0 && (
        <Paper data-testid="bulk-action-bar" sx={{ mx: 3, mt: 2, p: 1.5, borderRadius: 2, border: "1px solid", borderColor: "primary.main", backgroundColor: "action.hover" }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="body2" sx={{ fontWeight: 600 }} data-testid="bulk-selected-count">{Locale.label("tasks.workflowBoard.selectedCount").replace("{count}", String(selectedIds.size))}</Typography>
            <Button size="small" variant="contained" color="success" startIcon={<CompleteIcon />} data-testid="bulk-complete-button" onClick={bulkComplete}>{Locale.label("tasks.workflowCard.complete")}</Button>
            <Button size="small" variant="outlined" startIcon={<SnoozeIcon />} data-testid="bulk-snooze-button" onClick={(e) => setSnoozeAnchor(e.currentTarget)}>{Locale.label("tasks.workflowCard.snooze")}</Button>
            <Button size="small" variant="outlined" startIcon={<PersonIcon />} data-testid="bulk-reassign-button" onClick={() => setShowBulkReassign(true)}>{Locale.label("tasks.workflowCard.assign")}</Button>
            <Select size="small" displayEmpty value="" data-testid="bulk-move-select" onChange={(e) => e.target.value && bulkMove(e.target.value)} sx={{ minWidth: 160 }}>
              <MenuItem value="" disabled>{Locale.label("tasks.workflowBoard.moveTo")}</MenuItem>
              {steps.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
            </Select>
            <Button size="small" startIcon={<ClearIcon />} data-testid="bulk-clear-button" onClick={clearSelection}>{Locale.label("tasks.workflowBoard.clearSelection")}</Button>
          </Stack>
          <Menu anchorEl={snoozeAnchor} open={Boolean(snoozeAnchor)} onClose={() => setSnoozeAnchor(null)}>
            <MenuItem onClick={() => bulkSnooze(1)}>{Locale.label("tasks.workflowCard.snooze1Day")}</MenuItem>
            <MenuItem onClick={() => bulkSnooze(3)}>{Locale.label("tasks.workflowCard.snooze3Days")}</MenuItem>
            <MenuItem onClick={() => bulkSnooze(7)}>{Locale.label("tasks.workflowCard.snooze1Week")}</MenuItem>
          </Menu>
        </Paper>
      )}

      <Box sx={{ p: 3 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <Box sx={{ flexGrow: 1, overflowX: "auto" }}>
            <DndProvider backend={HTML5Backend}>
              <Box sx={{ display: "flex", flexDirection: "row", alignItems: "flex-start", pb: 2 }} data-testid="workflow-board">
                {steps.map((step) => (
                  <WorkflowStepColumn
                    key={step.id}
                    workflowId={workflowId}
                    step={step}
                    cards={cardsForStep(step.id)}
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
            </DndProvider>
          </Box>

          {editStep && canManage && (
            <Box sx={{ width: { xs: "100%", md: 360 }, flexShrink: 0 }}>
              <WorkflowStepEdit step={editStep} onCancel={() => setEditStep(null)} onSave={() => { setEditStep(null); refetch(); }} onDelete={() => { setEditStep(null); refetch(); }} />
            </Box>
          )}
        </Stack>
      </Box>

      {openCard && <WorkflowCardDrawer card={openCard} steps={steps} onClose={() => setOpenCard(null)} onChanged={refetch} />}
      {showTriggers && <WorkflowTriggersDialog workflowId={workflowId} onClose={() => setShowTriggers(false)} />}
      {showBulkReassign && <ContentPicker onClose={() => setShowBulkReassign(false)} onSelect={bulkReassign} />}
    </>
  );
};
