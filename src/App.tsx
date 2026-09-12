import React, { useMemo } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ControlPanel } from "./ControlPanel";
import { UserProvider } from "./UserContext";
import { ThemeContextProvider, useThemeMode } from "./ThemeContext";
import { CookiesProvider } from "react-cookie";
import { createTheme, CssBaseline, ThemeProvider } from "@mui/material";
import type { OmarchySkin } from "./ThemeContext";
import "@churchapps/apphelper/dist/markdown/components/markdownEditor/editor.css";
import { EnvironmentHelper } from "./helpers";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./queryClient";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

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

const skinPalettes: Record<OmarchySkin, {
  primary: { main: string; light: string; dark: string; contrastText: string };
  InputBox: { headerText: string };
  background: { default: string; paper: string; subtle: string };
  divider: string;
  text: { primary: string; secondary: string };
  fontFamily: string;
}> = {
  b1: {
    primary: { main: "#1565C0", light: "#568BDA", dark: "#0E3D86", contrastText: "#FFFFFF" },
    InputBox: { headerText: "#333333" },
    background: { default: "#e5e8ee", paper: "#ffffff", subtle: "#fafafa" },
    divider: "#dddddd",
    text: { primary: "#333333", secondary: "#666666" },
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif'
  },
  harbor: {
    primary: { main: "#e0b15b", light: "#e8c37a", dark: "#b8893a", contrastText: "#100e0c" },
    InputBox: { headerText: "#f3ede3" },
    background: { default: "#100e0c", paper: "#1c1814", subtle: "#26211b" },
    divider: "rgba(243, 237, 227, 0.12)",
    text: { primary: "#f3ede3", secondary: "#a89f93" },
    fontFamily: '"Figtree", "Roboto", "Helvetica", "Arial", sans-serif'
  },
  ridge: {
    primary: { main: "#173633", light: "#3d6b63", dark: "#0f2422", contrastText: "#fff1d4" },
    InputBox: { headerText: "#19191b" },
    background: { default: "#f4eee4", paper: "#fffaf2", subtle: "#efe3d0" },
    divider: "#e4d5c2",
    text: { primary: "#19191b", secondary: "#5c574e" },
    fontFamily: '"Figtree", "Roboto", "Helvetica", "Arial", sans-serif'
  },
  tyro: {
    primary: { main: "#e84e15", light: "#f06a38", dark: "#b33a0e", contrastText: "#FFFFFF" },
    InputBox: { headerText: "#1a1a1a" },
    background: { default: "#f2f3f5", paper: "#ffffff", subtle: "#ececec" },
    divider: "#d8d8d8",
    text: { primary: "#1a1a1a", secondary: "#5a5a5a" },
    fontFamily: '"Figtree", "Roboto", "Helvetica", "Arial", sans-serif'
  },
  lake: {
    primary: { main: "#0d7479", light: "#2a9094", dark: "#08575b", contrastText: "#FFFFFF" },
    InputBox: { headerText: "#1c2a3a" },
    background: { default: "#e8eef1", paper: "#ffffff", subtle: "#dce8ea" },
    divider: "#cfd8dc",
    text: { primary: "#1c2a3a", secondary: "#5b6b75" },
    fontFamily: '"Figtree", "Roboto", "Helvetica", "Arial", sans-serif'
  },
  one: {
    primary: { main: "#111111", light: "#3e3e3e", dark: "#000000", contrastText: "#FFFFFF" },
    InputBox: { headerText: "#111111" },
    background: { default: "#f6f6f6", paper: "#ffffff", subtle: "#eeeeee" },
    divider: "#e7e7e7",
    text: { primary: "#111111", secondary: "#797979" },
    fontFamily: '"Work Sans", "Figtree", "Helvetica", "Arial", sans-serif'
  }
};

const createMdTheme = (skinName: OmarchySkin) => {
  const skin = skinPalettes[skinName];
  return createTheme({
    palette: {
      mode: skinName === "harbor" ? "dark" : "light",
      primary: skin.primary,
      InputBox: skin.InputBox,
      background: skin.background,
      divider: skin.divider,
      text: skin.text
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          "body.dark-theme #banner": {
            backgroundColor: "var(--om-surface)",
            borderBottom: "1px solid var(--om-line)"
          },
          ".google-visualization-tooltip, .google-visualization-tooltip *": { pointerEvents: "none" },
          ".rowActions .MuiIconButton-root": {
            opacity: 0.45,
            transition: "opacity 0.12s"
          },
          "tr:hover .rowActions .MuiIconButton-root, .rowActions .MuiIconButton-root:focus-visible": { opacity: 1 },
          "@media (prefers-reduced-motion: reduce)": { ".rowActions .MuiIconButton-root": { transition: "none" } }
        }
      },
      MuiTextField: {
        defaultProps: { margin: "normal" },
        styleOverrides: { root: { "& .MuiOutlinedInput-root": { "&:hover fieldset": { borderColor: skin.divider } } } }
      },
      MuiFormControl: { defaultProps: { margin: "normal" } },
      // always-shrunk labels: react-hook-form reset() fills inputs without events, so MUI's filled-state detection misses them
      MuiInputLabel: { defaultProps: { shrink: true } },
      MuiOutlinedInput: { defaultProps: { notched: true } },
      MuiButton: { styleOverrides: { root: { textTransform: "none" } } },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            border: `1px solid ${skin.divider}`,
            boxShadow: "0 1px 2px rgba(13,32,58,.06), 0 4px 14px rgba(13,32,58,.05)"
          }
        }
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            padding: "12px 16px",
            borderBottom: "1px solid var(--border-light)"
          },
          head: {
            fontSize: "11px",
            fontWeight: 650,
            textTransform: "uppercase",
            letterSpacing: ".07em",
            color: skin.text.secondary,
            backgroundColor: "transparent",
            borderBottom: `1px solid ${skin.divider}`
          },
          body: { fontVariantNumeric: "tabular-nums" }
        }
      }
    },
    typography: {
      fontFamily: skin.fontFamily,
      h1: { fontSize: "2.5rem", fontWeight: 500, lineHeight: 1.2 },
      h2: { fontSize: "2.25rem", fontWeight: 500, lineHeight: 1.25 },
      h3: { fontSize: "clamp(1.75rem, 3vw, 2.25rem)", fontWeight: 500, lineHeight: 1.3 },
      h4: { fontSize: "1.75rem", fontWeight: 500, lineHeight: 1.35 },
      h5: { fontSize: "1.5rem", fontWeight: 500, lineHeight: 1.4 },
      h6: { fontSize: "1.25rem", fontWeight: 500, lineHeight: 1.45 },
      subtitle1: { fontSize: "1rem", fontWeight: 500, lineHeight: 1.5 },
      subtitle2: { fontSize: "0.875rem", fontWeight: 600, lineHeight: 1.5 },
      body1: { fontSize: "1rem", fontWeight: 400, lineHeight: 1.5 },
      body2: { fontSize: "0.875rem", fontWeight: 400, lineHeight: 1.5 },
      caption: { fontSize: "0.75rem", fontWeight: 400, lineHeight: 1.4 },
      overline: { fontSize: "0.75rem", fontWeight: 600, lineHeight: 1.4, letterSpacing: "0.5px", textTransform: "uppercase" }
    },
    shape: { borderRadius: 8 }
  });
};

const ThemedApp: React.FC = () => {
  const { skin } = useThemeMode();
  const theme = useMemo(() => createMdTheme(skin), [skin]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <CookiesProvider defaultSetOptions={{ path: "/" }}>
          <UserProvider>
            {/* Single app-lifetime backend: multiple DndProviders race on window.__isReactDndBackendSetUp ("Cannot have two HTML5 backends") */}
            <DndProvider backend={HTML5Backend}>
              <Router>
                <Routes>
                  <Route path="/*" element={<ControlPanel />} />
                </Routes>
              </Router>
            </DndProvider>
          </UserProvider>
        </CookiesProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

const App: React.FC = () => (
  <>
    {EnvironmentHelper.Common.GoogleAnalyticsTag && (
      <>
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${EnvironmentHelper.Common.GoogleAnalyticsTag}`} />
        <script
          dangerouslySetInnerHTML={{
            __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${EnvironmentHelper.Common.GoogleAnalyticsTag}', {
              page_path: window.location.pathname,
            });
          `
          }}
        />
      </>
    )}

    <ThemeContextProvider>
      <ThemedApp />
    </ThemeContextProvider>
  </>
);
export default App;
