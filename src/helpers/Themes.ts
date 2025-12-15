import { createTheme, type ThemeOptions, type PaletteMode } from "@mui/material";

const getBaseThemeOptions = (mode: PaletteMode): ThemeOptions => ({
  palette: {
    mode,
    secondary: { main: mode === "light" ? "#444444" : "#b0b0b0" },
    background: {
      default: mode === "light" ? "#fafafa" : "#121212",
      paper: mode === "light" ? "#ffffff" : "#1e1e1e",
    },
  },
  components: {
    MuiTextField: {
      defaultProps: { margin: "normal" },
      styleOverrides: { root: { "& .MuiOutlinedInput-root": { backgroundColor: mode === "light" ? "rgba(255, 255, 255, 0.8)" : "rgba(255, 255, 255, 0.05)" } } },
    },
    MuiFormControl: { defaultProps: { margin: "normal" } },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 6,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: mode === "light" ? "0 2px 8px rgba(0,0,0,0.1)" : "0 2px 8px rgba(0,0,0,0.4)",
        },
      },
    },
  },
  typography: { fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif' },
  shape: { borderRadius: 6 },
});

export class Themes {
  static BaseTheme = createTheme(getBaseThemeOptions("light"));

  static NavBarStyle = {
    "& .selected .MuiListItemButton-root": {
      backgroundColor: "#555555",
      borderRadius: 4,
    },
  };
}

export const createAppTheme = (mode: PaletteMode) => createTheme(getBaseThemeOptions(mode));
