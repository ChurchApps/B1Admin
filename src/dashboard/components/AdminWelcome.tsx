import React from "react";
import { Box, Grid, Stack, Typography } from "@mui/material";
import { Image, Language, VolunteerActivism, MusicNote, Person, Groups, LiveTv, Lock, CameraAlt, SmartDisplay } from "@mui/icons-material";
import { UserHelper, Locale } from "@churchapps/apphelper";
import { PageHeader } from "@churchapps/apphelper";
import { FeatureCard } from "./FeatureCard";
import { QuickSetupModal, type WizardType } from "./QuickSetupModal";
import { EnvironmentHelper } from "../../helpers/EnvironmentHelper";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "../../components/ui/PageContainer";
import { GRID_SIZES } from "../../components/ui/layoutPresets";

type AdminCard =
  | { kind: "link"; icon: React.ReactNode; title: string; description: string; url: string; external?: boolean }
  | { kind: "wizard"; icon: React.ReactNode; title: string; description: string; wizard: WizardType };

interface AdminSection {
  heading: string;
  cards: AdminCard[];
}

export const AdminWelcome: React.FC = () => {
  const navigate = useNavigate();
  const subDomain = UserHelper.currentUserChurch?.church?.subDomain || "";
  const b1Url = EnvironmentHelper.B1Url.replace("{subdomain}", subDomain);
  const [wizardType, setWizardType] = React.useState<WizardType | null>(null);

  const sections: AdminSection[] = [
    {
      heading: Locale.label("dashboard.adminWelcome.yourChurch"),
      cards: [
        { kind: "link", icon: <Image />, title: Locale.label("dashboard.adminWelcome.addLogoTitle"), description: Locale.label("dashboard.adminWelcome.addLogoDesc"), url: "/site/appearance#logo" },
        { kind: "wizard", icon: <Language />, title: Locale.label("dashboard.adminWelcome.createWebpageTitle"), description: Locale.label("dashboard.adminWelcome.createWebpageDesc"), wizard: "webpage" },
        { kind: "link", icon: <VolunteerActivism />, title: Locale.label("dashboard.adminWelcome.onlineGivingTitle"), description: Locale.label("dashboard.adminWelcome.onlineGivingDesc"), url: "/settings#giving" }
      ]
    },
    {
      heading: Locale.label("dashboard.adminWelcome.servingAndContent"),
      cards: [
        { kind: "wizard", icon: <MusicNote />, title: Locale.label("dashboard.adminWelcome.freeShowTitle"), description: Locale.label("dashboard.adminWelcome.freeShowDesc"), wizard: "freeshow" },
        { kind: "wizard", icon: <SmartDisplay />, title: Locale.label("dashboard.adminWelcome.freePlayTitle"), description: Locale.label("dashboard.adminWelcome.freePlayDesc"), wizard: "freeplay" },
        { kind: "link", icon: <LiveTv />, title: Locale.label("dashboard.adminWelcome.uploadSermonTitle"), description: Locale.label("dashboard.adminWelcome.uploadSermonDesc"), url: "/sermons" }
      ]
    },
    {
      heading: Locale.label("dashboard.adminWelcome.peopleAndGroups"),
      cards: [
        { kind: "link", icon: <Person />, title: Locale.label("dashboard.adminWelcome.addCongregationTitle"), description: Locale.label("dashboard.adminWelcome.addCongregationDesc"), url: "/people" },
        { kind: "wizard", icon: <Groups />, title: Locale.label("dashboard.adminWelcome.createGroupTitle"), description: Locale.label("dashboard.adminWelcome.createGroupDesc"), wizard: "group" },
        { kind: "link", icon: <Lock />, title: Locale.label("dashboard.adminWelcome.inviteTeamTitle"), description: Locale.label("dashboard.adminWelcome.inviteTeamDesc"), url: "/settings#roles" }
      ]
    },
    {
      heading: Locale.label("dashboard.adminWelcome.yourProfile"),
      cards: [
        { kind: "link", icon: <CameraAlt />, title: Locale.label("dashboard.adminWelcome.setAvatarTitle"), description: Locale.label("dashboard.adminWelcome.setAvatarDesc"), url: b1Url + "/mobile/community?id=" + UserHelper.person?.id + "#edit", external: true }
      ]
    }
  ];

  const handleWizardComplete = (redirectUrl: string) => {
    setWizardType(null);
    navigate(redirectUrl);
  };

  const renderCard = (card: AdminCard) => {
    const common = { icon: card.icon, title: card.title, description: card.description };
    if (card.kind === "link") return <FeatureCard {...common} linkUrl={card.url} external={card.external} />;
    return <FeatureCard {...common} onClick={() => setWizardType(card.wizard)} />;
  };

  return (
    <>
      <PageHeader
        title={Locale.label("dashboard.adminWelcome.title")}
        subtitle={Locale.label("dashboard.adminWelcome.subtitle")}
      />
      <PageContainer py={4}>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          {Locale.label("dashboard.adminWelcome.intro")}
        </Typography>

        <Stack spacing={4}>
          {sections.map((section) => (
            <Box key={section.heading}>
              <Typography
                variant="overline"
                sx={(theme) => ({
                  display: "block",
                  color: theme.palette.primary.main,
                  fontWeight: 700,
                  letterSpacing: 1,
                  mb: 1.5,
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  pb: 1
                })}
              >
                {section.heading}
              </Typography>
              <Grid container spacing={2}>
                {section.cards.map((card) => (
                  <Grid key={card.title} size={GRID_SIZES.threeColumn}>
                    {renderCard(card)}
                  </Grid>
                ))}
              </Grid>
            </Box>
          ))}
        </Stack>
      </PageContainer>

      {wizardType && (
        <QuickSetupModal wizardType={wizardType} open={true} onClose={() => setWizardType(null)} onComplete={handleWizardComplete} />
      )}
    </>
  );
};
