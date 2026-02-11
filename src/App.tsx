import React, { useMemo } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ControlPanel } from "./ControlPanel";
import { UserProvider } from "./UserContext";
import { ThemeContextProvider, useThemeMode } from "./ThemeContext";
import { CookiesProvider } from "react-cookie";
import { createTheme, CssBaseline, ThemeProvider, type PaletteMode } from "@mui/material";
import "@churchapps/apphelper-markdown/dist/components/markdownEditor/editor.css";
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
}

const createMdTheme = (mode: PaletteMode) =>
  createTheme({
    palette: {
      mode,
      InputBox: { headerText: mode === "light" ? "#333333" : "#e0e0e0" },
      background: {
        default: mode === "light" ? "#e5e8ee" : "#121212",
        paper: mode === "light" ? "#ffffff" : "#1e1e1e"
      }
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          // Dark mode styles for the banner/subnav area from apphelper
          "#banner": mode === "dark" ? {
            backgroundColor: "#1e1e1e !important",
            borderBottom: "1px solid #333"
          } : {}
        }
      },
      MuiTextField: {
        defaultProps: { margin: "normal" },
        styleOverrides: {
          root: {
            marginTop: 16,
            marginBottom: 8,
            "& .MuiOutlinedInput-root": { "&:hover fieldset": { borderColor: mode === "light" ? "rgba(0, 0, 0, 0.23)" : "rgba(255, 255, 255, 0.23)" } }
          }
        }
      },
      MuiFormControl: {
        defaultProps: { margin: "normal" },
        styleOverrides: {
          root: {
            marginTop: 16,
            marginBottom: 8
          }
        }
      },
      MuiButton: { styleOverrides: { root: { textTransform: "none" } } },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            boxShadow: mode === "light" ? "0 2px 8px rgba(0,0,0,0.1)" : "0 2px 8px rgba(0,0,0,0.4)"
          }
        }
      }
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontSize: "2rem",
        fontWeight: 500
      },
      h2: {
        fontSize: "1.75rem",
        fontWeight: 500
      },
      h3: {
        fontSize: "1.5rem",
        fontWeight: 500
      }
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
