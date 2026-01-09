import React from "react";
import { Locale, PageHeader } from "@churchapps/apphelper";
import { TaskList } from "./components/TaskList";
import { TasksNavigation } from "./components/TasksNavigation";
import { Box } from "@mui/material";
import { Assignment as TaskIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

export const TasksPage = () => {
  const [status, setStatus] = React.useState("Open");
  const navigate = useNavigate();

  const handleTabChange = (tab: string) => {
    if (tab === "automations") navigate("/serving/tasks/automations");
  };

  return (
    <>
      <PageHeader icon={<TaskIcon />} title={Locale.label("tasks.tasksPage.tasks")} subtitle={Locale.label("tasks.tasksPage.subtitle")} />
      <TasksNavigation selectedTab="tasks" onTabChange={handleTabChange} />

      {/* Task List */}
      <Box sx={{ p: 3 }}>
        <TaskList status={status} onStatusChange={setStatus} />
      </Box>
    </>
  );
};
