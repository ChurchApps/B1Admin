import React from "react";
import { Box, Stack, Typography } from "@mui/material";
import { DarkModeOutlined as DarkIcon, LightModeOutlined as LightIcon } from "@mui/icons-material";
import { Locale } from "@churchapps/apphelper";
import { useThemeMode } from "../ThemeContext";
import { type ThemeId } from "../helpers/Themes";
import { ViewToggle } from "./ui";

// Theme + light/dark toggles for the user dropdown. It reads ThemeContext itself because the apphelper menu is memoized.
// Custom is Default mixed from the church's B1 Mobile color, so it matches the member app.
export const ThemeMenuControls: React.FC = () => {
  const { mode, toggleTheme, themeId, setTheme } = useThemeMode();
  return (
    <Box data-testid="user-menu-theme">
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>{Locale.label("profile.profilePage.themePreferences", "Theme")}</Typography>
      <Stack direction="column" spacing={1} alignItems="flex-start">
        <ViewToggle
          value={themeId}
          onChange={(v) => setTheme(v as ThemeId)}
          options={[
            { value: "soft", label: Locale.label("profile.profilePage.themeDefault", "Default"), "data-testid": "theme-soft" },
            { value: "classic", label: Locale.label("profile.profilePage.themeClassic", "Classic"), "data-testid": "theme-classic" },
            { value: "custom", label: Locale.label("profile.profilePage.themeCustom", "Custom"), "data-testid": "theme-custom" }
          ]}
        />
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
