import React from "react";
import { Grid, Typography } from "@mui/material";
import { Image, Language, VolunteerActivism, MusicNote, Person, Groups, LiveTv, Lock, CameraAlt, SmartDisplay } from "@mui/icons-material";
import { ApiHelper, UserHelper, Locale } from "@churchapps/apphelper";
import { PageHeader } from "@churchapps/apphelper";
import { FeatureCard } from "./FeatureCard";
import { QuickSetupModal, type WizardType } from "./QuickSetupModal";
import { EnvironmentHelper } from "../../helpers/EnvironmentHelper";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "../../components/ui/PageContainer";
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

  return (
    <>
      <PageHeader
        title={Locale.label("dashboard.adminWelcome.title")}
        subtitle={Locale.label("dashboard.adminWelcome.subtitle")}
      />
      <PageContainer py={4}>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {Locale.label("dashboard.adminWelcome.intro")}
        </Typography>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>{Locale.label("dashboard.adminWelcome.yourChurch")}</Typography>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={GRID_SIZES.threeColumn}>
            <FeatureCard icon={<Image fontSize="small" />} title={Locale.label("dashboard.adminWelcome.addLogoTitle")} description={Locale.label("dashboard.adminWelcome.addLogoDesc")} linkUrl="/site/appearance#logo" />
          </Grid>
          <Grid size={GRID_SIZES.threeColumn}>
            <FeatureCard icon={<Language fontSize="small" />} title={Locale.label("dashboard.adminWelcome.createWebpageTitle")} description={Locale.label("dashboard.adminWelcome.createWebpageDesc")} onClick={() => handleCardClick("webpage", hasPages, "/site/pages")} />
          </Grid>
          <Grid size={GRID_SIZES.threeColumn}>
            <FeatureCard icon={<VolunteerActivism fontSize="small" />} title={Locale.label("dashboard.adminWelcome.onlineGivingTitle")} description={Locale.label("dashboard.adminWelcome.onlineGivingDesc")} linkUrl="/settings#giving" />
          </Grid>
        </Grid>

        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>{Locale.label("dashboard.adminWelcome.servingAndContent")}</Typography>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={GRID_SIZES.threeColumn}>
            <FeatureCard icon={<MusicNote fontSize="small" />} title={Locale.label("dashboard.adminWelcome.freeShowTitle")} description={Locale.label("dashboard.adminWelcome.freeShowDesc")} onClick={() => handleCardClick("freeshow", hasTeams, "/serving")} />
          </Grid>
          <Grid size={GRID_SIZES.threeColumn}>
            <FeatureCard icon={<SmartDisplay fontSize="small" />} title={Locale.label("dashboard.adminWelcome.freePlayTitle")} description={Locale.label("dashboard.adminWelcome.freePlayDesc")} onClick={() => handleCardClick("freeplay", hasPlanTypes, "/serving")} />
          </Grid>
          <Grid size={GRID_SIZES.threeColumn}>
            <FeatureCard icon={<LiveTv fontSize="small" />} title={Locale.label("dashboard.adminWelcome.uploadSermonTitle")} description={Locale.label("dashboard.adminWelcome.uploadSermonDesc")} linkUrl="/sermons" />
          </Grid>
        </Grid>

        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>{Locale.label("dashboard.adminWelcome.peopleAndGroups")}</Typography>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={GRID_SIZES.threeColumn}>
            <FeatureCard icon={<Person fontSize="small" />} title={Locale.label("dashboard.adminWelcome.addCongregationTitle")} description={Locale.label("dashboard.adminWelcome.addCongregationDesc")} linkUrl="/people" />
          </Grid>
          <Grid size={GRID_SIZES.threeColumn}>
            <FeatureCard icon={<Groups fontSize="small" />} title={Locale.label("dashboard.adminWelcome.createGroupTitle")} description={Locale.label("dashboard.adminWelcome.createGroupDesc")} onClick={() => handleCardClick("group", hasGroups, "/groups")} />
          </Grid>
          <Grid size={GRID_SIZES.threeColumn}>
            <FeatureCard icon={<Lock fontSize="small" />} title={Locale.label("dashboard.adminWelcome.inviteTeamTitle")} description={Locale.label("dashboard.adminWelcome.inviteTeamDesc")} linkUrl="/settings#roles" />
          </Grid>
        </Grid>

        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>{Locale.label("dashboard.adminWelcome.yourProfile")}</Typography>
        <Grid container spacing={2}>
          <Grid size={GRID_SIZES.threeColumn}>
            <FeatureCard icon={<CameraAlt fontSize="small" />} title={Locale.label("dashboard.adminWelcome.setAvatarTitle")} description={Locale.label("dashboard.adminWelcome.setAvatarDesc")} linkUrl={b1Url + "/mobile/community?id=" + UserHelper.person?.id + "#edit"} external />
          </Grid>
        </Grid>
      </PageContainer>

      {wizardType && (
        <QuickSetupModal wizardType={wizardType} open={true} onClose={() => setWizardType(null)} onComplete={handleWizardComplete} />
      )}
    </>
  );
};
