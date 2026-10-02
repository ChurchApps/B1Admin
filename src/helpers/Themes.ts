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

// Semantic tokens, exposed to page code as var(--b1-<kebab-name>). `soft` is the default;
// `warm` matches the cream / navy / teal reference; `plum` is aubergine / lilac / coral. Both modes of a theme share one key set.
export type ThemeId = "soft" | "warm" | "plum";

export const themeCatalog: { id: ThemeId; header: string; canvas: string; primary: string; accent: string; ink: string }[] = [
  { id: "soft", header: "#102E59", canvas: "#F3F7FC", primary: "#1765C1", accent: "#D9A441", ink: "#172B45" },
  { id: "warm", header: "#082239", canvas: "#F7F3EC", primary: "#0F7478", accent: "#C4A15A", ink: "#2A2926" },
  { id: "plum", header: "#2B1640", canvas: "#F6F4F9", primary: "#6B3FA0", accent: "#E07A5F", ink: "#251E2E" }
];

interface ThemeShape {
  radius: number;
  avatar: string;
  tick: string;
  tickGap: string;
  panel: string;
  control: string;
  shadow: string;
  dialog: string;
}

export const themeShape: Record<ThemeId, ThemeShape> = {
  soft: { radius: 6, avatar: "10px", tick: "0px", tickGap: "0px", panel: "10px", control: "6px", shadow: "rgba(16, 46, 89, 0.12)", dialog: "rgba(16, 46, 89, 0.2)" },
  warm: { radius: 8, avatar: "999px", tick: "3px", tickGap: "8px", panel: "16px", control: "8px", shadow: "rgba(36, 28, 16, 0.10)", dialog: "rgba(36, 28, 16, 0.18)" },
  plum: { radius: 8, avatar: "12px", tick: "0px", tickGap: "0px", panel: "14px", control: "8px", shadow: "rgba(43, 22, 64, 0.12)", dialog: "rgba(43, 22, 64, 0.22)" }
};

export const b1Tokens = {
  soft: {
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
      disabledText: "#66788D",
      link: "#0E6FAE",
      accent: "#D9A441",
      onAccent: "#3E2C08",
      accentBg: "#FFF3D6",
      mark: "#7EB6F0",
      markEmpty: "#E4EEF8",
      wash: "#E7F1FB",
      tick: "transparent",
      avatar: "#1765C1",
      onAvatar: "#FFFFFF",
      chip: "#D6E8FB",
      onChip: "#0E4F96",
      chipAlt: "#F8E7C0",
      onChipAlt: "#7A5410",
      eyebrow: "#1765C1",
      pillBg: "#D6E8FB",
      pillFg: "#0E4F96",
      pillBorder: "transparent"
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
      disabledText: "#7F8FA2",
      link: "#8EBEFA",
      accent: "#E2C27A",
      onAccent: "#2A220C",
      accentBg: "#3A2C0E",
      mark: "#3D7EBE",
      markEmpty: "#243044",
      wash: "#1A2C40",
      tick: "transparent",
      avatar: "#1765C1",
      onAvatar: "#FFFFFF",
      chip: "#1E3A5F",
      onChip: "#CFE2FB",
      chipAlt: "#3A2C0E",
      onChipAlt: "#F2C063",
      eyebrow: "#8EBEFA",
      pillBg: "#1E3A5F",
      pillFg: "#CFE2FB",
      pillBorder: "transparent"
    }
  },
  warm: {
    light: {
      canvas: "#F7F3EC",
      surface: "#FDFCF8",
      sidebar: "#F3EFE6",
      header: "#082239",
      headerHover: "#1C3752",
      onHeader: "#FFFFFF",
      headerMuted: "#C5D0DA",
      primary: "#0F7478",
      primaryHover: "#0C6064",
      primaryPressed: "#0A5255",
      onPrimary: "#FFFFFF",
      selected: "#D7EEEF",
      onSelected: "#0C5558",
      hover: "#F4F1EA",
      text: "#2A2926",
      muted: "#6E6C68",
      border: "#E6E0D4",
      controlBorder: "#B7B1A6",
      focus: "#0F7478",
      success: "#3C9A62",
      successBg: "#E5F2E4",
      warning: "#8A6420",
      warningBg: "#F8E7C0",
      danger: "#C4353A",
      dangerBg: "#FDECEC",
      neutral: "#5C5A56",
      neutralBg: "#F1EEE6",
      disabledBg: "#EFEBE3",
      disabledText: "#8A8680",
      link: "#0F7478",
      accent: "#C4A15A",
      onAccent: "#3E3010",
      accentBg: "#F8E7C0",
      mark: "#D7E6C6",
      markEmpty: "#F8F0D4",
      wash: "#EEF2F6",
      tick: "#0F7478",
      avatar: "#0F7478",
      onAvatar: "#FFFFFF",
      chip: "#D7EEEF",
      onChip: "#0F7478",
      chipAlt: "#F8E7C0",
      onChipAlt: "#8A6420",
      eyebrow: "#5C5B59",
      pillBg: "#0F7478",
      pillFg: "#FFFFFF",
      pillBorder: "#0F7478"
    },
    dark: {
      canvas: "#121A1C",
      surface: "#1C2628",
      sidebar: "#172022",
      header: "#07141C",
      headerHover: "#143044",
      onHeader: "#FFFFFF",
      headerMuted: "#C5D4DE",
      primary: "#3EBEB8",
      primaryHover: "#67D0CB",
      primaryPressed: "#8EDDD8",
      onPrimary: "#062220",
      selected: "#1A3A3A",
      onSelected: "#C9F3F0",
      hover: "#243234",
      text: "#F4F1EA",
      muted: "#B7C0BA",
      border: "#2E3C3E",
      controlBorder: "#6E8484",
      focus: "#5ED4CE",
      success: "#8FCB9A",
      successBg: "#1A3324",
      warning: "#E2C27A",
      warningBg: "#3A3018",
      danger: "#F0A0A4",
      dangerBg: "#3D2224",
      neutral: "#C5CEC8",
      neutralBg: "#2A3436",
      disabledBg: "#2A3336",
      disabledText: "#8A9694",
      link: "#5ED4CE",
      accent: "#E2C27A",
      onAccent: "#2A220C",
      accentBg: "#3A3218",
      mark: "#6FAF86",
      markEmpty: "#5C5340",
      wash: "#243033",
      tick: "#3EBEB8",
      avatar: "#0F7478",
      onAvatar: "#FFFFFF",
      chip: "#1A3E40",
      onChip: "#B7E8E4",
      chipAlt: "#3E3420",
      onChipAlt: "#F0D9A0",
      eyebrow: "#C9C4BA",
      pillBg: "#0F7478",
      pillFg: "#FFFFFF",
      pillBorder: "#0F7478"
    }
  },
  plum: {
    light: {
      canvas: "#F6F4F9",
      surface: "#FFFFFF",
      sidebar: "#F0ECF6",
      header: "#2B1640",
      headerHover: "#43275E",
      onHeader: "#FFFFFF",
      headerMuted: "#D8CCE6",
      primary: "#6B3FA0",
      primaryHover: "#5A3388",
      primaryPressed: "#4B2A72",
      onPrimary: "#FFFFFF",
      selected: "#EBE1F7",
      onSelected: "#4F2A7A",
      hover: "#F3EEF9",
      text: "#251E2E",
      muted: "#6B6178",
      border: "#E4DEEC",
      controlBorder: "#8E84A0",
      focus: "#7C4DD8",
      success: "#2F7A4D",
      successBg: "#E6F3EA",
      warning: "#8A5A00",
      warningBg: "#FBEED3",
      danger: "#B42F45",
      dangerBg: "#FCEDF0",
      neutral: "#574E66",
      neutralBg: "#F0EDF4",
      disabledBg: "#ECE8F1",
      disabledText: "#7A7088",
      link: "#6B3FA0",
      accent: "#E07A5F",
      onAccent: "#4A1E10",
      accentBg: "#FCE6DF",
      mark: "#B79BDB",
      markEmpty: "#EEE8F6",
      wash: "#F1ECF8",
      tick: "transparent",
      avatar: "#6B3FA0",
      onAvatar: "#FFFFFF",
      chip: "#EBE1F7",
      onChip: "#4F2A7A",
      chipAlt: "#FCE6DF",
      onChipAlt: "#8A3A22",
      eyebrow: "#6B3FA0",
      pillBg: "#EBE1F7",
      pillFg: "#4F2A7A",
      pillBorder: "transparent"
    },
    dark: {
      canvas: "#16121C",
      surface: "#201A29",
      sidebar: "#1B1623",
      header: "#120A1C",
      headerHover: "#2E1F42",
      onHeader: "#FFFFFF",
      headerMuted: "#D8CCE6",
      primary: "#B794E6",
      primaryHover: "#C8ADEC",
      primaryPressed: "#D7C3F1",
      onPrimary: "#20103A",
      selected: "#352650",
      onSelected: "#E6DAF7",
      hover: "#2A2235",
      text: "#ECE7F2",
      muted: "#B3A8C2",
      border: "#342B40",
      controlBorder: "#7E7290",
      focus: "#C3A4F0",
      success: "#86CFA0",
      successBg: "#17301F",
      warning: "#F0C070",
      warningBg: "#3A2C10",
      danger: "#F29AA8",
      dangerBg: "#3D1C24",
      neutral: "#C2B8D0",
      neutralBg: "#2B2436",
      disabledBg: "#2A2333",
      disabledText: "#857A94",
      link: "#C3A4F0",
      accent: "#F0A08A",
      onAccent: "#3A1408",
      accentBg: "#3D2018",
      mark: "#8A6BC0",
      markEmpty: "#2C2438",
      wash: "#261E33",
      tick: "transparent",
      avatar: "#6B3FA0",
      onAvatar: "#FFFFFF",
      chip: "#352650",
      onChip: "#E6DAF7",
      chipAlt: "#3D2018",
      onChipAlt: "#F5C2B3",
      eyebrow: "#C3A4F0",
      pillBg: "#352650",
      pillFg: "#E6DAF7",
      pillBorder: "transparent"
    }
  }
} as const;

export type B1Tokens = { [K in keyof typeof b1Tokens.soft.light]: string };

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

const cssVars = (t: B1Tokens, shape: ThemeShape) => {
  const vars: Record<string, string> = {};
  Object.entries(t).forEach(([k, v]) => { vars["--b1-" + kebab(k)] = v; });
  Object.assign(vars, {
    "--b1-font": "\"Roboto\", \"Helvetica\", \"Arial\", sans-serif",
    "--b1-radius-control": shape.control,
    "--b1-radius-panel": shape.panel,
    "--b1-radius-avatar": shape.avatar,
    "--b1-tick-width": shape.tick,
    "--b1-tick-gap": shape.tickGap,
    "--b1-radius-pill": "999px",
    "--b1-shadow-popover": `0 8px 24px ${shape.shadow}`,
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
    "--link": t.link,
    "--focus": t.focus,
    "--c1": t.primary,
    "--c1d5": t.header
  });
  return vars;
};

const getBaseThemeOptions = (mode: PaletteMode, themeId: ThemeId): ThemeOptions => {
  const t: B1Tokens = b1Tokens[themeId][mode];
  const shape = themeShape[themeId];
  const popoverShadow = `0 8px 24px ${shape.shadow}`;
  const dialogShadow = `0 16px 48px ${shape.dialog}`;
  // Panels are bordered, not shadowed; only floating layers (menus, popovers, dialogs: elevation >= 8) cast a shadow.
  const shadows = Array.from({ length: 25 }, (_, i) => (i === 0 || i < 8 ? "none" : i >= 16 ? dialogShadow : popoverShadow)) as Shadows;
  const primaryLight = { soft: mode === "light" ? "#4A8BD6" : "#9CC4F6", warm: mode === "light" ? "#5EBEBE" : "#8EDDD8", plum: mode === "light" ? "#9A72CC" : "#D7C3F1" }[themeId];
  return {
    palette: {
      mode,
      primary: { main: t.primary, dark: t.primaryHover, light: primaryLight, contrastText: t.onPrimary },
      secondary: { main: t.accent, contrastText: t.onAccent },
      success: { main: t.success },
      warning: { main: t.warning },
      error: { main: t.danger },
      info: { main: t.link },
      text: { primary: t.text, secondary: t.muted, disabled: t.disabledText },
      background: { default: t.canvas, paper: t.surface, subtle: t.canvas },
      divider: t.border,
      action: { hover: t.hover, selected: t.selected, disabled: t.disabledText, disabledBackground: t.disabledBg },
      InputBox: { headerText: t.text }
    },
    shape: { borderRadius: shape.radius },
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
          ":root:root, body.dark-theme.dark-theme": cssVars(t, shape),
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
          "#primaryNavButton + .MuiPopper-root .MuiPaper-root": {
            backgroundColor: t.surface,
            color: t.text,
            border: `1px solid ${t.border}`,
            borderRadius: 10,
            boxShadow: popoverShadow,
            filter: "none",
            minWidth: 260,
            padding: "8px"
          },
          "#primaryNavButton + .MuiPopper-root a": { color: t.text, textDecoration: "none" },
          "#primaryNavButton + .MuiPopper-root a:hover": { color: t.text },
          "#primaryNavButton + .MuiPopper-root .MuiListItemButton-root": { borderRadius: 6, padding: "6px 8px" },
          "#primaryNavButton + .MuiPopper-root .MuiListItemButton-root:hover": { backgroundColor: t.hover },
          "#primaryNavButton + .MuiPopper-root a.selected .MuiListItemButton-root": { backgroundColor: t.selected, color: t.onSelected },
          "#primaryNavButton + .MuiPopper-root .MuiListItemIcon-root": { minWidth: 40, color: t.muted },
          "#primaryNavButton + .MuiPopper-root a.selected .MuiListItemIcon-root": { color: t.onSelected },
          // The header renders these icons white for the dark bar; inside the light menu they follow the row color.
          "#primaryNavButton + .MuiPopper-root .MuiListItemIcon-root .MuiIcon-root, #primaryNavButton + .MuiPopper-root .MuiListItemIcon-root .MuiSvgIcon-root": { color: "inherit" },
          "#primaryNavButton + .MuiPopper-root .MuiListItemText-primary": { fontSize: "0.9375rem", fontWeight: 600, letterSpacing: 0, lineHeight: "22px" },
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
      MuiLink: { defaultProps: { underline: "hover" }, styleOverrides: { root: { textUnderlineOffset: 3, color: t.link } } },
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

export const createAppTheme = (mode: PaletteMode, themeId: ThemeId = "soft") => createTheme(getBaseThemeOptions(mode, themeId));

export class Themes {
  static BaseTheme = createAppTheme("light", "soft");

  static NavBarStyle = {
    "& .selected .MuiListItemButton-root": {
      backgroundColor: "action.selected",
      borderRadius: 4
    }
  };
}
