import React from "react";
import { Stack, Grid, Box } from "@mui/material";
import { FlashOn } from "@mui/icons-material";
import { TaskList } from "../serving/tasks/components/TaskList";
import { PeopleSearch, AdminWelcome, MemberWelcome } from "./components";
import { Groups } from "../people/components";
import { UserHelper, Permissions, Locale, PageHeader } from "@churchapps/apphelper";
import { PageContainer } from "../components/ui/PageContainer";
import { CardWithHeader } from "../components/ui/CardWithHeader";
import { GRID_SIZES } from "../components/ui/layoutPresets";

export const DashboardPage = () => {
  const isDomainAdmin = UserHelper.checkAccess(Permissions.membershipApi.settings.edit)
    && UserHelper.checkAccess(Permissions.membershipApi.roles.edit)
    && UserHelper.checkAccess(Permissions.givingApi.settings.edit)
    && UserHelper.checkAccess(Permissions.contentApi.content.edit);

  const canViewPeople = UserHelper.checkAccess(Permissions.membershipApi.people.view);

  const churchName = UserHelper.currentUserChurch?.church?.name || Locale.label("dashboard.memberWelcome.fallbackChurchName");
  const headerTitle = isDomainAdmin
    ? Locale.label("dashboard.adminWelcome.title")
    : Locale.label("dashboard.memberWelcome.title").replace("{churchName}", churchName);
  const headerSubtitle = isDomainAdmin
    ? Locale.label("dashboard.adminWelcome.subtitle")
    : Locale.label("dashboard.memberWelcome.subtitle");

  return (
    <>
      <PageHeader title={headerTitle} subtitle={headerSubtitle} />
      <PageContainer>
        <Box sx={{ mb: 3 }}>
          <CardWithHeader title={Locale.label("helpers.secondaryMenuHelper.quickActions")} icon={<FlashOn sx={{ color: "primary.main" }} />}>
            {isDomainAdmin ? <AdminWelcome /> : <MemberWelcome />}
          </CardWithHeader>
        </Box>

        <Stack spacing={3}>
          {canViewPeople && <PeopleSearch />}
          <Grid container spacing={3}>
            <Grid size={GRID_SIZES.sidebar}>
              <Groups personId={UserHelper.person?.id} title={Locale.label("dashboard.myGroups")} />
            </Grid>
            <Grid size={GRID_SIZES.mainContent}>
              <TaskList compact={true} status={Locale.label("tasks.taskPage.open")} />
            </Grid>
          </Grid>
        </Stack>
      </PageContainer>
    </>
  );
};
