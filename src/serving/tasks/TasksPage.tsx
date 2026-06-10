import React from "react";
import { Locale, Loading, PageHeader } from "@churchapps/apphelper";
import { TaskList } from "./components/TaskList";
import { WorkflowCard } from "./workflows/components/WorkflowCard";
import { EmptyState } from "../../components/ui/EmptyState";
import { CardWithHeader } from "../../components/ui/CardWithHeader";
import { type TaskInterface } from "@churchapps/helpers";
import { useQuery } from "@tanstack/react-query";
import { Box, Grid, Stack } from "@mui/material";
import { ViewKanban as WorkflowsIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

// My Work = the dashboard tasks module (left) beside the user's workflow cards (right).
export const TasksPage = () => {
  const [status, setStatus] = React.useState("Open");
  const navigate = useNavigate();

  const cards = useQuery<TaskInterface[]>({ queryKey: ["/tasks/cards/my", "DoingApi"], placeholderData: [] });

  const getCards = () => {
    if (cards.isLoading) return <Loading />;
    if (!cards.data || cards.data.length === 0) return <EmptyState icon={<WorkflowsIcon />} title={Locale.label("tasks.myCards.noCards")} />;
    return (
      <Stack data-testid="my-cards-list">
        {cards.data.map((card) => (
          <Box key={card.id} onClick={() => navigate("/serving/tasks/workflows/" + card.workflowId)} sx={{ cursor: "pointer" }}>
            <WorkflowCard card={card} />
          </Box>
        ))}
      </Stack>
    );
  };

  return (
    <>
      <PageHeader title={Locale.label("tasks.myWork.title")} subtitle={Locale.label("tasks.myWork.subtitle")} />

      <Box sx={{ p: 3 }}>
        <Grid container spacing={3} alignItems="flex-start">
          <Grid size={{ xs: 12, md: 6 }}>
            <TaskList compact={true} status={status} onStatusChange={setStatus} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <CardWithHeader title={Locale.label("components.wrapper.workflows")} icon={<WorkflowsIcon sx={{ color: "primary.main", fontSize: 20 }} />}>
              {getCards()}
            </CardWithHeader>
          </Grid>
        </Grid>
      </Box>
    </>
  );
};
