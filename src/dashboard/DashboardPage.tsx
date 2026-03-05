import React from "react";
import { Box, Stack, Container, Grid } from "@mui/material";
import { TaskList } from "../serving/tasks/components/TaskList";
import { PeopleSearch } from "./components";
import { Groups } from "../people/components";
import { UserHelper, Locale, Permissions } from "@churchapps/apphelper";
import UserContext from "../UserContext";
import { AdminWelcome } from "./components/AdminWelcome";
import { MemberWelcome } from "./components/MemberWelcome";

// TODO: Restore new-user-only conditions before production release:
//   Admin: church.registrationDate < 30 days
//   Member: person.membershipStatus === "Guest"
// Currently showing to all users for testing/review.

export const DashboardPage = () => {
  const context = React.useContext(UserContext);

  const churchId = UserHelper.currentUserChurch?.church?.id;
  const personId = context.person?.id || UserHelper.person?.id;

  const isDomainAdmin = UserHelper.checkAccess(Permissions.membershipApi.settings.edit)
    && UserHelper.checkAccess(Permissions.membershipApi.roles.edit)
    && UserHelper.checkAccess(Permissions.givingApi.settings.edit)
    && UserHelper.checkAccess(Permissions.contentApi.content.edit);

  const adminKey = `b1admin-welcome-dismissed-${churchId}`;
  const memberKey = `b1admin-welcome-dismissed-${churchId}-${personId}`;
  const wasDismissed = localStorage.getItem(isDomainAdmin ? adminKey : memberKey) === "true";

  const showAdminWelcome = isDomainAdmin && !wasDismissed;
  const showMemberWelcome = !isDomainAdmin && !wasDismissed;

  return (
    <>
      {showAdminWelcome && <AdminWelcome />}
      {showMemberWelcome && <MemberWelcome />}

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
