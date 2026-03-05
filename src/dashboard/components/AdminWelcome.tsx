import React from "react";
import { Box, Container, Grid, Typography } from "@mui/material";
import { Image, Language, VolunteerActivism, MusicNote, Person, Groups, LiveTv, Lock } from "@mui/icons-material";
import { ApiHelper } from "@churchapps/apphelper";
import { WelcomeHeader } from "./WelcomeHeader";
import { FeatureCard } from "./FeatureCard";
import { QuickSetupModal, type WizardType } from "./QuickSetupModal";
import { useNavigate } from "react-router-dom";

export const AdminWelcome: React.FC = () => {
  const navigate = useNavigate();
  const [wizardType, setWizardType] = React.useState<WizardType | null>(null);
  const [hasTeams, setHasTeams] = React.useState<boolean | null>(null);
  const [hasPages, setHasPages] = React.useState<boolean | null>(null);
  const [hasGroups, setHasGroups] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    ApiHelper.get("/groups/tag/team", "MembershipApi").then((data) => setHasTeams(data?.length > 0)).catch(() => setHasTeams(false));
    ApiHelper.get("/pages", "ContentApi").then((data) => setHasPages(data?.length > 0)).catch(() => setHasPages(false));
    ApiHelper.get("/groups/tag/standard", "MembershipApi").then((data) => setHasGroups(data?.length > 0)).catch(() => setHasGroups(false));
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
      <WelcomeHeader
        title="Welcome to B1.church!"
        subtitle="Let's get your church set up. Here are some things you'll likely want to do first."
      />
      <Container maxWidth="xl">
        <Box sx={{ py: 4 }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Click any card below to get started. You can always find these in the menu later.
          </Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FeatureCard icon={<Image fontSize="large" />} title="Add Your Church Logo" description="Upload your logo and update your church's contact information so everything looks right from day one." linkUrl="/site/appearance" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FeatureCard icon={<Language fontSize="large" />} title="Create Your First Webpage" description="Build a public website for your church where visitors can learn about you and find service times." onClick={() => handleCardClick("webpage", hasPages, "/site/pages")} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FeatureCard icon={<VolunteerActivism fontSize="large" />} title="Set Up Online Giving" description="Connect your Stripe account so your congregation can give online through your website and app." linkUrl="/settings" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FeatureCard icon={<MusicNote fontSize="large" />} title="Set Up FreeShow Backups" description="If you use FreeShow for presentations, connect it to B1.church to back up your songs and service plans." onClick={() => handleCardClick("freeshow", hasTeams, "/serving")} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FeatureCard icon={<Person fontSize="large" />} title="Add Your Congregation" description="Import or manually add the people in your church so you can track attendance, groups, and giving." linkUrl="/people" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FeatureCard icon={<Groups fontSize="large" />} title="Create Your First Group" description="Set up small groups, classes, or serving teams so people can connect and get involved." onClick={() => handleCardClick("group", hasGroups, "/groups")} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FeatureCard icon={<LiveTv fontSize="large" />} title="Upload a Sermon" description="Share your sermons online so members and visitors can watch or listen anytime." linkUrl="/sermons" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FeatureCard icon={<Lock fontSize="large" />} title="Invite Team Members" description="Add staff and volunteers as admins so they can help manage people, groups, and content." linkUrl="/settings" />
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
