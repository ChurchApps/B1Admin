import React from "react";
import { Box, Container, Grid, Typography } from "@mui/material";
import { CameraAlt, Groups, VolunteerActivism, Event, PhoneIphone, Person } from "@mui/icons-material";
import { UserHelper, Permissions, Locale } from "@churchapps/apphelper";
import { PageHeader } from "@churchapps/apphelper";
import { FeatureCard } from "./FeatureCard";
import { EnvironmentHelper } from "../../helpers/EnvironmentHelper";

export const MemberWelcome: React.FC = () => {
  const churchName = UserHelper.currentUserChurch?.church?.name || Locale.label("dashboard.memberWelcome.fallbackChurchName");
  const subDomain = UserHelper.currentUserChurch?.church?.subDomain || "";
  const b1Url = EnvironmentHelper.B1Url.replace("{subdomain}", subDomain);

  return (
    <>
      <PageHeader
        title={Locale.label("dashboard.memberWelcome.title").replace("{churchName}", churchName)}
        subtitle={Locale.label("dashboard.memberWelcome.subtitle")}
      />
      <Container maxWidth="xl">
        <Box sx={{ py: 4 }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {Locale.label("dashboard.memberWelcome.intro")}
          </Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FeatureCard icon={<CameraAlt fontSize="small" />} title={Locale.label("dashboard.memberWelcome.setPhotoTitle")} description={Locale.label("dashboard.memberWelcome.setPhotoDesc")} linkUrl={b1Url + "/mobile/community?id=" + UserHelper.person?.id + "#edit"} external />
            </Grid>
            {UserHelper.checkAccess(Permissions.membershipApi.people.view) && (
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <FeatureCard icon={<Person fontSize="small" />} title={Locale.label("dashboard.memberWelcome.findPeopleTitle")} description={Locale.label("dashboard.memberWelcome.findPeopleDesc")} linkUrl="/people" />
              </Grid>
            )}
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FeatureCard icon={<Groups fontSize="small" />} title={Locale.label("dashboard.memberWelcome.joinGroupTitle")} description={Locale.label("dashboard.memberWelcome.joinGroupDesc")} linkUrl={b1Url + "/groups"} external />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FeatureCard icon={<VolunteerActivism fontSize="small" />} title={Locale.label("dashboard.memberWelcome.onlineGivingTitle")} description={Locale.label("dashboard.memberWelcome.onlineGivingDesc")} linkUrl={b1Url + "/donate"} external />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FeatureCard icon={<Event fontSize="small" />} title={Locale.label("dashboard.memberWelcome.upcomingEventsTitle")} description={Locale.label("dashboard.memberWelcome.upcomingEventsDesc")} linkUrl={b1Url} external />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FeatureCard icon={<PhoneIphone fontSize="small" />} title={Locale.label("dashboard.memberWelcome.downloadAppTitle")} description={Locale.label("dashboard.memberWelcome.downloadAppDesc")} linkUrl="https://b1.church/app" external />
            </Grid>
          </Grid>
        </Box>
      </Container>
    </>
  );
};
