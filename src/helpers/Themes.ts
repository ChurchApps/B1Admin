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

// Semantic tokens, exposed to page code as var(--b1-<kebab-name>). `soft` is the default; `classic` recreates the pre-redesign
// look (gradient page banner, shadowed cards, grey canvas); `custom` is Soft mixed from the church's B1 Mobile primary color,
// the same derivation B1App's MobileThemeProvider uses. Both modes of a theme share one key set.
export type ThemeId = "soft" | "classic" | "custom";
export const themeIds: ThemeId[] = ["soft", "classic", "custom"];

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
  classic: { radius: 6, avatar: "999px", tick: "0px", tickGap: "0px", panel: "8px", control: "6px", shadow: "rgba(0, 0, 0, 0.14)", dialog: "rgba(0, 0, 0, 0.24)" },
  custom: { radius: 6, avatar: "10px", tick: "0px", tickGap: "0px", panel: "10px", control: "6px", shadow: "rgba(16, 24, 40, 0.12)", dialog: "rgba(16, 24, 40, 0.2)" }
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
  classic: {
    light: {
      canvas: "#E5E8EE",
      surface: "#FFFFFF",
      sidebar: "#F5F7FA",
      header: "#09245F",
      headerHover: "#114A99",
      onHeader: "#FFFFFF",
      headerMuted: "#C9D8EC",
      primary: "#1565C0",
      primaryHover: "#1358AD",
      primaryPressed: "#114A99",
      onPrimary: "#FFFFFF",
      selected: "#E3EDF9",
      onSelected: "#114A99",
      hover: "#F5F5F5",
      text: "#212121",
      muted: "#666666",
      border: "#E0E0E0",
      controlBorder: "#B0B0B0",
      focus: "#1565C0",
      success: "#2E7D32",
      successBg: "#E8F5E9",
      warning: "#805000",
      warningBg: "#FFF3D6",
      danger: "#AC2834",
      dangerBg: "#FDEDEF",
      neutral: "#555555",
      neutralBg: "#EEEEEE",
      disabledBg: "#EEEEEE",
      disabledText: "#757575",
      link: "#1565C0",
      accent: "#D9A441",
      onAccent: "#3E2C08",
      accentBg: "#FFF3D6",
      mark: "#90B8E8",
      markEmpty: "#ECEFF3",
      wash: "#EEF3FA",
      tick: "transparent",
      avatar: "#BDBDBD",
      onAvatar: "#FFFFFF",
      chip: "#E3EDF9",
      onChip: "#114A99",
      chipAlt: "#F8E7C0",
      onChipAlt: "#7A5410",
      eyebrow: "#1565C0",
      pillBg: "#E3EDF9",
      pillFg: "#114A99",
      pillBorder: "transparent"
    },
    dark: {
      canvas: "#121212",
      surface: "#1E1E1E",
      sidebar: "#181818",
      header: "#09245F",
      headerHover: "#114A99",
      onHeader: "#FFFFFF",
      headerMuted: "#C9D8EC",
      primary: "#64A3EA",
      primaryHover: "#8AB9F0",
      primaryPressed: "#A6CAF4",
      onPrimary: "#0B1F3D",
      selected: "#1E3550",
      onSelected: "#CFE2FB",
      hover: "#262626",
      text: "#EDEDED",
      muted: "#A8A8A8",
      border: "#333333",
      controlBorder: "#6B6B6B",
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
      link: "#7DB3EF",
      accent: "#E2C27A",
      onAccent: "#2A220C",
      accentBg: "#3A2C0E",
      mark: "#3D7EBE",
      markEmpty: "#243044",
      wash: "#1A2C40",
      tick: "transparent",
      avatar: "#5A5A5A",
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
  }
} as const;

export type B1Tokens = { [K in keyof typeof b1Tokens.soft.light]: string };

export const DEFAULT_BRAND = "#1765C1";

const hexRgb = (hex: string) => {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) || 0);
};

export const isHexColor = (v?: string | null): v is string => !!v && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim());

const mix = (a: string, b: string, t: number) => {
  const x = hexRgb(a), y = hexRgb(b);
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("").toUpperCase();
};

const luminance = (hex: string) => {
  const [r, g, b] = hexRgb(hex).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// Same precedence as B1App's mobile theme: the B1 Mobile light primary, then the website primary.
export const churchBrandColor = (settings?: { appTheme?: string; primaryColor?: string } | null) => {
  let appPrimary: string | undefined;
  try { appPrimary = settings?.appTheme ? JSON.parse(settings.appTheme)?.light?.primary : undefined; } catch { /* malformed setting */ }
  return [appPrimary, settings?.primaryColor].find(isHexColor) || DEFAULT_BRAND;
};

// Every surface, hairline and chip is mixed from the church primary; status and accent colors stay Soft's.
export const customTokens = (brand: string, mode: PaletteMode): B1Tokens => {
  const b = isHexColor(brand) ? brand : DEFAULT_BRAND;
  const W = "#FFFFFF", K = "#000000";
  const base = b1Tokens.soft[mode];
  if (mode === "dark") {
    const primary = mix(b, W, 0.4);
    const surface = mix(b, "#141a22", 0.88);
    const chip = mix(b, "#141a22", 0.65);
    const onChip = mix(b, W, 0.78);
    return {
      ...base,
      canvas: mix(b, "#0b0f15", 0.9),
      surface,
      sidebar: mix(b, "#0b0f15", 0.86),
      header: mix(b, K, 0.72),
      headerHover: mix(b, K, 0.6),
      headerMuted: mix(b, W, 0.75),
      primary,
      primaryHover: mix(b, W, 0.55),
      primaryPressed: mix(b, W, 0.65),
      onPrimary: "#0C1118",
      selected: mix(b, "#141a22", 0.6),
      onSelected: mix(b, W, 0.8),
      hover: mix(b, "#141a22", 0.8),
      text: "#E6EBF1",
      muted: "#A7B1BD",
      border: mix(b, "#2a323d", 0.85),
      controlBorder: mix(b, "#6d7785", 0.85),
      focus: mix(b, W, 0.5),
      link: mix(b, W, 0.5),
      mark: mix(b, K, 0.15),
      markEmpty: mix(b, "#141a22", 0.82),
      wash: mix(b, "#141a22", 0.72),
      avatar: b,
      onAvatar: luminance(b) > 0.42 ? "#121820" : W,
      chip,
      onChip,
      eyebrow: mix(b, W, 0.5),
      pillBg: chip,
      pillFg: onChip
    };
  }
  const onPrimary = luminance(b) > 0.42 ? "#121820" : W;
  const chip = mix(b, W, 0.87);
  const onChip = mix(b, K, 0.45);
  return {
    ...base,
    canvas: mix(b, W, 0.955),
    surface: W,
    sidebar: mix(b, W, 0.92),
    header: mix(b, K, 0.58),
    headerHover: mix(b, K, 0.45),
    headerMuted: mix(b, W, 0.75),
    primary: b,
    primaryHover: mix(b, K, 0.18),
    primaryPressed: mix(b, K, 0.3),
    onPrimary,
    selected: mix(b, W, 0.85),
    onSelected: mix(b, K, 0.45),
    hover: mix(b, W, 0.93),
    text: mix(b, "#141b24", 0.9),
    muted: mix(b, "#566170", 0.88),
    border: mix(b, "#dfe4ea", 0.9),
    controlBorder: mix(b, "#7b8592", 0.88),
    focus: b,
    disabledBg: mix(b, "#e7ecf2", 0.9),
    disabledText: mix(b, "#66788d", 0.9),
    link: mix(b, K, 0.08),
    mark: mix(b, W, 0.45),
    markEmpty: mix(b, W, 0.9),
    wash: mix(b, W, 0.9),
    avatar: b,
    onAvatar: onPrimary,
    chip,
    onChip,
    eyebrow: mix(b, K, 0.05),
    pillBg: chip,
    pillFg: onChip
  };
};

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

// Classic-only global rules: the old full-width gradient page banner (ui/PageHeader renders .b1-banner), shadowed panels and plainer links.
const classicCss = (cardShadow: string) => ({
  ".b1-banner": {
    position: "relative",
    overflow: "hidden",
    paddingBottom: 28,
    color: "#FFFFFF",
    background: "linear-gradient(180deg, #09245F 0%, #114A99 55%, #3578CC 100%)",
    "&::before": { content: '""', position: "absolute", top: -100, right: -100, width: 400, height: 400, borderRadius: "50%", background: "rgba(255, 255, 255, 0.04)", pointerEvents: "none" }
  },
  ".b1-banner #page-header": { position: "relative" },
  ".b1-banner #page-header-title": { color: "#FFFFFF", fontSize: "1.25rem", lineHeight: "28px" },
  ".b1-banner #page-header-subtitle, .b1-banner #page-header-statistics .MuiTypography-caption": { color: "rgba(255, 255, 255, 0.75) !important" },
  ".b1-banner #page-header-statistics, .b1-banner #page-header-chips": { color: "#FFFFFF" },
  ".b1-banner .MuiButton-text, .b1-banner .MuiIconButton-root, .b1-banner .MuiButton-text .MuiSvgIcon-root": { color: "#FFFFFF" },
  ".b1-banner .MuiButton-text:hover, .b1-banner .MuiIconButton-root:hover": { backgroundColor: "rgba(255, 255, 255, 0.12)" },
  ".b1-banner .MuiButton-outlined": { color: "#FFFFFF !important", borderColor: "rgba(255, 255, 255, 0.55) !important", backgroundColor: "transparent !important" },
  ".b1-banner .MuiButton-outlined:hover": { borderColor: "rgba(255, 255, 255, 0.8)", backgroundColor: "rgba(255, 255, 255, 0.12)" },
  ".b1-banner-icon": { width: 56, height: 56, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, backgroundColor: "rgba(255, 255, 255, 0.18)", color: "#FFFFFF", "& .MuiSvgIcon-root, & .material-icons": { fontSize: 32, color: "#FFFFFF" } },
  ".b1-surface": { borderColor: "transparent !important", boxShadow: cardShadow, borderRadius: 8 },
  "td a, td .MuiLink-root, td .MuiTypography-root a": { fontWeight: 400 }
});

const getBaseThemeOptions = (mode: PaletteMode, themeId: ThemeId, brand: string): ThemeOptions => {
  const t: B1Tokens = themeId === "custom" ? customTokens(brand, mode) : b1Tokens[themeId][mode];
  const shape = themeShape[themeId];
  const popoverShadow = `0 8px 24px ${shape.shadow}`;
  const dialogShadow = `0 16px 48px ${shape.dialog}`;
  const classic = themeId === "classic";
  // Panels are bordered, not shadowed (Classic keeps the old soft card shadow); floating layers (menus, popovers, dialogs: elevation >= 8) cast a bigger one.
  const cardShadow = classic ? (mode === "light" ? "0 2px 8px rgba(0, 0, 0, 0.1)" : "0 2px 8px rgba(0, 0, 0, 0.4)") : "none";
  const shadows = Array.from({ length: 25 }, (_, i) => (i === 0 ? "none" : i < 8 ? cardShadow : i >= 16 ? dialogShadow : popoverShadow)) as Shadows;
  const primaryLight = { soft: mode === "light" ? "#4A8BD6" : "#9CC4F6", classic: mode === "light" ? "#3578CC" : "#9CC4F6", custom: mix(t.primary, "#FFFFFF", 0.3) }[themeId];
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
      h1: classic ? { fontSize: "1.5rem", lineHeight: "32px", fontWeight: 650 } : { fontSize: "1.875rem", lineHeight: "36px", fontWeight: 650, letterSpacing: "-0.02em" },
      h2: classic ? { fontSize: "1.25rem", lineHeight: "28px", fontWeight: 500 } : { fontSize: "1.375rem", lineHeight: "29px", fontWeight: 650 },
      h3: classic ? { fontSize: "1.25rem", lineHeight: "28px", fontWeight: 400 } : { fontSize: "1.125rem", lineHeight: "25px", fontWeight: 600 },
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
          "#display-box-icon, #input-box-icon": { color: t.muted, fontSize: 20 },
          "#input-box-buttons .MuiButton-outlinedWarning": { color: t.text, borderColor: t.controlBorder },
          "@media (min-width: 900px)": { ".MuiPaper-root:has(> #display-box-header), .MuiPaper-root:has(> #input-box-header)": { padding: 24 } },
          "body.dark-theme #banner": { backgroundColor: t.surface, borderBottom: `1px solid ${t.border}` },
          ".google-visualization-tooltip, .google-visualization-tooltip *": { pointerEvents: "none" },
          ".rowActions .MuiIconButton-root": { opacity: 0.45, transition: "opacity 0.12s" },
          "tr:hover .rowActions .MuiIconButton-root, .rowActions .MuiIconButton-root:focus-visible": { opacity: 1 },
          "@media (prefers-reduced-motion: reduce)": { ".rowActions .MuiIconButton-root, .MuiButton-root, .MuiTableRow-root": { transition: "none" } },
          ...(classic ? classicCss(cardShadow) : {})
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
        styleOverrides: { root: classic ? { borderRadius: 8, border: "none", boxShadow: cardShadow, backgroundImage: "none" } : { borderRadius: 10, border: `1px solid ${t.border}`, boxShadow: "none", backgroundImage: "none" } }
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: "none" },
          elevation1: classic ? { "&.MuiPaper-rounded": { borderRadius: 8 } } : { border: `1px solid ${t.border}`, "&.MuiPaper-rounded": { borderRadius: 10 } }
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
          head: { fontSize: "0.75rem", lineHeight: "18px", fontWeight: 600, color: t.muted, backgroundColor: "transparent", ...(classic ? { textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "0.6875rem" } : {}) },
          body: { fontSize: "0.875rem", lineHeight: "21px", height: 56, fontVariantNumeric: "tabular-nums" },
          sizeSmall: { padding: "8px 12px", "&.MuiTableCell-body": { height: 44 } }
        }
      }
    }
  };
};

export const createAppTheme = (mode: PaletteMode, themeId: ThemeId = "soft", brand: string = DEFAULT_BRAND) => createTheme(getBaseThemeOptions(mode, themeId, brand));

export class Themes {
  static BaseTheme = createAppTheme("light", "soft");

  static NavBarStyle = {
    "& .selected .MuiListItemButton-root": {
      backgroundColor: "action.selected",
      borderRadius: 4
    }
  };
}
