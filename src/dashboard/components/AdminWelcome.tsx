import React from "react";
import { Grid, Stack, Typography } from "@mui/material";
import { Image, Language, VolunteerActivism, MusicNote, Person, Groups, LiveTv, Lock, CameraAlt, SmartDisplay } from "@mui/icons-material";
import { ApiHelper, UserHelper, Locale } from "@churchapps/apphelper";
import { QuickActionItem } from "./QuickActionItem";
import { QuickSetupModal, type WizardType } from "./QuickSetupModal";
import { EnvironmentHelper } from "../../helpers/EnvironmentHelper";
import { useNavigate } from "react-router-dom";
import { GRID_SIZES } from "../../components/ui/layoutPresets";

export const AdminWelcome: React.FC = () => {
  const navigate = useNavigate();
  const subDomain = UserHelper.currentUserChurch?.church?.subDomain || "";
  const b1Url = EnvironmentHelper.B1Url.replace("{subdomain}", subDomain);
  const [wizardType, setWizardType] = React.useState<WizardType | null>(null);
  const [hasTeams, setHasTeams] = React.useState<boolean | null>(null);
  const [hasPages, setHasPages] = React.useState<boolean | null>(null);
  const [hasGroups, setHasGroups] = React.useState<boolean | null>(null);
  const [hasPlanTypes, setHasPlanTypes] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    ApiHelper.get("/groups/tag/team", "MembershipApi").then((data) => setHasTeams(data?.length > 0)).catch(() => setHasTeams(false));
    ApiHelper.get("/pages", "ContentApi").then((data) => setHasPages(data?.length > 0)).catch(() => setHasPages(false));
    ApiHelper.get("/groups/tag/standard", "MembershipApi").then((data) => setHasGroups(data?.length > 0)).catch(() => setHasGroups(false));
    ApiHelper.get("/planTypes", "DoingApi").then((data) => setHasPlanTypes(data?.length > 0)).catch(() => setHasPlanTypes(false));
  }, []);

  const handleCardClick = (wizardKey: WizardType, existsAlready: boolean | null, fallbackUrl: string) => {
    if (existsAlready) {
      navigate(fallbackUrl);
    } else {
      setWizardType(wizardKey);
    }
  };

  const handleWizardComplete = (redirectUrl: string) => {
    setWizardType(null);
    navigate(redirectUrl);
  };

  const sections = [
    {
      label: Locale.label("dashboard.adminWelcome.yourChurch"),
      items: [
        { icon: <Image fontSize="small" />, title: Locale.label("dashboard.adminWelcome.addLogoTitle"), linkUrl: "/site/appearance#logo" },
        { icon: <Language fontSize="small" />, title: Locale.label("dashboard.adminWelcome.createWebpageTitle"), onClick: () => handleCardClick("webpage", hasPages, "/site/pages") },
        { icon: <VolunteerActivism fontSize="small" />, title: Locale.label("dashboard.adminWelcome.onlineGivingTitle"), linkUrl: "/settings#giving" }
      ]
    },
    {
      label: Locale.label("dashboard.adminWelcome.servingAndContent"),
      items: [
        { icon: <MusicNote fontSize="small" />, title: Locale.label("dashboard.adminWelcome.freeShowTitle"), onClick: () => handleCardClick("freeshow", hasTeams, "/serving") },
        { icon: <SmartDisplay fontSize="small" />, title: Locale.label("dashboard.adminWelcome.freePlayTitle"), onClick: () => handleCardClick("freeplay", hasPlanTypes, "/serving") },
        { icon: <LiveTv fontSize="small" />, title: Locale.label("dashboard.adminWelcome.uploadSermonTitle"), linkUrl: "/sermons" }
      ]
    },
    {
      label: Locale.label("dashboard.adminWelcome.peopleAndGroups"),
      items: [
        { icon: <Person fontSize="small" />, title: Locale.label("dashboard.adminWelcome.addCongregationTitle"), linkUrl: "/people" },
        { icon: <Groups fontSize="small" />, title: Locale.label("dashboard.adminWelcome.createGroupTitle"), onClick: () => handleCardClick("group", hasGroups, "/groups") },
        { icon: <Lock fontSize="small" />, title: Locale.label("dashboard.adminWelcome.inviteTeamTitle"), linkUrl: "/settings/roles" }
      ]
    },
    {
      label: Locale.label("dashboard.adminWelcome.yourProfile"),
      items: [{ icon: <CameraAlt fontSize="small" />, title: Locale.label("dashboard.adminWelcome.setAvatarTitle"), linkUrl: b1Url + "/mobile/community?id=" + UserHelper.person?.id + "#edit", external: true }]
    }
  ];

  return (
    <>
      <Grid container spacing={2}>
        {sections.map((section) => (
          <Grid key={section.label} size={GRID_SIZES.fourColumn}>
            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>{section.label}</Typography>
            <Stack sx={{ mt: 0.5 }}>
              {section.items.map((item) => (
                <QuickActionItem key={item.title} icon={item.icon} title={item.title} linkUrl={item.linkUrl} external={item.external} onClick={item.onClick} />
              ))}
            </Stack>
          </Grid>
        ))}
      </Grid>

      {wizardType && (
        <QuickSetupModal wizardType={wizardType} open={true} onClose={() => setWizardType(null)} onComplete={handleWizardComplete} />
      )}
    </>
  );
};
