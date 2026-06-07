import React from "react";
import { Locale, Loading, PageHeader } from "@churchapps/apphelper";
import { TaskList } from "./components/TaskList";
import { WorkflowCard } from "./workflows/components/WorkflowCard";
import { EmptyState } from "../../components/ui/EmptyState";
import { type TaskInterface } from "@churchapps/helpers";
import { useQuery } from "@tanstack/react-query";
import { Box, Card, CardContent, Stack, Tabs, Tab } from "@mui/material";
import { Assignment as MyCardsIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

export const TasksPage = () => {
  const [status, setStatus] = React.useState("Open");
  const [tab, setTab] = React.useState(0);
  const navigate = useNavigate();

  const cards = useQuery<TaskInterface[]>({ queryKey: ["/tasks/cards/my", "DoingApi"], placeholderData: [] });

  const getCards = () => {
    if (cards.isLoading) return <Loading />;
    if (!cards.data || cards.data.length === 0) return <EmptyState icon={<MyCardsIcon />} title={Locale.label("tasks.myCards.noCards")} />;
    return (
      <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
        <CardContent>
          <Stack data-testid="my-cards-list">
            {cards.data.map((card) => (
              <Box key={card.id} onClick={() => navigate("/serving/tasks/workflows/" + card.workflowId)} sx={{ cursor: "pointer" }}>
                <WorkflowCard card={card} />
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <PageHeader title={Locale.label("tasks.myWork.title")} subtitle={Locale.label("tasks.myWork.subtitle")} />

      <Box sx={{ p: 3 }}>
        <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
          <Tab data-testid="my-work-cards-tab" sx={{ textTransform: "none" }} label={Locale.label("tasks.myCards.title")} />
          <Tab data-testid="my-work-tasks-tab" sx={{ textTransform: "none" }} label={Locale.label("tasks.taskList.tasks")} />
        </Tabs>

        {tab === 0 ? getCards() : <TaskList status={status} onStatusChange={setStatus} />}
      </Box>
    </>
  );
};
