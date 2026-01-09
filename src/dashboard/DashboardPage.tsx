import React from "react";
import { Box, Stack, Container, Grid } from "@mui/material";
import { Dashboard as DashboardIcon } from "@mui/icons-material";
import { TaskList } from "../serving/tasks/components/TaskList";
import { PeopleSearch } from "./components";
import { Groups } from "../people/components";
import { UserHelper, Locale, PageHeader } from "@churchapps/apphelper";

export const DashboardPage = () => {
  return (
    <>
      <PageHeader
        icon={<DashboardIcon />}
        title={`B1.church ${Locale.label("dashboard.dashboardPage.dash")}`}
        subtitle={Locale.label("dashboard.dashboardPage.subtitle")}
      />

      <Container maxWidth="xl">
        <Box sx={{ py: 3 }}>
          {/* Dashboard Content */}
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Stack spacing={3}>
                <PeopleSearch />
                <Groups personId={UserHelper.person?.id} title={Locale.label("dashboard.myGroups")} />
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TaskList compact={true} status={Locale.label("tasks.taskPage.open")} />
            </Grid>
          </Grid>
        </Box>
      </Container>
    </>
  );
};
