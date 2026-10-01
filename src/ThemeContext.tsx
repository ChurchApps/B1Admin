import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { type ThemeId } from "./helpers/Themes";

type ThemeMode = "light" | "dark";

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
  themeId: ThemeId;
  setTheme: (themeId: ThemeId) => void;
}

const THEME_STORAGE_KEY = "b1admin-theme-mode";
const THEME_ID_KEY = "b1admin-theme";

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const getInitialMode = (): ThemeMode => {
  if (typeof window === "undefined") return "light";
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch { /* storage unavailable, e.g. embedded WebView */ }
  return "light";
};

const getInitialTheme = (): ThemeId => {
  if (typeof window === "undefined") return "soft";
  try {
    const stored = localStorage.getItem(THEME_ID_KEY);
    if (stored === "soft" || stored === "warm") return stored;
  } catch { /* storage unavailable */ }
  return "soft";
};

interface Props {
  children: React.ReactNode;
}

export const ThemeContextProvider = ({ children }: Props) => {
  const [mode, setMode] = useState<ThemeMode>(getInitialMode);
  const [themeId, setThemeId] = useState<ThemeId>(getInitialTheme);

  useEffect(() => {
    try { localStorage.setItem(THEME_STORAGE_KEY, mode); } catch { /* storage unavailable */ }
    document.body.classList.toggle("dark-theme", mode === "dark");
  }, [mode]);

  useEffect(() => {
    try { localStorage.setItem(THEME_ID_KEY, themeId); } catch { /* storage unavailable */ }
    document.body.dataset.b1Theme = themeId;
    document.body.classList.toggle("theme-warm", themeId === "warm");
    document.body.classList.toggle("theme-soft", themeId === "soft");
  }, [themeId]);

  const toggleTheme = () => {
    setMode((prev) => (prev === "light" ? "dark" : "light"));
  };

  const setTheme = (next: ThemeId) => setThemeId(next);

  const value = useMemo(() => ({ mode, toggleTheme, themeId, setTheme }), [mode, themeId]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useThemeMode = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeMode must be used within a ThemeContextProvider");
  }
  return context;
};

export default ThemeContext;
