import React from "react";
import { Box, Stack, Typography, alpha, type SxProps, type Theme } from "@mui/material";
import PeopleIcon from "@mui/icons-material/People";
import EventIcon from "@mui/icons-material/Event";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import LinkIcon from "@mui/icons-material/Link";
import { Locale } from "@churchapps/apphelper";
import { useThemeMode } from "../ThemeContext";

const features: { id: string; icon: React.ReactNode; getLabel: () => string }[] = [
  { id: "people", icon: <PeopleIcon />, getLabel: () => Locale.label("components.loginHeroPanel.featurePeople") },
  { id: "planning", icon: <EventIcon />, getLabel: () => Locale.label("components.loginHeroPanel.featurePlanning") },
  { id: "donations", icon: <AttachMoneyIcon />, getLabel: () => Locale.label("components.loginHeroPanel.featureDonations") },
  { id: "website", icon: <LinkIcon />, getLabel: () => Locale.label("components.loginHeroPanel.featureWebsite") }
];

const panelSx = { flex: 1, display: { xs: "none", md: "flex" }, flexDirection: "column", justifyContent: "center", alignItems: "center", p: 6 } as const;

// Classic keeps the pre-redesign blue gradient panel.
const classicPanelSx: SxProps<Theme> = (theme) => ({
  ...panelSx,
  position: "relative",
  overflow: "hidden",
  background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 40%, ${theme.palette.primary.light} 100%)`,
  color: theme.palette.primary.contrastText,
  "&::before": { content: "''", position: "absolute", top: -100, right: -100, width: 400, height: 400, borderRadius: "50%", background: alpha(theme.palette.common.white, 0.05) },
  "&::after": { content: "''", position: "absolute", bottom: -80, left: -80, width: 300, height: 300, borderRadius: "50%", background: alpha(theme.palette.common.white, 0.04) }
});

export const LoginHeroPanel: React.FC = () => {
  const classic = useThemeMode().themeId === "classic";
  return (
    <Box sx={classic ? classicPanelSx : { ...panelSx, backgroundColor: "var(--b1-sidebar)", borderRight: "1px solid var(--b1-border)", color: "text.primary" }}>
      <Box sx={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 420 }}>
        <Box sx={{ mb: 4 }}>
          <Box component="img" src={classic ? "/images/logo-white.png" : "/images/logo-login.png"} alt="B1.church" sx={{ maxWidth: 280, height: "auto" }} />
        </Box>
        <Typography component="h1" variant="h2" sx={{ mt: 0, mb: 2, ...(classic && { fontSize: "2.125rem", lineHeight: 1.2, color: "inherit" }) }}>
          {Locale.label("components.loginHeroPanel.title")}
        </Typography>
        <Typography color={classic ? "rgba(255,255,255,0.8)" : "text.secondary"} sx={{ mb: classic ? 5 : 4, ...(classic && { lineHeight: 1.6 }) }}>
          {Locale.label("components.loginHeroPanel.subtitle")}
        </Typography>
        <Stack spacing={2} sx={{ textAlign: "left" }}>
          {features.map((f) => (
            <Stack key={f.id} direction="row" spacing={1.5} alignItems="center">
              {classic
                ? <Box sx={(theme) => ({ width: 32, height: 32, minWidth: 32, background: alpha(theme.palette.common.white, 0.15), borderRadius: 1, display: "flex", alignItems: "center", justifyContent: "center", "& svg": { fontSize: 16 } })}>{f.icon}</Box>
                : <Box sx={{ display: "flex", color: "primary.main", "& svg": { fontSize: 20 } }}>{f.icon}</Box>}
              <Typography variant="body2" component="span" sx={classic ? { color: "rgba(255,255,255,0.9)" } : undefined}>{f.getLabel()}</Typography>
            </Stack>
          ))}
        </Stack>
      </Box>
    </Box>
  );
};
