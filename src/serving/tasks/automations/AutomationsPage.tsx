import { Grid, Typography, Card, CardContent, Stack, Box, Button, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import React from "react";
import { Locale, Loading, PageHeader } from "@churchapps/apphelper";
import { EmptyState } from "../../../components/ui/EmptyState";
import { type AutomationInterface } from "@churchapps/helpers";
import { AutomationDetails } from "./components/AutomationDetails";
import { AutomationEdit } from "./components/AutomationEdit";
import { useQuery } from "@tanstack/react-query";
import { SettingsSuggest as AutomationsIcon, Add as AddIcon, PlayCircle as ActiveIcon, PauseCircle as InactiveIcon } from "@mui/icons-material";

export const AutomationsPage = () => {
  const [showAdd, setShowAdd] = React.useState(false);
  const [editAutomation, setEditAutomation] = React.useState(null);

  const automations = useQuery<AutomationInterface[]>({
    queryKey: ["/automations", "DoingApi"],
    placeholderData: []
  });

  const getAutomationsList = () => {
    if (automations.isLoading) return <Loading />;

    if (automations.data?.length === 0) {
      return <EmptyState icon={<AutomationsIcon />} title={Locale.label("tasks.automationsPage.noAuto")} />;
    }

    return (
      <List sx={{ p: 0 }}>
        {automations.data?.map((automation) => (
          <ListItem key={automation.id} disablePadding>
            <ListItemButton
              onClick={() => setEditAutomation(automation)}
              sx={{
                borderRadius: 1,
                mb: 1,
                border: "1px solid",
                borderColor: "divider",
                "&:hover": {
                  borderColor: "primary.main",
                  backgroundColor: "action.hover"
                }
              }}>
              <ListItemIcon>{automation.active ? <ActiveIcon sx={{ color: "success.main" }} /> : <InactiveIcon sx={{ color: "grey.400" }} />}</ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "1rem" }}>
                    {automation.title}
                  </Typography>
                }
                secondary={
                  <Typography variant="body2" color="text.secondary">
                    {automation.active ? Locale.label("tasks.automationsPage.active") : Locale.label("tasks.automationsPage.inactive")} • {Locale.label("tasks.automationsPage.recurs")}: {automation.recurs}
                  </Typography>
                }
                slotProps={{
                  primary: { component: "div" },
                  secondary: { component: "div" }
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    );
  };

  const handleAdded = (automation: AutomationInterface) => {
    setShowAdd(false);
    setEditAutomation(automation);
    automations.refetch();
  };

  const handleDelete = () => {
    setEditAutomation(null);
    automations.refetch();
  };

  return (
    <>
      <PageHeader title={Locale.label("tasks.automationsPage.manageAuto")} subtitle={Locale.label("tasks.automationsPage.subtitle")}>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => {
            setShowAdd(true);
            setEditAutomation(null);
          }}
          sx={{
            color: "#FFF",
            borderColor: "rgba(255,255,255,0.5)",
            "&:hover": {
              borderColor: "#FFF",
              backgroundColor: "rgba(255,255,255,0.1)"
            }
          }}>
          {Locale.label("tasks.automationsPage.addAuto")}
        </Button>
      </PageHeader>

      {/* Automations Content */}
      <Box sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: editAutomation || showAdd ? 8 : 12 }}>
            <Card
              sx={{
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider"
              }}>
              <CardContent>
                {/* Header */}
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                  <AutomationsIcon sx={{ color: "primary.main" }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
                    {Locale.label("tasks.automationsPage.auto") || "Automated Tasks"}
                  </Typography>
                </Stack>

                {/* Content */}
                {getAutomationsList()}
              </CardContent>
            </Card>
          </Grid>

          {(showAdd || editAutomation) && (
            <Grid size={{ xs: 12, md: 4 }}>
              {showAdd && (
                <AutomationEdit
                  automation={{ title: "", active: true, recurs: "never" }}
                  onCancel={() => {
                    setShowAdd(false);
                  }}
                  onSave={handleAdded}
                />
              )}
              {editAutomation && <AutomationDetails automation={editAutomation} onChange={automations.refetch} onDelete={handleDelete} />}
            </Grid>
          )}
        </Grid>
      </Box>
    </>
  );
};
