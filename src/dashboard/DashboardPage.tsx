import React from "react";
import { Stack, Grid } from "@mui/material";
import { TaskList } from "../serving/tasks/components/TaskList";
import { PeopleSearch } from "./components";
import { PendingRequestsBadge } from "./components/PendingRequestsBadge";
import { Groups } from "../people/components";
import { UserHelper, Locale, PageHeader } from "@churchapps/apphelper";
import { PageContainer } from "../components/ui/PageContainer";
import { GRID_SIZES } from "../components/ui/layoutPresets";

export const DashboardPage = () => (
  <>
    <PageHeader title={Locale.label("components.wrapper.dash")} />
    <PageContainer>
      <Grid container spacing={3}>
        <Grid size={GRID_SIZES.mainContent}>
          <Stack spacing={3}>
            <PeopleSearch />
            <Groups personId={UserHelper.person?.id} title={Locale.label("dashboard.myGroups")} />
          </Stack>
        </Grid>
        <Grid size={GRID_SIZES.sidebar}>
          <Stack spacing={3}>
            <PendingRequestsBadge />
            <TaskList compact={true} status={Locale.label("tasks.taskPage.open")} />
          </Stack>
        </Grid>
      </Grid>
    </PageContainer>
  </>
);
