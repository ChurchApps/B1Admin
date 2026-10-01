import React, { useMemo } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ControlPanel } from "./ControlPanel";
import { UserProvider } from "./UserContext";
import { ThemeContextProvider, useThemeMode } from "./ThemeContext";
import { CookiesProvider } from "react-cookie";
import { CssBaseline, ThemeProvider } from "@mui/material";
import "@churchapps/apphelper/dist/markdown/components/markdownEditor/editor.css";
import { EnvironmentHelper } from "./helpers";
import { createAppTheme } from "./helpers/Themes";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./queryClient";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

const ThemedApp: React.FC = () => {
  const { mode, themeId } = useThemeMode();
  const theme = useMemo(() => createAppTheme(mode, themeId), [mode, themeId]);

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
