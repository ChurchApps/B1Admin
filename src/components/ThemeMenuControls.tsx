import React from "react";
import { Box, Stack, Typography } from "@mui/material";
import { DarkModeOutlined as DarkIcon, LightModeOutlined as LightIcon } from "@mui/icons-material";
import { Locale } from "@churchapps/apphelper";
import { useThemeMode } from "../ThemeContext";
import { ViewToggle } from "./ui";

// ponytail: color-theme swatches hidden and ThemeContext forces Classic; restore from git to bring the picker back.
// Light/dark toggle for the user dropdown. It reads ThemeContext itself because the apphelper menu is memoized.
export const ThemeMenuControls: React.FC = () => {
  const { mode, toggleTheme } = useThemeMode();
  return (
    <Box data-testid="user-menu-theme">
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>{Locale.label("profile.profilePage.themePreferences", "Theme")}</Typography>
      <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
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
