import React from "react";
import { Locale, PageHeader } from "@churchapps/apphelper";
import { TaskList } from "./components/TaskList";
import { Box } from "@mui/material";

export const TasksPage = () => {
  const [status, setStatus] = React.useState("Open");

  return (
    <>
      <PageHeader title={Locale.label("tasks.tasksPage.tasks")} subtitle={Locale.label("tasks.tasksPage.subtitle")} />

      {/* Task List */}
      <Box sx={{ p: 3 }}>
        <TaskList status={status} onStatusChange={setStatus} />
      </Box>
    </>
  );
};
