import { Box, Button, Stack } from "@mui/material";
import React from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { ApiHelper, Locale, Loading, PageHeader } from "@churchapps/apphelper";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Add as AddIcon, BarChart as ReportIcon, ArrowBack as BackIcon, Bolt as TriggerIcon } from "@mui/icons-material";
import { WorkflowStepColumn } from "./components/WorkflowStepColumn";
import { WorkflowStepEdit } from "./components/WorkflowStepEdit";
import { WorkflowCardDrawer } from "./components/WorkflowCardDrawer";
import { WorkflowTriggersDialog } from "./components/WorkflowTriggersDialog";
import { type WorkflowBoardInterface, type WorkflowStepInterface, type WorkflowCardInterface } from "./interfaces";

export const WorkflowBoardPage = () => {
  const params = useParams();
  const navigate = useNavigate();
  const workflowId = params.id;
  const [editStep, setEditStep] = React.useState<WorkflowStepInterface | null>(null);
  const [openCard, setOpenCard] = React.useState<WorkflowCardInterface | null>(null);
  const [showTriggers, setShowTriggers] = React.useState(false);

  const board = useQuery<WorkflowBoardInterface>({ queryKey: ["/tasks/board/" + workflowId, "DoingApi"], enabled: !!workflowId });

  const refetch = () => board.refetch();

  const handleDropCard = async (cardId: string, stepId: string) => {
    await ApiHelper.post("/tasks/" + cardId + "/moveStep", { stepId }, "DoingApi");
    refetch();
  };

  const handleAddStep = () => {
    const nextSort = (board.data?.steps?.length || 0) + 1;
    setEditStep({ workflowId, name: "", sort: nextSort });
  };

  if (board.isLoading) return <Loading />;
  const steps = board.data?.steps || [];
  const cards = board.data?.cards || [];
  const cardsForStep = (stepId: string) => cards.filter((c) => c.stepId === stepId);

  return (
    <>
      <PageHeader title={board.data?.workflow?.name || Locale.label("tasks.workflowsPage.title")} subtitle={Locale.label("tasks.workflowBoard.subtitle")}>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<BackIcon />} onClick={() => navigate("/serving/tasks/workflows")} sx={{ color: "#FFF", borderColor: "rgba(255,255,255,0.5)" }}>{Locale.label("tasks.workflowsPage.title")}</Button>
          <Button variant="outlined" startIcon={<TriggerIcon />} data-testid="board-triggers-button" onClick={() => setShowTriggers(true)} sx={{ color: "#FFF", borderColor: "rgba(255,255,255,0.5)" }}>{Locale.label("tasks.workflowTriggers.title")}</Button>
          <Button variant="outlined" startIcon={<ReportIcon />} data-testid="board-reports-button" onClick={() => navigate("/serving/tasks/workflows/" + workflowId + "/reports")} sx={{ color: "#FFF", borderColor: "rgba(255,255,255,0.5)" }}>{Locale.label("tasks.workflowReports.title")}</Button>
          <Button variant="outlined" startIcon={<AddIcon />} data-testid="add-step-button" onClick={handleAddStep} sx={{ color: "#FFF", borderColor: "rgba(255,255,255,0.5)", "&:hover": { borderColor: "#FFF" } }}>{Locale.label("tasks.workflowBoard.addStep")}</Button>
        </Stack>
      </PageHeader>

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
                    onDropCard={handleDropCard}
                    onOpenCard={setOpenCard}
                    onEditStep={setEditStep}
                    onChanged={refetch}
                  />
                ))}
                {steps.length === 0 && (
                  <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddStep} data-testid="add-first-step-button">{Locale.label("tasks.workflowBoard.addStep")}</Button>
                )}
              </Box>
            </DndProvider>
          </Box>

          {editStep && (
            <Box sx={{ width: { xs: "100%", md: 360 }, flexShrink: 0 }}>
              <WorkflowStepEdit step={editStep} onCancel={() => setEditStep(null)} onSave={() => { setEditStep(null); refetch(); }} onDelete={() => { setEditStep(null); refetch(); }} />
            </Box>
          )}
        </Stack>
      </Box>

      {openCard && <WorkflowCardDrawer card={openCard} steps={steps} onClose={() => setOpenCard(null)} onChanged={refetch} />}
      {showTriggers && <WorkflowTriggersDialog workflowId={workflowId} onClose={() => setShowTriggers(false)} />}
    </>
  );
};
