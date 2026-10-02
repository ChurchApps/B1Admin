import React from "react";
import { Box, ButtonBase, Stack, Typography } from "@mui/material";
import { DarkModeOutlined as DarkIcon, LightModeOutlined as LightIcon } from "@mui/icons-material";
import { Locale } from "@churchapps/apphelper";
import { useThemeMode } from "../ThemeContext";
import { themeCatalog } from "../helpers/Themes";
import { ViewToggle } from "./ui";

// Theme picker for the user dropdown. It reads ThemeContext itself because the apphelper menu is memoized.
export const ThemeMenuControls: React.FC = () => {
  const { mode, toggleTheme, themeId, setTheme } = useThemeMode();
  return (
    <Box data-testid="user-menu-theme">
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>{Locale.label("profile.profilePage.themePreferences", "Theme")}</Typography>
      <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
        {themeCatalog.map((choice) => {
          const selected = themeId === choice.id;
          const label = { soft: Locale.label("profile.profilePage.themeSoft", "Soft Blue"), warm: Locale.label("profile.profilePage.themeWarm", "Warm"), plum: Locale.label("profile.profilePage.themePlum", "Plum") }[choice.id];
          return (
            <ButtonBase
              key={choice.id}
              onClick={() => setTheme(choice.id)}
              aria-pressed={selected}
              data-testid={`theme-${choice.id}`}
              sx={{ display: "flex", alignItems: "center", gap: 1, pl: 0.75, pr: 1.25, py: 0.5, borderRadius: "var(--b1-radius-control)", border: "2px solid", borderColor: selected ? "primary.main" : "divider", bgcolor: choice.canvas }}>
              <Box sx={{ width: 22, height: 22, borderRadius: "4px", bgcolor: choice.header, display: "flex", alignItems: "center", justifyContent: "center", gap: "2px" }}>
                <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: choice.primary }} />
                <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: choice.accent }} />
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 600, color: choice.ink }}>{label}</Typography>
            </ButtonBase>
          );
        })}
        <Box sx={{ flex: 1 }} />
        <ViewToggle
          value={mode}
          onChange={(v) => { if (v !== mode) toggleTheme(); }}
          options={[
            { value: "light", label: Locale.label("profile.profilePage.lightMode", "Light"), icon: <LightIcon />, "data-testid": "theme-mode-light" },
            { value: "dark", label: Locale.label("profile.profilePage.darkMode", "Dark"), icon: <DarkIcon />, "data-testid": "theme-mode-dark" }
          ]}
        />
      </Stack>
    </Box>
  );
};
