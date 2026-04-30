import React from "react";
import { Grid, Typography } from "@mui/material";
import { CameraAlt, Groups, VolunteerActivism, Event, PhoneIphone, Person } from "@mui/icons-material";
import { UserHelper, Permissions, Locale } from "@churchapps/apphelper";
import { PageHeader } from "@churchapps/apphelper";
import type { IApiPermission } from "@churchapps/helpers";
import { FeatureCard } from "./FeatureCard";
import { EnvironmentHelper } from "../../helpers/EnvironmentHelper";
import { PageContainer } from "../../components/ui/PageContainer";
import { GRID_SIZES } from "../../components/ui/layoutPresets";

interface MemberCard {
  icon: React.ReactNode;
  title: string;
  description: string;
  linkUrl: string;
  external?: boolean;
  permission?: IApiPermission;
}

export const MemberWelcome: React.FC = () => {
  const churchName = UserHelper.currentUserChurch?.church?.name || Locale.label("dashboard.memberWelcome.fallbackChurchName");
  const subDomain = UserHelper.currentUserChurch?.church?.subDomain || "";
  const b1Url = EnvironmentHelper.B1Url.replace("{subdomain}", subDomain);

  const cards: MemberCard[] = [
    { icon: <CameraAlt />, title: Locale.label("dashboard.memberWelcome.setPhotoTitle"), description: Locale.label("dashboard.memberWelcome.setPhotoDesc"), linkUrl: b1Url + "/mobile/community?id=" + UserHelper.person?.id + "#edit", external: true },
    { icon: <Person />, title: Locale.label("dashboard.memberWelcome.findPeopleTitle"), description: Locale.label("dashboard.memberWelcome.findPeopleDesc"), linkUrl: "/people", permission: Permissions.membershipApi.people.view },
    { icon: <Groups />, title: Locale.label("dashboard.memberWelcome.joinGroupTitle"), description: Locale.label("dashboard.memberWelcome.joinGroupDesc"), linkUrl: b1Url + "/groups", external: true },
    { icon: <VolunteerActivism />, title: Locale.label("dashboard.memberWelcome.onlineGivingTitle"), description: Locale.label("dashboard.memberWelcome.onlineGivingDesc"), linkUrl: b1Url + "/donate", external: true },
    { icon: <Event />, title: Locale.label("dashboard.memberWelcome.upcomingEventsTitle"), description: Locale.label("dashboard.memberWelcome.upcomingEventsDesc"), linkUrl: b1Url, external: true },
    { icon: <PhoneIphone />, title: Locale.label("dashboard.memberWelcome.downloadAppTitle"), description: Locale.label("dashboard.memberWelcome.downloadAppDesc"), linkUrl: "https://b1.church/app", external: true }
  ];

  const visibleCards = cards.filter((c) => !c.permission || UserHelper.checkAccess(c.permission));

  return (
    <>
      <PageHeader
        title={Locale.label("dashboard.memberWelcome.title").replace("{churchName}", churchName)}
        subtitle={Locale.label("dashboard.memberWelcome.subtitle")}
      />
      <PageContainer py={4}>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {Locale.label("dashboard.memberWelcome.intro")}
        </Typography>
        <Grid container spacing={2}>
          {visibleCards.map((card) => (
            <Grid key={card.title} size={GRID_SIZES.threeColumn}>
              <FeatureCard icon={card.icon} title={card.title} description={card.description} linkUrl={card.linkUrl} external={card.external} />
            </Grid>
          ))}
        </Grid>
      </PageContainer>
    </>
  );
};
