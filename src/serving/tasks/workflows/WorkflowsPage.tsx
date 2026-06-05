import { Grid, Typography, Card, CardContent, Stack, Box, Button, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import React from "react";
import { Locale, Loading, PageHeader } from "@churchapps/apphelper";
import { EmptyState } from "../../../components/ui/EmptyState";
import { TasksNavigation } from "../components/TasksNavigation";
import { WorkflowEdit } from "./components/WorkflowEdit";
import { type WorkflowInterface, type WorkflowCategoryInterface } from "./interfaces";
import { useQuery } from "@tanstack/react-query";
import { ViewKanban as WorkflowsIcon, Add as AddIcon, Assignment as MyCardsIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

export const WorkflowsPage = () => {
  const [showAdd, setShowAdd] = React.useState(false);
  const navigate = useNavigate();

  const workflows = useQuery<WorkflowInterface[]>({ queryKey: ["/workflows", "DoingApi"], placeholderData: [] });
  const categories = useQuery<WorkflowCategoryInterface[]>({ queryKey: ["/workflowCategories", "DoingApi"], placeholderData: [] });

  const handleTabChange = (tab: string) => {
    if (tab === "tasks") navigate("/serving/tasks");
    else if (tab === "automations") navigate("/serving/tasks/automations");
  };

  const handleAdded = (workflow: WorkflowInterface) => {
    setShowAdd(false);
    workflows.refetch();
    if (workflow?.id) navigate("/serving/tasks/workflows/" + workflow.id);
  };

  const getGroupedList = () => {
    if (workflows.isLoading) return <Loading />;
    if (!workflows.data || workflows.data.length === 0) {
      return <EmptyState icon={<WorkflowsIcon />} title={Locale.label("tasks.workflowsPage.noWorkflows")} />;
    }

    const catName = (id?: string) => categories.data?.find((c) => c.id === id)?.name || Locale.label("tasks.workflowCategories.uncategorized");
    const groups: Record<string, WorkflowInterface[]> = {};
    workflows.data.forEach((w) => {
      const key = catName(w.categoryId);
      (groups[key] = groups[key] || []).push(w);
    });

    return (
      <>
        {Object.keys(groups).map((group) => (
          <Box key={group} sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ px: 1, py: 0.5, fontWeight: 600 }}>{group}</Typography>
            <List sx={{ p: 0 }}>
              {groups[group].map((workflow) => (
                <ListItem key={workflow.id} disablePadding>
                  <ListItemButton
                    data-testid={"workflow-row-" + workflow.id}
                    onClick={() => navigate("/serving/tasks/workflows/" + workflow.id)}
                    sx={{ borderRadius: 1, mb: 1, border: "1px solid", borderColor: "divider", "&:hover": { borderColor: "primary.main", backgroundColor: "action.hover" } }}>
                    <ListItemIcon><WorkflowsIcon sx={{ color: workflow.active ? "primary.main" : "grey.400" }} /></ListItemIcon>
                    <ListItemText
                      primary={<Typography variant="h6" sx={{ fontWeight: 600, fontSize: "1rem" }}>{workflow.name}</Typography>}
                      secondary={<Typography variant="body2" color="text.secondary">{workflow.active ? Locale.label("tasks.workflowEdit.active") : Locale.label("tasks.workflowEdit.inactive")}</Typography>}
                      slotProps={{ primary: { component: "div" }, secondary: { component: "div" } }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
        ))}
      </>
    );
  };

  return (
    <>
      <PageHeader title={Locale.label("tasks.workflowsPage.title")} subtitle={Locale.label("tasks.workflowsPage.subtitle")}>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<MyCardsIcon />} onClick={() => navigate("/serving/tasks/workflows/mine")} sx={{ color: "#FFF", borderColor: "rgba(255,255,255,0.5)", "&:hover": { borderColor: "#FFF" } }}>
            {Locale.label("tasks.myCards.title")}
          </Button>
          <Button variant="outlined" startIcon={<AddIcon />} data-testid="add-workflow-button" onClick={() => setShowAdd(true)} sx={{ color: "#FFF", borderColor: "rgba(255,255,255,0.5)", "&:hover": { borderColor: "#FFF", backgroundColor: "rgba(255,255,255,0.1)" } }}>
            {Locale.label("tasks.workflowsPage.addWorkflow")}
          </Button>
        </Stack>
      </PageHeader>
      <TasksNavigation selectedTab="workflows" onTabChange={handleTabChange} />

      <Box sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: showAdd ? 8 : 12 }}>
            <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                  <WorkflowsIcon sx={{ color: "primary.main" }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>{Locale.label("tasks.workflowsPage.title")}</Typography>
                </Stack>
                {getGroupedList()}
              </CardContent>
            </Card>
          </Grid>

          {showAdd && (
            <Grid size={{ xs: 12, md: 4 }}>
              <WorkflowEdit workflow={{ name: "", active: true }} categories={categories.data} onCancel={() => setShowAdd(false)} onSave={handleAdded} />
            </Grid>
          )}
        </Grid>
      </Box>
    </>
  );
};
