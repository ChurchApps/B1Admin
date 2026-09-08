import React from "react";
import { Locale, Loading } from "@churchapps/apphelper";
import { TaskList } from "./components/TaskList";
import { WorkflowCard } from "./workflows/components/WorkflowCard";
import { type TaskInterface } from "@churchapps/helpers";
import { useQuery } from "@tanstack/react-query";
import { Box } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { DirectoryPage, SectionLabel, Verb, Verbs, platedColor } from "../plated";

export const TasksPage = () => {
  const [status, setStatus] = React.useState("Open");
  const navigate = useNavigate();

  const cards = useQuery<TaskInterface[]>({ queryKey: ["/tasks/cards/my", "DoingApi"], placeholderData: [] });

  return (
    <DirectoryPage title={Locale.label("tasks.myWork.title")} lede={Locale.label("tasks.myWork.subtitle")}>
      <Verbs>
        <Verb to="/serving/tasks/workflows">{Locale.label("tasks.workflowsPage.title")}</Verb>
      </Verbs>

      <TaskList compact={true} status={status} onStatusChange={setStatus} />

      <SectionLabel>{Locale.label("components.wrapper.workflows")}</SectionLabel>
      <Box data-testid="my-cards-list">
        {cards.isLoading
          ? <Loading />
          : !cards.data || cards.data.length === 0
            ? <p style={{ color: platedColor.mute }}>{Locale.label("tasks.myCards.noCards")}</p>
            : cards.data.map((card) => (
              <Box key={card.id} onClick={() => navigate("/serving/tasks/workflows/" + card.workflowId)} sx={{ cursor: "pointer", borderTop: `1px solid ${platedColor.line}`, py: 1 }}>
                <WorkflowCard card={card} />
              </Box>
            ))}
      </Box>
    </DirectoryPage>
  );
};
