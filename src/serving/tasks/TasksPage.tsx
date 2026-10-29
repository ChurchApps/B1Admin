import React from "react";
import { Locale, Loading } from "@churchapps/apphelper";
import { TaskList } from "./components/TaskList";
import { WorkflowCard } from "./workflows/components/WorkflowCard";
import { WorkflowCardDrawer } from "./workflows/components/WorkflowCardDrawer";
import { canViewWorkflows } from "./workflows/permissions";
import { HeaderPrimaryButton, HeaderTextButton, PageContainer, PageHeader, Surface } from "../../components/ui";
import { type TaskInterface, type WorkflowBoardInterface } from "@churchapps/helpers";
import { useQuery } from "@tanstack/react-query";
import { Box, Grid, Typography } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";

export const TasksPage = () => {
  const [status, setStatus] = React.useState("Open");
  const [adding, setAdding] = React.useState(false);
  const [openCard, setOpenCard] = React.useState<TaskInterface | null>(null);

  const cards = useQuery<TaskInterface[]>({ queryKey: ["/tasks/cards/my", "DoingApi"], placeholderData: [] });
  // Steps and routes for the open card; the board needs View Workflows, so assignees without it get a step-less drawer.
  const board = useQuery<WorkflowBoardInterface>({ queryKey: ["/tasks/board/" + openCard?.workflowId, "DoingApi"], enabled: !!openCard?.workflowId && canViewWorkflows() });
  const refreshCards = () => { cards.refetch(); if (board.isFetched) board.refetch(); };

  const openAdd = () => {
    setAdding(true);
    setTimeout(() => document.getElementById("add-task-bar")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  const getCards = () => {
    if (cards.isLoading) return <Loading />;
    if (!cards.data || cards.data.length === 0) return <Typography variant="body2" color="text.secondary">{Locale.label("tasks.myCards.noCards")}</Typography>;
    return cards.data.map((card) => (
      <Box key={card.id} onClick={() => setOpenCard(card)} sx={{ cursor: "pointer", mb: 1 }}>
        <WorkflowCard card={card} />
      </Box>
    ));
  };

  return (
    <>
      <PageHeader title={Locale.label("tasks.myWork.title")} subtitle={Locale.label("tasks.myWork.subtitle")}>
        <HeaderTextButton component={RouterLink} to="/serving/tasks/workflows" data-testid="tasks-workflows-link">{Locale.label("tasks.workflowsPage.title")}</HeaderTextButton>
        {!adding && (
          <HeaderPrimaryButton startIcon={<AddIcon />} onClick={openAdd} data-testid="add-task-button" aria-label={Locale.label("tasks.taskList.addTaskAria")}>
            {Locale.label("tasks.taskList.addTask")}
          </HeaderPrimaryButton>
        )}
      </PageHeader>
      <PageContainer>
        <Grid container spacing={3} alignItems="flex-start">
          <Grid size={{ xs: 12, lg: 8 }}>
            <Surface>
              <Typography variant="h3" component="h2" sx={{ mb: 2 }}>{Locale.label("tasks.taskList.tasks")}</Typography>
              <TaskList status={status} onStatusChange={setStatus} adding={adding} onAddClose={() => setAdding(false)} />
            </Surface>
          </Grid>
          <Grid size={{ xs: 12, lg: 4 }}>
            <Surface component="section">
              <Typography variant="h3" component="h2" sx={{ mb: 2 }}>{Locale.label("tasks.myCards.title")}</Typography>
              <Box data-testid="my-cards-list">{getCards()}</Box>
            </Surface>
          </Grid>
        </Grid>
      </PageContainer>
      {openCard && <WorkflowCardDrawer card={cards.data?.find((c) => c.id === openCard.id) || openCard} steps={board.data?.steps || []} routes={board.data?.routes || []} onClose={() => setOpenCard(null)} onChanged={refreshCards} showBoardLink />}
    </>
  );
};
