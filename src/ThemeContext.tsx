import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";

export const OMARCHY_SKINS = [
  { id: "b1", label: "B1" },
  { id: "harbor", label: "Harbor" },
  { id: "ridge", label: "Ridge" },
  { id: "tyro", label: "Tyro" },
  { id: "lake", label: "Lake" },
  { id: "one", label: "One" }
] as const;

export type OmarchySkin = (typeof OMARCHY_SKINS)[number]["id"];
type ThemeMode = "light" | "dark";

interface ThemeContextType {
  mode: ThemeMode;
  skin: OmarchySkin;
  setSkin: (skin: OmarchySkin) => void;
  toggleTheme: () => void;
}

const THEME_STORAGE_KEY = "b1admin-theme-mode";
const SKIN_STORAGE_KEY = "b1admin-omarchy-skin";
const SKIN_IDS: OmarchySkin[] = OMARCHY_SKINS.map((s) => s.id);

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const isSkin = (value: string | null): value is OmarchySkin => !!value && (SKIN_IDS as string[]).includes(value);

const getInitialSkin = (): OmarchySkin => {
  if (typeof window === "undefined") return "b1";
  try {
    const stored = localStorage.getItem(SKIN_STORAGE_KEY);
    if (isSkin(stored)) return stored;
  } catch { /* storage unavailable, e.g. embedded WebView */ }
  return "b1";
};

interface Props {
  children: React.ReactNode;
}

const applySkin = (skin: OmarchySkin) => {
  document.documentElement.setAttribute("data-theme", skin);
  document.body.classList.toggle("dark-theme", skin === "harbor");
};

export const ThemeContextProvider = ({ children }: Props) => {
  const [skin, setSkinState] = useState<OmarchySkin>(() => {
    const initial = getInitialSkin();
    if (typeof document !== "undefined") applySkin(initial);
    return initial;
  });

  useEffect(() => {
    applySkin(skin);
    try {
      localStorage.setItem(SKIN_STORAGE_KEY, skin);
      localStorage.setItem(THEME_STORAGE_KEY, "light");
    } catch { /* storage unavailable */ }
  }, [skin]);

  const setSkin = useCallback((next: OmarchySkin) => setSkinState(next), []);
  const toggleTheme = useCallback(() => {
    setSkinState((prev) => SKIN_IDS[(SKIN_IDS.indexOf(prev) + 1) % SKIN_IDS.length]);
  }, []);
  const value = useMemo(() => ({ mode: "light" as ThemeMode, skin, setSkin, toggleTheme }), [skin, setSkin, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useThemeMode = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeMode must be used within a ThemeContextProvider");
  }
  return context;
};

export const ThemeSelect: React.FC<{ className?: string }> = ({ className }) => {
  const { skin, setSkin } = useThemeMode();
  return (
    <select
      className={className || "om-theme-select"}
      value={skin}
      aria-label="Theme"
      onChange={(e) => setSkin(e.target.value as OmarchySkin)}>
      {OMARCHY_SKINS.map((s) => (
        <option key={s.id} value={s.id}>{s.label}</option>
      ))}
    </select>
  );
};

export default ThemeContext;
