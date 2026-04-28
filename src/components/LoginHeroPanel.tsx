import React from "react";
import { Box, Stack, Typography, alpha } from "@mui/material";
import PeopleIcon from "@mui/icons-material/People";
import EventIcon from "@mui/icons-material/Event";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import LinkIcon from "@mui/icons-material/Link";
import { Locale } from "@churchapps/apphelper";

const features: { icon: React.ReactNode; labelKey: string }[] = [
  { icon: <PeopleIcon />, labelKey: "components.loginHeroPanel.featurePeople" },
  { icon: <EventIcon />, labelKey: "components.loginHeroPanel.featurePlanning" },
  { icon: <AttachMoneyIcon />, labelKey: "components.loginHeroPanel.featureDonations" },
  { icon: <LinkIcon />, labelKey: "components.loginHeroPanel.featureWebsite" }
];

export const LoginHeroPanel: React.FC = () => (
  <Box
    sx={(theme) => ({
      flex: 1,
      display: { xs: "none", md: "flex" },
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      p: 6,
      position: "relative",
      overflow: "hidden",
      background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 40%, ${theme.palette.primary.light} 100%)`,
      color: theme.palette.primary.contrastText,
      "&::before": {
        content: "''",
        position: "absolute",
        top: -100,
        right: -100,
        width: 400,
        height: 400,
        borderRadius: "50%",
        background: alpha(theme.palette.common.white, 0.05)
      },
      "&::after": {
        content: "''",
        position: "absolute",
        bottom: -80,
        left: -80,
        width: 300,
        height: 300,
        borderRadius: "50%",
        background: alpha(theme.palette.common.white, 0.04)
      }
    })}>
    <Box sx={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 420 }}>
      <Box sx={{ mb: 4 }}>
        <Box component="img" src="/images/logo-white.png" alt="B1.church" sx={{ maxWidth: 280, height: "auto" }} />
      </Box>
      <Typography component="h1" variant="h3" sx={{ fontSize: "2.125rem", mt: 0, mb: 2, lineHeight: 1.2 }}>
        {Locale.label("components.loginHeroPanel.title")}
      </Typography>
      <Typography sx={{ fontSize: "1rem", color: "rgba(255,255,255,0.8)", lineHeight: 1.6, mb: 5 }}>
        {Locale.label("components.loginHeroPanel.subtitle")}
      </Typography>
      <Stack spacing={2} sx={{ textAlign: "left" }}>
        {features.map((f) => (
          <Stack key={f.labelKey} direction="row" spacing={1.5} alignItems="center" sx={{ color: "rgba(255,255,255,0.9)", fontSize: "0.875rem" }}>
            <Box sx={(theme) => ({ width: 32, height: 32, minWidth: 32, background: alpha(theme.palette.common.white, 0.15), borderRadius: 1, display: "flex", alignItems: "center", justifyContent: "center", "& svg": { fontSize: 16 } })}>
              {f.icon}
            </Box>
            <Box component="span">{Locale.label(f.labelKey)}</Box>
          </Stack>
        ))}
      </Stack>
    </Box>
  </Box>
);
