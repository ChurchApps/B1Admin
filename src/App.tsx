import React, { useMemo } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ControlPanel } from "./ControlPanel";
import { UserProvider } from "./UserContext";
import { ThemeContextProvider, useThemeMode } from "./ThemeContext";
import { CookiesProvider } from "react-cookie";
import { createTheme, CssBaseline, ThemeProvider, type PaletteMode } from "@mui/material";
import "@churchapps/apphelper/dist/markdown/components/markdownEditor/editor.css";
//TODO export the css from apphelper
import { EnvironmentHelper } from "./helpers";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./queryClient";

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

const createMdTheme = (mode: PaletteMode) =>
  createTheme({
    palette: {
      mode,
      primary: {
        main: "#1565C0",
        light: "#568BDA",
        dark: "#0E3D86",
        contrastText: "#FFFFFF"
      },
      InputBox: { headerText: mode === "light" ? "#333333" : "#e0e0e0" },
      background: {
        default: mode === "light" ? "#e5e8ee" : "#121212",
        paper: mode === "light" ? "#ffffff" : "#1e1e1e",
        subtle: mode === "light" ? "#fafafa" : "#333333"
      },
      divider: mode === "light" ? "#dddddd" : "#333333"
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          "body.dark-theme #banner": {
            backgroundColor: "#1e1e1e",
            borderBottom: "1px solid #333"
          }
        }
      },
      MuiTextField: {
        defaultProps: { margin: "normal" },
        styleOverrides: { root: { "& .MuiOutlinedInput-root": { "&:hover fieldset": { borderColor: mode === "light" ? "rgba(0, 0, 0, 0.23)" : "rgba(255, 255, 255, 0.23)" } } } }
      },
      MuiFormControl: { defaultProps: { margin: "normal" } },
      // always-shrunk labels: react-hook-form reset() fills inputs without events, so MUI's filled-state detection misses them
      MuiInputLabel: { defaultProps: { shrink: true } },
      MuiOutlinedInput: { defaultProps: { notched: true } },
      MuiButton: { styleOverrides: { root: { textTransform: "none" } } },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            boxShadow: mode === "light" ? "0 2px 8px rgba(0,0,0,0.1)" : "0 2px 8px rgba(0,0,0,0.4)"
          }
        }
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            padding: "12px 16px",
            borderBottom: "1px solid var(--border-light)"
          }
        }
      }
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
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

const ThemedApp: React.FC = () => {
  const { mode } = useThemeMode();
  const theme = useMemo(() => createMdTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <CookiesProvider defaultSetOptions={{ path: "/" }}>
          <UserProvider>
            <Router>
              <Routes>
                <Route path="/*" element={<ControlPanel />} />
              </Routes>
            </Router>
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
