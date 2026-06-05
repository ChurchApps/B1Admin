import { Box, Card, CardContent, Stack } from "@mui/material";
import React from "react";
import { Locale, Loading, PageHeader } from "@churchapps/apphelper";
import { EmptyState } from "../../../components/ui/EmptyState";
import { WorkflowCard } from "./components/WorkflowCard";
import { type WorkflowCardInterface } from "./interfaces";
import { useQuery } from "@tanstack/react-query";
import { Assignment as MyCardsIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

export const MyCardsPage = () => {
  const navigate = useNavigate();
  const cards = useQuery<WorkflowCardInterface[]>({ queryKey: ["/tasks/cards/my", "DoingApi"], placeholderData: [] });

  const getContent = () => {
    if (cards.isLoading) return <Loading />;
    if (!cards.data || cards.data.length === 0) return <EmptyState icon={<MyCardsIcon />} title={Locale.label("tasks.myCards.noCards")} />;
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
      <PageHeader title={Locale.label("tasks.myCards.title")} subtitle={Locale.label("tasks.myCards.subtitle")} />
      <Box sx={{ p: 3 }}>
        <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
          <CardContent>{getContent()}</CardContent>
        </Card>
      </Box>
    </>
  );
};
