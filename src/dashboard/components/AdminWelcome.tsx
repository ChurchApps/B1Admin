import React from "react";
import { Box, Container, Grid, Typography } from "@mui/material";
import { Image, Language, VolunteerActivism, MusicNote, Person, Groups, LiveTv, Lock, CameraAlt, SmartDisplay } from "@mui/icons-material";
import { ApiHelper, UserHelper } from "@churchapps/apphelper";
import { PageHeader } from "@churchapps/apphelper";
import { FeatureCard } from "./FeatureCard";
import { QuickSetupModal, type WizardType } from "./QuickSetupModal";
import { EnvironmentHelper } from "../../helpers/EnvironmentHelper";
import { useNavigate } from "react-router-dom";

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
        title="Welcome to B1.church!"
        subtitle="Let's get your church set up. Here are some things you'll likely want to do first."
      />
      <Container maxWidth="xl">
        <Box sx={{ py: 4 }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Click any card below to get started. You can always find these in the menu later.
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>Your Church</Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FeatureCard icon={<Image fontSize="small" />} title="Add Your Church Logo" description="Upload your logo and update your church's contact information." linkUrl="/site/appearance#logo" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FeatureCard icon={<Language fontSize="small" />} title="Create Your First Webpage" description="Build a public website where visitors can learn about you." onClick={() => handleCardClick("webpage", hasPages, "/site/pages")} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FeatureCard icon={<VolunteerActivism fontSize="small" />} title="Set Up Online Giving" description="Connect Stripe so your congregation can give online." linkUrl="/settings#giving" />
            </Grid>
          </Grid>

          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>Serving & Content</Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FeatureCard icon={<MusicNote fontSize="small" />} title="Set Up FreeShow Backups" description="Connect FreeShow to back up your songs and service plans." onClick={() => handleCardClick("freeshow", hasTeams, "/serving")} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FeatureCard icon={<SmartDisplay fontSize="small" />} title="Set Up Your FreePlay Classroom" description="Create a ministry and classroom for FreePlay lessons on your TV." onClick={() => handleCardClick("freeplay", hasPlanTypes, "/serving")} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FeatureCard icon={<LiveTv fontSize="small" />} title="Upload a Sermon" description="Share your sermons online so people can watch anytime." linkUrl="/sermons" />
            </Grid>
          </Grid>

          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>People & Groups</Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FeatureCard icon={<Person fontSize="small" />} title="Add Your Congregation" description="Import or add your people to track attendance, groups, and giving." linkUrl="/people" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FeatureCard icon={<Groups fontSize="small" />} title="Create Your First Group" description="Set up small groups, classes, or serving teams." onClick={() => handleCardClick("group", hasGroups, "/groups")} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FeatureCard icon={<Lock fontSize="small" />} title="Invite Team Members" description="Add staff and volunteers as admins to help manage things." linkUrl="/settings#roles" />
            </Grid>
          </Grid>

          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>Your Profile</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FeatureCard icon={<CameraAlt fontSize="small" />} title="Set Your Avatar" description="Upload a profile photo so your team can recognize you." linkUrl={b1Url + "/my/community?id=" + UserHelper.person?.id + "#edit"} external />
            </Grid>
          </Grid>
        </Box>
      </Container>

      {wizardType && (
        <QuickSetupModal wizardType={wizardType} open={true} onClose={() => setWizardType(null)} onComplete={handleWizardComplete} />
      )}
    </>
  );
};
