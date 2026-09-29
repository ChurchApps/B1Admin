import React from "react";
import { Locale, Loading } from "@churchapps/apphelper";
import { TaskList } from "./components/TaskList";
import { WorkflowCard } from "./workflows/components/WorkflowCard";
import { PageContainer, PageHeader, RecordHeading, Surface, TextAction, VerbRow } from "../../components/ui";
import { type TaskInterface } from "@churchapps/helpers";
import { useQuery } from "@tanstack/react-query";
import { Box, Typography } from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";

export const TasksPage = () => {
  const [status, setStatus] = React.useState("Open");
  const navigate = useNavigate();

  const cards = useQuery<TaskInterface[]>({ queryKey: ["/tasks/cards/my", "DoingApi"], placeholderData: [] });

  const getCards = () => {
    if (cards.isLoading) return <Loading />;
    if (!cards.data || cards.data.length === 0) return <Typography variant="body2" color="text.secondary">{Locale.label("tasks.myCards.noCards")}</Typography>;
    return cards.data.map((card) => (
      <Box key={card.id} onClick={() => navigate("/serving/tasks/workflows/" + card.workflowId)} sx={{ cursor: "pointer", mb: 1 }}>
        <WorkflowCard card={card} />
      </Box>
    ));
  };

  return (
    <>
      <PageHeader title={Locale.label("tasks.myWork.title")} subtitle={Locale.label("tasks.myWork.subtitle")} />
      <PageContainer>
        <Surface sx={{ maxWidth: 880 }}>
          <VerbRow sx={{ mb: 3 }}>
            <TextAction to="/serving/tasks/workflows" component={RouterLink} data-testid="tasks-workflows-link">{Locale.label("tasks.workflowsPage.title")}</TextAction>
          </VerbRow>
          <TaskList plain compact status={status} onStatusChange={setStatus} />
          <Box component="section" sx={{ mt: 5 }}>
            <RecordHeading label={Locale.label("tasks.myCards.title")} />
            <Box data-testid="my-cards-list">{getCards()}</Box>
          </Box>
        </Surface>
      </PageContainer>
    </>
  );
};
