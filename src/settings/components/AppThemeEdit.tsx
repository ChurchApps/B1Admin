import React from "react";
import { TextField, Grid, Typography, Box, Stack, Button, Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import { ExpandMore } from "@mui/icons-material";
import { ApiHelper, InputBox, Locale } from "@churchapps/apphelper";
import type { GenericSettingInterface } from "@churchapps/helpers";

export interface AppThemeModeColors {
  background: string;
  surface: string;
  primary: string;
  primaryContrast: string;
  secondary: string;
  textColor: string;
}

export interface AppThemeConfig {
  light: AppThemeModeColors;
  dark: AppThemeModeColors;
}

const DEFAULT_LIGHT: AppThemeModeColors = {
  background: "#F6F6F8",
  surface: "#FFFFFF",
  primary: "#0D47A1",
  primaryContrast: "#FFFFFF",
  secondary: "#568BDA",
  textColor: "#3c3c3c"
};

const DEFAULT_DARK: AppThemeModeColors = {
  background: "#121212",
  surface: "#1E1E1E",
  primary: "#0D47A1",
  primaryContrast: "#FFFFFF",
  secondary: "#568BDA",
  textColor: "#FFFFFF"
};

const DEFAULT_THEME: AppThemeConfig = { light: DEFAULT_LIGHT, dark: DEFAULT_DARK };

export const AppThemeEdit: React.FC = () => {
  const [themeConfig, setThemeConfig] = React.useState<AppThemeConfig>({ ...DEFAULT_THEME });
  const [setting, setSetting] = React.useState<GenericSettingInterface | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const loadData = React.useCallback(async () => {
    try {
      const allSettings: GenericSettingInterface[] = await ApiHelper.get("/settings", "MembershipApi");
      const themeSetting = allSettings.find(s => s.keyName === "appTheme");
      if (themeSetting?.value) {
        setSetting(themeSetting);
        const parsed = JSON.parse(themeSetting.value);
        setThemeConfig({
          light: { ...DEFAULT_LIGHT, ...(parsed.light || {}) },
          dark: { ...DEFAULT_DARK, ...(parsed.dark || {}) }
        });
      }
    } catch (error) {
      console.error("Error loading app theme:", error);
    }
  }, []);

  React.useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const s: GenericSettingInterface = setting || { keyName: "appTheme", public: 1 };
      s.value = JSON.stringify(themeConfig);
      await ApiHelper.post("/settings", [s], "MembershipApi");
      await loadData();
    } catch (error) {
      console.error("Error saving app theme:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setThemeConfig({ ...DEFAULT_THEME });
  };

  const updateColor = (mode: "light" | "dark", key: keyof AppThemeModeColors, value: string) => {
    setThemeConfig(prev => ({ ...prev, [mode]: { ...prev[mode], [key]: value } }));
  };

  const colorField = (mode: "light" | "dark", label: string, key: keyof AppThemeModeColors) => (
    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <TextField
          type="color"
          label={label}
          value={themeConfig[mode][key]}
          onChange={e => updateColor(mode, key, e.target.value)}
          sx={{ width: 120, "& .MuiInputBase-input": { height: 36 } }}
          size="small"
        />
        <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "monospace" }}>{themeConfig[mode][key]}</Typography>
      </Stack>
    </Grid>
  );

  const modePreview = (mode: "light" | "dark") => {
    const colors = themeConfig[mode];
    return (
      <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden", maxWidth: 360 }}>
        <Box sx={{ backgroundColor: colors.primary, color: colors.primaryContrast, p: 1.5, fontSize: "0.875rem", fontWeight: 500 }}>
          Header Preview
        </Box>
        <Box sx={{ backgroundColor: colors.background, p: 2 }}>
          <Box sx={{ backgroundColor: colors.surface, borderRadius: 1, p: 2, mb: 1 }}>
            <Typography variant="body2" sx={{ color: colors.textColor, fontWeight: 500 }}>Card content</Typography>
            <Typography variant="caption" sx={{ color: colors.secondary }}>Secondary text</Typography>
          </Box>
          <Box sx={{ backgroundColor: colors.primary, color: colors.primaryContrast, borderRadius: 1, p: 1, textAlign: "center", fontSize: "0.75rem" }}>
            Button
          </Box>
        </Box>
      </Box>
    );
  };

  const modeSection = (mode: "light" | "dark", title: string) => (
    <Accordion defaultExpanded={mode === "light"}>
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Typography variant="subtitle1" fontWeight={600}>{title}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {colorField(mode, "Background", "background")}
          {colorField(mode, "Surface", "surface")}
          {colorField(mode, "Primary", "primary")}
          {colorField(mode, "Primary Contrast", "primaryContrast")}
          {colorField(mode, "Secondary", "secondary")}
          {colorField(mode, "Text Color", "textColor")}
        </Grid>
        <Typography variant="subtitle2" sx={{ mb: 1, color: "text.secondary" }}>Preview</Typography>
        {modePreview(mode)}
      </AccordionDetails>
    </Accordion>
  );

  return (
    <InputBox headerText={Locale.label("common.appTheme")} headerIcon="palette" saveFunction={handleSave} isSubmitting={isSubmitting}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {Locale.label("mobile.appThemeEdit.description")}
      </Typography>
      <Box sx={{ mb: 2 }}>
        <Button variant="outlined" size="small" onClick={handleReset}>{Locale.label("mobile.appThemeEdit.resetDefaults")}</Button>
      </Box>
      {modeSection("light", Locale.label("mobile.appThemeEdit.lightMode"))}
      {modeSection("dark", Locale.label("mobile.appThemeEdit.darkMode"))}
    </InputBox>
  );
};
