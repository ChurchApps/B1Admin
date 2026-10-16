import React, { useMemo } from "react";
import { Box, ThemeProvider } from "@mui/material";
import { useThemeMode } from "../ThemeContext";
import { createAppTheme } from "../helpers/Themes";

// Printouts always use the light palette: browsers drop background colors on paper,
// so dark mode's light text would print near-white on white.
export const PrintLightTheme: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { themeId, brandColor } = useThemeMode();
  const theme = useMemo(() => createAppTheme("light", themeId, brandColor), [themeId, brandColor]);
  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ color: "text.primary", bgcolor: "background.paper" }}>{children}</Box>
    </ThemeProvider>
  );
};
