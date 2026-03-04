import React from "react";
import { TextField, Switch, FormControlLabel, Typography, Button, IconButton, Box, Stack, Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import { ExpandMore, Delete as DeleteIcon, Add as AddIcon } from "@mui/icons-material";
import { ApiHelper, InputBox, ImageEditor } from "@churchapps/apphelper";
import { GenericSettingInterface } from "@churchapps/helpers";

interface CheckinThemeColors {
  primary: string;
  primaryContrast: string;
  secondary: string;
  secondaryContrast: string;
  headerBackground: string;
  subheaderBackground: string;
  buttonBackground: string;
  buttonText: string;
}

interface IdleSlide {
  imageUrl: string;
  durationSeconds: number;
  sort: number;
}

interface IdleScreenConfig {
  enabled: boolean;
  timeoutSeconds: number;
  slides: IdleSlide[];
}

interface CheckinThemeConfig {
  colors: CheckinThemeColors;
  backgroundImage: string;
  idleScreen: IdleScreenConfig;
}

const DEFAULT_COLORS: CheckinThemeColors = {
  primary: "#1565C0",
  primaryContrast: "#FFFFFF",
  secondary: "#568BDA",
  secondaryContrast: "#FFFFFF",
  headerBackground: "#1565C0",
  subheaderBackground: "#568BDA",
  buttonBackground: "#1565C0",
  buttonText: "#FFFFFF"
};

const DEFAULT_THEME: CheckinThemeConfig = {
  colors: DEFAULT_COLORS,
  backgroundImage: "",
  idleScreen: { enabled: false, timeoutSeconds: 120, slides: [] }
};

export const CheckinThemeEdit: React.FC = () => {
  const [themeConfig, setThemeConfig] = React.useState<CheckinThemeConfig>({ ...DEFAULT_THEME });
  const [setting, setSetting] = React.useState<GenericSettingInterface | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [editingImage, setEditingImage] = React.useState<string | null>(null);
  const [editingSlideIndex, setEditingSlideIndex] = React.useState(-1);

  const loadData = React.useCallback(async () => {
    try {
      const allSettings: GenericSettingInterface[] = await ApiHelper.get("/settings", "MembershipApi");
      const themeSetting = allSettings.find(s => s.keyName === "checkinTheme");
      if (themeSetting?.value) {
        setSetting(themeSetting);
        const parsed = JSON.parse(themeSetting.value);
        setThemeConfig({
          colors: { ...DEFAULT_COLORS, ...(parsed.colors || {}) },
          backgroundImage: parsed.backgroundImage || "",
          idleScreen: { ...DEFAULT_THEME.idleScreen, ...(parsed.idleScreen || {}) }
        });
      }
    } catch (error) {
      console.error("Error loading checkin theme:", error);
    }
  }, []);

  React.useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const s: GenericSettingInterface = setting || { keyName: "checkinTheme", public: 1 };
      s.value = JSON.stringify(themeConfig);
      await ApiHelper.post("/settings", [s], "MembershipApi");
      // Reload to get the saved setting with ID
      await loadData();
    } catch (error) {
      console.error("Error saving checkin theme:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateColor = (key: keyof CheckinThemeColors, value: string) => {
    setThemeConfig(prev => ({ ...prev, colors: { ...prev.colors, [key]: value } }));
  };

  const handleBackgroundImageUpdate = async (dataUrl: string) => {
    if (!dataUrl) { setEditingImage(null); return; }
    // Save image as separate setting so API converts base64 to S3 URL
    const imgSetting: GenericSettingInterface = { keyName: "checkinTheme_bg", value: dataUrl, public: 1 };
    const saved = await ApiHelper.post("/settings", [imgSetting], "MembershipApi");
    const result = saved?.checkinTheme_bg || saved?.find?.((s: any) => s.keyName === "checkinTheme_bg");
    if (result?.value) {
      setThemeConfig(prev => ({ ...prev, backgroundImage: result.value }));
    }
    setEditingImage(null);
  };

  const handleSlideImageUpdate = async (dataUrl: string) => {
    if (!dataUrl) { setEditingImage(null); return; }
    const slideKey = "checkinTheme_slide_" + editingSlideIndex;
    const imgSetting: GenericSettingInterface = { keyName: slideKey, value: dataUrl, public: 1 };
    const saved = await ApiHelper.post("/settings", [imgSetting], "MembershipApi");
    const result = saved?.[slideKey] || saved?.find?.((s: any) => s.keyName === slideKey);
    if (result?.value) {
      setThemeConfig(prev => {
        const slides = [...prev.idleScreen.slides];
        if (editingSlideIndex < slides.length) {
          slides[editingSlideIndex] = { ...slides[editingSlideIndex], imageUrl: result.value };
        } else {
          slides.push({ imageUrl: result.value, durationSeconds: 10, sort: slides.length + 1 });
        }
        return { ...prev, idleScreen: { ...prev.idleScreen, slides } };
      });
    }
    setEditingImage(null);
  };

  const addSlide = () => {
    setEditingSlideIndex(themeConfig.idleScreen.slides.length);
    setEditingImage("slide");
  };

  const removeSlide = (index: number) => {
    setThemeConfig(prev => {
      const slides = prev.idleScreen.slides.filter((_, i) => i !== index);
      return { ...prev, idleScreen: { ...prev.idleScreen, slides } };
    });
  };

  const updateSlideDuration = (index: number, duration: number) => {
    setThemeConfig(prev => {
      const slides = [...prev.idleScreen.slides];
      slides[index] = { ...slides[index], durationSeconds: duration };
      return { ...prev, idleScreen: { ...prev.idleScreen, slides } };
    });
  };

  const colorField = (label: string, key: keyof CheckinThemeColors) => (
    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
      <TextField
        type="color"
        label={label}
        value={themeConfig.colors[key]}
        onChange={e => updateColor(key, e.target.value)}
        sx={{ width: 120 }}
        size="small"
      />
      <Box sx={{ width: 60, height: 32, borderRadius: 1, backgroundColor: themeConfig.colors[key], border: "1px solid #ccc" }} />
      <Typography variant="body2" color="text.secondary">{themeConfig.colors[key]}</Typography>
    </Stack>
  );

  if (editingImage === "background") {
    return <ImageEditor aspectRatio={16 / 9} photoUrl={themeConfig.backgroundImage} onCancel={() => setEditingImage(null)} onUpdate={handleBackgroundImageUpdate} outputWidth={1920} outputHeight={1080} />;
  }

  if (editingImage === "slide") {
    const currentUrl = editingSlideIndex < themeConfig.idleScreen.slides.length ? themeConfig.idleScreen.slides[editingSlideIndex]?.imageUrl : "";
    return <ImageEditor aspectRatio={16 / 9} photoUrl={currentUrl || ""} onCancel={() => setEditingImage(null)} onUpdate={handleSlideImageUpdate} outputWidth={1920} outputHeight={1080} />;
  }

  return (
    <InputBox headerText="Kiosk Theme" headerIcon="palette" saveFunction={handleSave} isSubmitting={isSubmitting}>
      {/* Colors Section */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1" fontWeight={600}>Colors</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {colorField("Primary", "primary")}
          {colorField("Primary Contrast", "primaryContrast")}
          {colorField("Secondary", "secondary")}
          {colorField("Secondary Contrast", "secondaryContrast")}
          {colorField("Header Background", "headerBackground")}
          {colorField("Subheader Background", "subheaderBackground")}
          {colorField("Button Background", "buttonBackground")}
          {colorField("Button Text", "buttonText")}
        </AccordionDetails>
      </Accordion>

      {/* Background Image Section */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1" fontWeight={600}>Background Image</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Optional background image for the lookup/welcome screen. Recommended: 1920x1080.
          </Typography>
          {themeConfig.backgroundImage && (
            <Box sx={{ mb: 2 }}>
              <img src={themeConfig.backgroundImage} alt="Background" style={{ maxWidth: 300, maxHeight: 170, borderRadius: 8, border: "1px solid #ccc" }} />
            </Box>
          )}
          <Stack direction="row" spacing={2}>
            <Button variant="outlined" onClick={() => setEditingImage("background")}>
              {themeConfig.backgroundImage ? "Change Image" : "Upload Image"}
            </Button>
            {themeConfig.backgroundImage && (
              <Button variant="outlined" color="error" onClick={() => setThemeConfig(prev => ({ ...prev, backgroundImage: "" }))}>
                Remove
              </Button>
            )}
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Idle Screen Section */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1" fontWeight={600}>Idle Screen / Screensaver</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <FormControlLabel
            control={
              <Switch
                checked={themeConfig.idleScreen.enabled}
                onChange={e => setThemeConfig(prev => ({ ...prev, idleScreen: { ...prev.idleScreen, enabled: e.target.checked } }))}
              />
            }
            label="Enable idle screen"
          />
          <TextField
            type="number"
            label="Timeout (seconds)"
            value={themeConfig.idleScreen.timeoutSeconds}
            onChange={e => setThemeConfig(prev => ({ ...prev, idleScreen: { ...prev.idleScreen, timeoutSeconds: parseInt(e.target.value) || 120 } }))}
            size="small"
            sx={{ mt: 2, mb: 3, width: 200 }}
            slotProps={{ htmlInput: { min: 10 } }}
          />

          <Typography variant="subtitle2" sx={{ mb: 1 }}>Slides</Typography>
          {themeConfig.idleScreen.slides.map((slide, index) => (
            <Stack key={index} direction="row" spacing={2} alignItems="center" sx={{ mb: 2, p: 1.5, border: "1px solid #e0e0e0", borderRadius: 2 }}>
              {slide.imageUrl && (
                <img src={slide.imageUrl} alt={`Slide ${index + 1}`} style={{ width: 120, height: 68, objectFit: "cover", borderRadius: 4 }} />
              )}
              <Button size="small" variant="outlined" onClick={() => { setEditingSlideIndex(index); setEditingImage("slide"); }}>
                {slide.imageUrl ? "Change" : "Upload"}
              </Button>
              <TextField
                type="number"
                label="Duration (s)"
                value={slide.durationSeconds}
                onChange={e => updateSlideDuration(index, parseInt(e.target.value) || 10)}
                size="small"
                sx={{ width: 120 }}
                slotProps={{ htmlInput: { min: 3 } }}
              />
              <IconButton color="error" onClick={() => removeSlide(index)} size="small">
                <DeleteIcon />
              </IconButton>
            </Stack>
          ))}
          <Button variant="outlined" startIcon={<AddIcon />} onClick={addSlide}>Add Slide</Button>
        </AccordionDetails>
      </Accordion>
    </InputBox>
  );
};
