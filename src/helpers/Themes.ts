import { createTheme, type ThemeOptions, type PaletteMode, type Shadows } from "@mui/material";

declare module "@mui/material/styles" {
  interface Palette {
    InputBox: {
      headerText: string;
    };
  }
  interface PaletteOptions {
    InputBox?: {
      headerText?: string;
    };
  }
  interface TypeBackground {
    subtle: string;
  }
}

// Soft Blue semantic tokens (B1Admin-Design-System.md §2). Exposed to page code as var(--b1-<kebab-name>).
export const b1Tokens = {
  light: {
    canvas: "#F3F7FC",
    surface: "#FFFFFF",
    sidebar: "#EAF2FB",
    header: "#102E59",
    headerHover: "#204575",
    onHeader: "#FFFFFF",
    headerMuted: "#C9D8EC",
    primary: "#1765C1",
    primaryHover: "#12539F",
    primaryPressed: "#104786",
    onPrimary: "#FFFFFF",
    selected: "#DCEBFC",
    onSelected: "#114F9A",
    hover: "#EDF4FD",
    text: "#172B45",
    muted: "#576B82",
    border: "#DCE5EF",
    controlBorder: "#788CA3",
    focus: "#155EEF",
    success: "#236A43",
    successBg: "#E8F4EC",
    warning: "#805000",
    warningBg: "#FFF3D6",
    danger: "#AC2834",
    dangerBg: "#FDEDEF",
    neutral: "#465A71",
    neutralBg: "#EDF1F6",
    disabledBg: "#E7ECF2",
    disabledText: "#66788D"
  },
  dark: {
    canvas: "#0F1722",
    surface: "#172230",
    sidebar: "#131D2A",
    header: "#0B1F3D",
    headerHover: "#1B3960",
    onHeader: "#FFFFFF",
    headerMuted: "#C9D8EC",
    primary: "#6AA5F0",
    primaryHover: "#8AB9F4",
    primaryPressed: "#A6CAF7",
    onPrimary: "#0B1F3D",
    selected: "#1E3A5F",
    onSelected: "#CFE2FB",
    hover: "#1C2A3B",
    text: "#E4EBF3",
    muted: "#A3B4C7",
    border: "#2A3748",
    controlBorder: "#71849A",
    focus: "#7AAEFF",
    success: "#80D0A0",
    successBg: "#16301F",
    warning: "#F2C063",
    warningBg: "#3A2C0E",
    danger: "#F2939B",
    dangerBg: "#3D1A1E",
    neutral: "#B4C2D2",
    neutralBg: "#243142",
    disabledBg: "#232E3C",
    disabledText: "#7F8FA2"
  }
} as const;

export type B1Tokens = { [K in keyof typeof b1Tokens.light]: string };

export const b1Layout = {
  headerHeight: 64,
  sidebarWidth: 272,
  sidebarWidthMedium: 232,
  contentMax: 1480,
  identityColumn: 304,
  formWidth: 640,
  controlHeight: 44,
  rowHeight: 56,
  radiusControl: 6,
  radiusPanel: 10
} as const;

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());

const cssVars = (t: B1Tokens) => {
  const vars: Record<string, string> = {};
  Object.entries(t).forEach(([k, v]) => { vars["--b1-" + kebab(k)] = v; });
  Object.assign(vars, {
    "--b1-font": "\"Roboto\", \"Helvetica\", \"Arial\", sans-serif",
    "--b1-radius-control": "6px",
    "--b1-radius-panel": "10px",
    "--b1-radius-pill": "999px",
    "--b1-shadow-popover": "0 8px 24px #102E591F",
    "--b1-header-height": "64px",
    "--b1-sidebar-width": "272px",
    "--b1-content-max": "1480px",
    "--b1-duration": "140ms",
    // legacy public/css/all.css variables, re-pointed so unconverted pages pick up the palette
    "--bg-main": t.canvas,
    "--bg-card": t.surface,
    "--bg-sub": t.canvas,
    "--text-main": t.text,
    "--text-muted": t.muted,
    "--border-main": t.border,
    "--border-light": t.border,
    "--link": t.primary,
    "--focus": t.focus,
    "--c1": t.primary,
    "--c1d5": t.header
  });
  return vars;
};

const popoverShadow = "0 8px 24px rgba(16, 46, 89, 0.12)";
const dialogShadow = "0 16px 48px rgba(16, 46, 89, 0.2)";
// Panels are bordered, not shadowed; only floating layers (menus, popovers, dialogs: elevation >= 8) cast a shadow.
const shadows = Array.from({ length: 25 }, (_, i) => (i === 0 || i < 8 ? "none" : i >= 16 ? dialogShadow : popoverShadow)) as Shadows;

const getBaseThemeOptions = (mode: PaletteMode): ThemeOptions => {
  const t: B1Tokens = b1Tokens[mode];
  return {
    palette: {
      mode,
      primary: { main: t.primary, dark: t.primaryHover, light: mode === "light" ? "#4A8BD6" : "#9CC4F6", contrastText: t.onPrimary },
      secondary: { main: t.neutral, contrastText: mode === "light" ? "#FFFFFF" : t.canvas },
      success: { main: t.success },
      warning: { main: t.warning },
      error: { main: t.danger },
      info: { main: t.primary },
      text: { primary: t.text, secondary: t.muted, disabled: t.disabledText },
      background: { default: t.canvas, paper: t.surface, subtle: t.canvas },
      divider: t.border,
      action: { hover: t.hover, selected: t.selected, disabled: t.disabledText, disabledBackground: t.disabledBg },
      InputBox: { headerText: t.text }
    },
    shape: { borderRadius: 6 },
    shadows,
    typography: {
      fontFamily: "\"Roboto\", \"Helvetica\", \"Arial\", sans-serif",
      h1: { fontSize: "1.875rem", lineHeight: "36px", fontWeight: 650, letterSpacing: "-0.02em" },
      h2: { fontSize: "1.375rem", lineHeight: "29px", fontWeight: 650 },
      h3: { fontSize: "1.125rem", lineHeight: "25px", fontWeight: 600 },
      h4: { fontSize: "1.375rem", lineHeight: "29px", fontWeight: 650 },
      h5: { fontSize: "1.125rem", lineHeight: "25px", fontWeight: 600 },
      h6: { fontSize: "1.125rem", lineHeight: "25px", fontWeight: 600 },
      subtitle1: { fontSize: "1rem", lineHeight: "24px", fontWeight: 600 },
      subtitle2: { fontSize: "0.875rem", lineHeight: "21px", fontWeight: 600 },
      body1: { fontSize: "1rem", lineHeight: "24px" },
      body2: { fontSize: "0.875rem", lineHeight: "21px" },
      caption: { fontSize: "0.75rem", lineHeight: "18px" },
      overline: { fontSize: "0.75rem", lineHeight: "18px", fontWeight: 650, letterSpacing: "0.07em", textTransform: "uppercase" },
      button: { fontSize: "0.875rem", fontWeight: 600, textTransform: "none" }
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          ":root:root, body.dark-theme.dark-theme": cssVars(t),
          body: { backgroundColor: t.canvas, color: t.text },
          ":root :is(a, button, [tabindex]):focus-visible": { outline: `3px solid ${t.focus}`, outlineOffset: 3 },
          "#site-header :focus-visible": { outlineColor: "#FFFFFF !important" },
          "#site-toolbar": { "--c1d2": t.headerHover, minHeight: "64px" },
          "#primaryNavButton": { borderRadius: 6, "&:hover": { backgroundColor: t.headerHover } },
          "#primaryNavButton h2": { fontSize: 18, fontWeight: 650, margin: 0 },
          "#secondaryMenu": { display: "flex", alignItems: "center", gap: 4 },
          "#secondaryMenu > a": { margin: "0 !important", padding: "8px 12px", borderRadius: 6, fontSize: 14, lineHeight: "21px", transition: "background-color 140ms" },
          "#secondaryMenu > a:hover": { backgroundColor: t.headerHover },
          "#secondaryMenu .MuiChip-root": { height: 37, borderRadius: 6, fontSize: "14px !important", fontWeight: 600, "& .MuiChip-label": { padding: "0 12px" } },
          "#display-box-icon, #input-box-icon": { color: t.muted, fontSize: 20 },
          "#input-box-buttons .MuiButton-outlinedWarning": { color: t.text, borderColor: t.controlBorder },
          "@media (min-width: 900px)": { ".MuiPaper-root:has(> #display-box-header), .MuiPaper-root:has(> #input-box-header)": { padding: 24 } },
          "body.dark-theme #banner": { backgroundColor: t.surface, borderBottom: `1px solid ${t.border}` },
          ".google-visualization-tooltip, .google-visualization-tooltip *": { pointerEvents: "none" },
          ".rowActions .MuiIconButton-root": { opacity: 0.45, transition: "opacity 0.12s" },
          "tr:hover .rowActions .MuiIconButton-root, .rowActions .MuiIconButton-root:focus-visible": { opacity: 1 },
          "@media (prefers-reduced-motion: reduce)": { ".rowActions .MuiIconButton-root, .MuiButton-root, .MuiTableRow-root": { transition: "none" } }
        }
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 6, minHeight: 44, padding: "9px 16px", transition: "background-color 140ms, border-color 140ms" },
          sizeSmall: { minHeight: 32, padding: "4px 10px" },
          sizeLarge: { minHeight: 48, padding: "11px 20px", fontSize: "1rem" },
          contained: { "&.Mui-disabled": { backgroundColor: t.disabledBg, color: t.disabledText } },
          containedPrimary: { "&:active": { backgroundColor: t.primaryPressed } },
          outlined: { backgroundColor: t.surface, "&.Mui-disabled": { borderColor: t.disabledBg } },
          outlinedPrimary: { color: t.text, borderColor: t.controlBorder, "&:hover": { backgroundColor: t.hover, borderColor: t.controlBorder } },
          outlinedSecondary: { color: t.text, borderColor: t.controlBorder, "&:hover": { backgroundColor: t.hover, borderColor: t.controlBorder } },
          text: { "&:hover": { backgroundColor: t.hover } }
        }
      },
      MuiIconButton: { styleOverrides: { root: { "&:hover": { backgroundColor: t.hover } } } },
      MuiTextField: { defaultProps: { margin: "normal" } },
      MuiFormControl: { defaultProps: { margin: "normal" } },
      // always-shrunk labels: react-hook-form reset() fills inputs without events, so MUI's filled-state detection misses them
      MuiInputLabel: { defaultProps: { shrink: true }, styleOverrides: { root: { color: t.muted, fontWeight: 500 } } },
      MuiOutlinedInput: {
        defaultProps: { notched: true },
        styleOverrides: {
          root: {
            backgroundColor: t.surface,
            borderRadius: 6,
            "& .MuiOutlinedInput-notchedOutline": { borderColor: t.controlBorder },
            "&:hover:not(.Mui-disabled):not(.Mui-focused):not(.Mui-error) .MuiOutlinedInput-notchedOutline": { borderColor: t.text },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: t.focus, borderWidth: 2 },
            "&.Mui-disabled": { backgroundColor: t.disabledBg }
          },
          input: { padding: "10.5px 12px" },
          inputSizeSmall: { padding: "8.5px 12px" },
          multiline: { padding: "10.5px 12px" }
        }
      },
      MuiFormHelperText: { styleOverrides: { root: { fontSize: "0.875rem", lineHeight: "21px", marginLeft: 0, marginRight: 0 } } },
      MuiLink: { defaultProps: { underline: "hover" }, styleOverrides: { root: { textUnderlineOffset: 3 } } },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: { root: { borderRadius: 10, border: `1px solid ${t.border}`, boxShadow: "none", backgroundImage: "none" } }
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: "none" },
          elevation1: { border: `1px solid ${t.border}`, "&.MuiPaper-rounded": { borderRadius: 10 } }
        }
      },
      MuiAccordion: { styleOverrides: { root: { "&.MuiPaper-rounded": { borderRadius: 6 }, "&::before": { display: "none" } } } },
      MuiAutocomplete: { styleOverrides: { paper: { boxShadow: popoverShadow, border: `1px solid ${t.border}` } } },
      MuiDialog: { styleOverrides: { paper: { borderRadius: 10 } } },
      MuiDialogTitle: { styleOverrides: { root: { fontSize: "1.375rem", lineHeight: "29px", fontWeight: 650 } } },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 999, fontWeight: 600 },
          sizeSmall: { fontSize: "0.75rem", height: 24 },
          filled: { "&.MuiChip-colorDefault": { backgroundColor: t.neutralBg, color: t.neutral } },
          outlined: { "&.MuiChip-colorDefault": { borderColor: t.controlBorder, color: t.text } }
        }
      },
      MuiAlert: {
        styleOverrides: {
          standardSuccess: { backgroundColor: t.successBg, color: t.success },
          standardWarning: { backgroundColor: t.warningBg, color: t.warning },
          standardError: { backgroundColor: t.dangerBg, color: t.danger },
          standardInfo: { backgroundColor: t.selected, color: t.onSelected }
        }
      },
      MuiTabs: { styleOverrides: { indicator: { height: 3, borderRadius: "3px 3px 0 0" } } },
      MuiTab: { styleOverrides: { root: { textTransform: "none", fontWeight: 600, fontSize: "0.875rem", minHeight: 44 } } },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            "&.Mui-selected, &.Mui-selected:hover": { backgroundColor: t.selected, color: t.onSelected },
            "&.Mui-selected .MuiListItemIcon-root": { color: t.onSelected }
          }
        }
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            transition: "background-color 140ms",
            "tbody &:hover": { backgroundColor: t.hover },
            "&:last-child > td": { borderBottom: 0 }
          }
        }
      },
      MuiTableCell: {
        styleOverrides: {
          root: { padding: "12px 16px", borderBottom: `1px solid ${t.border}` },
          head: { fontSize: "0.75rem", lineHeight: "18px", fontWeight: 600, color: t.muted, backgroundColor: "transparent" },
          body: { fontSize: "0.875rem", lineHeight: "21px", height: 56, fontVariantNumeric: "tabular-nums" },
          sizeSmall: { padding: "8px 12px", "&.MuiTableCell-body": { height: 44 } }
        }
      }
    }
  };
};

export const createAppTheme = (mode: PaletteMode) => createTheme(getBaseThemeOptions(mode));

export class Themes {
  static BaseTheme = createAppTheme("light");

  static NavBarStyle = {
    "& .selected .MuiListItemButton-root": {
      backgroundColor: "action.selected",
      borderRadius: 4
    }
  };
}
