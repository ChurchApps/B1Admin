import React from "react";
import { Box, Stack, Typography } from "@mui/material";
import PeopleIcon from "@mui/icons-material/People";
import EventIcon from "@mui/icons-material/Event";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import LinkIcon from "@mui/icons-material/Link";
import { Locale } from "@churchapps/apphelper";

const features: { id: string; icon: React.ReactNode; getLabel: () => string }[] = [
  { id: "people", icon: <PeopleIcon />, getLabel: () => Locale.label("components.loginHeroPanel.featurePeople") },
  { id: "planning", icon: <EventIcon />, getLabel: () => Locale.label("components.loginHeroPanel.featurePlanning") },
  { id: "donations", icon: <AttachMoneyIcon />, getLabel: () => Locale.label("components.loginHeroPanel.featureDonations") },
  { id: "website", icon: <LinkIcon />, getLabel: () => Locale.label("components.loginHeroPanel.featureWebsite") }
];

export const LoginHeroPanel: React.FC = () => (
  <Box
    sx={{
      flex: 1,
      display: { xs: "none", md: "flex" },
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      p: 6,
      backgroundColor: "var(--b1-sidebar)",
      borderRight: "1px solid var(--b1-border)",
      color: "text.primary"
    }}>
    <Box sx={{ textAlign: "center", maxWidth: 420 }}>
      <Box sx={{ mb: 4 }}>
        <Box component="img" src="/images/logo-login.png" alt="B1.church" sx={{ maxWidth: 280, height: "auto" }} />
      </Box>
      <Typography component="h1" variant="h2" sx={{ mt: 0, mb: 2 }}>
        {Locale.label("components.loginHeroPanel.title")}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        {Locale.label("components.loginHeroPanel.subtitle")}
      </Typography>
      <Stack spacing={2} sx={{ textAlign: "left" }}>
        {features.map((f) => (
          <Stack key={f.id} direction="row" spacing={1.5} alignItems="center">
            <Box sx={{ display: "flex", color: "primary.main", "& svg": { fontSize: 20 } }}>{f.icon}</Box>
            <Typography variant="body2" component="span">{f.getLabel()}</Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  </Box>
);
