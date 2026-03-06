import React from "react";
import { Box, Container, Grid, Typography } from "@mui/material";
import { CameraAlt, Groups, VolunteerActivism, Event, PhoneIphone, Person } from "@mui/icons-material";
import { UserHelper, Permissions } from "@churchapps/apphelper";
import { PageHeader } from "@churchapps/apphelper";
import { FeatureCard } from "./FeatureCard";
import { EnvironmentHelper } from "../../helpers/EnvironmentHelper";

export const MemberWelcome: React.FC = () => {
  const churchName = UserHelper.currentUserChurch?.church?.name || "your church";
  const subDomain = UserHelper.currentUserChurch?.church?.subDomain || "";
  const b1Url = EnvironmentHelper.B1Url.replace("{subdomain}", subDomain);

  return (
    <>
      <PageHeader
        title={`Welcome to ${churchName}!`}
        subtitle="Here are some things you can do to get connected."
      />
      <Container maxWidth="xl">
        <Box sx={{ py: 4 }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Get started by completing your profile and exploring what your church has to offer.
          </Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FeatureCard icon={<CameraAlt fontSize="large" />} title="Add Your Photo" description="Upload a profile photo so people at church can recognize you and put a face to your name." linkUrl={b1Url + "/my/community?id=" + UserHelper.person?.id + "#edit"} external />
            </Grid>
            {UserHelper.checkAccess(Permissions.membershipApi.people.view) && (
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <FeatureCard icon={<Person fontSize="large" />} title="Find People You Know" description="Search the church directory to find and connect with others in the congregation." linkUrl="/people" />
              </Grid>
            )}
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FeatureCard icon={<Groups fontSize="large" />} title="Join a Group" description="Browse small groups, classes, and serving teams to find your community." linkUrl={b1Url + "/groups"} external />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FeatureCard icon={<VolunteerActivism fontSize="large" />} title="Set Up Online Giving" description="Give online quickly and easily, and optionally set up recurring donations." linkUrl={b1Url + "/donate"} external />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FeatureCard icon={<Event fontSize="large" />} title="See What's Happening" description="Check out upcoming events, service times, and ways to get involved." linkUrl={b1Url} external />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FeatureCard icon={<PhoneIphone fontSize="large" />} title="Download the Mobile App" description="Get the B1.church app on your phone to stay connected wherever you go." linkUrl="https://b1.church/app" external />
            </Grid>
          </Grid>
        </Box>
      </Container>
    </>
  );
};
