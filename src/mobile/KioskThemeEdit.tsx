import React from "react";
import { TextField, Switch, FormControlLabel, Typography, Button, Box, Stack, Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import { ExpandMore, Delete as DeleteIcon, Add as AddIcon } from "@mui/icons-material";
import { ApiHelper, InputBox, Locale } from "@churchapps/apphelper";
import { ImageEditor } from "../components/gallery";
import type { GenericSettingInterface } from "@churchapps/helpers";
import { AppIconButton } from "../components/ui/AppIconButton";

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

interface CheckinSettingsConfig {
  backgroundImage: string;
  idleScreen: IdleScreenConfig;
}

const DEFAULT_SETTINGS: CheckinSettingsConfig = {
  backgroundImage: "",
  idleScreen: { enabled: false, timeoutSeconds: 120, slides: [] }
};

export const KioskThemeEdit: React.FC = () => {
  const [config, setConfig] = React.useState<CheckinSettingsConfig>({ ...DEFAULT_SETTINGS });
  const [setting, setSetting] = React.useState<GenericSettingInterface | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [editingImage, setEditingImage] = React.useState<string | null>(null);
  const [editingSlideIndex, setEditingSlideIndex] = React.useState(-1);

  const loadData = React.useCallback(async () => {
    try {
      const allSettings: GenericSettingInterface[] = await ApiHelper.get("/settings", "MembershipApi");
      // Try new key first, fall back to legacy checkinTheme
      const themeSetting = allSettings.find(s => s.keyName === "checkinSettings");
      if (!themeSetting) {
        const legacy = allSettings.find(s => s.keyName === "checkinTheme");
        if (legacy?.value) {
          const parsed = JSON.parse(legacy.value);
          setSetting(null);
          setConfig({
            backgroundImage: parsed.backgroundImage || "",
            idleScreen: { ...DEFAULT_SETTINGS.idleScreen, ...(parsed.idleScreen || {}) }
          });
          return;
        }
      }
      if (themeSetting?.value) {
        setSetting(themeSetting);
        const parsed = JSON.parse(themeSetting.value);
        setConfig({
          backgroundImage: parsed.backgroundImage || "",
          idleScreen: { ...DEFAULT_SETTINGS.idleScreen, ...(parsed.idleScreen || {}) }
        });
      }
    } catch (error) {
      console.error("Error loading checkin settings:", error);
    }
  }, []);

  React.useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const s: GenericSettingInterface = setting || { keyName: "checkinSettings", public: 1 };
      s.value = JSON.stringify(config);
      await ApiHelper.post("/settings", [s], "MembershipApi");
      await loadData();
    } catch (error) {
      console.error("Error saving checkin settings:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackgroundImageUpdate = async (dataUrl: string) => {
    if (!dataUrl) { setEditingImage(null); return; }
    const imgSetting: GenericSettingInterface = { keyName: "checkinSettings_bg", value: dataUrl, public: 1 };
    const saved = await ApiHelper.post("/settings", [imgSetting], "MembershipApi");
    const result = saved?.checkinSettings_bg || saved?.find?.((s: any) => s.keyName === "checkinSettings_bg");
    if (result?.value) {
      setConfig(prev => ({ ...prev, backgroundImage: result.value }));
    }
    setEditingImage(null);
  };

  const handleSlideImageUpdate = async (dataUrl: string) => {
    if (!dataUrl) { setEditingImage(null); return; }
    const slideKey = "checkinSettings_slide_" + editingSlideIndex;
    const imgSetting: GenericSettingInterface = { keyName: slideKey, value: dataUrl, public: 1 };
    const saved = await ApiHelper.post("/settings", [imgSetting], "MembershipApi");
    const result = saved?.[slideKey] || saved?.find?.((s: any) => s.keyName === slideKey);
    if (result?.value) {
      setConfig(prev => {
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
    setEditingSlideIndex(config.idleScreen.slides.length);
    setEditingImage("slide");
  };

  const removeSlide = (index: number) => {
    setConfig(prev => {
      const slides = prev.idleScreen.slides.filter((_, i) => i !== index);
      return { ...prev, idleScreen: { ...prev.idleScreen, slides } };
    });
  };

  const updateSlideDuration = (index: number, duration: number) => {
    setConfig(prev => {
      const slides = [...prev.idleScreen.slides];
      slides[index] = { ...slides[index], durationSeconds: duration };
      return { ...prev, idleScreen: { ...prev.idleScreen, slides } };
    });
  };

  if (editingImage === "background") {
    return <ImageEditor aspectRatio={16 / 9} photoUrl={config.backgroundImage} onCancel={() => setEditingImage(null)} onUpdate={handleBackgroundImageUpdate} outputWidth={1920} outputHeight={1080} />;
  }

  if (editingImage === "slide") {
    const currentUrl = editingSlideIndex < config.idleScreen.slides.length ? config.idleScreen.slides[editingSlideIndex]?.imageUrl : "";
    return <ImageEditor aspectRatio={16 / 9} photoUrl={currentUrl || ""} onCancel={() => setEditingImage(null)} onUpdate={handleSlideImageUpdate} outputWidth={1920} outputHeight={1080} />;
  }

  return (
    <InputBox headerText={Locale.label("mobile.checkInPage.kiosk.sectionTitle")} headerIcon="settings" saveFunction={handleSave} isSubmitting={isSubmitting}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {Locale.label("mobile.checkInPage.kiosk.headerSubtitle")}
      </Typography>

      {/* Background Image Section */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1" fontWeight={600}>{Locale.label("mobile.checkInPage.kiosk.backgroundImage")}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {Locale.label("mobile.checkInPage.kiosk.backgroundImageDesc")}
          </Typography>
          {config.backgroundImage && (
            <Box sx={{ mb: 2 }}>
              <img src={config.backgroundImage} alt={Locale.label("mobile.checkInPage.kiosk.backgroundImage")} style={{ maxWidth: 300, maxHeight: 170, borderRadius: 8, border: "1px solid #ccc" }} />
            </Box>
          )}
          <Stack direction="row" spacing={2}>
            <Button variant="outlined" onClick={() => setEditingImage("background")}>
              {config.backgroundImage ? Locale.label("mobile.checkInPage.kiosk.changeImage") : Locale.label("mobile.checkInPage.kiosk.uploadImage")}
            </Button>
            {config.backgroundImage && (
              <Button variant="outlined" color="error" onClick={() => setConfig(prev => ({ ...prev, backgroundImage: "" }))}>
                {Locale.label("common.remove")}
              </Button>
            )}
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Idle Screen Section */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1" fontWeight={600}>{Locale.label("mobile.checkInPage.kiosk.idleScreen")}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <FormControlLabel
            control={
              <Switch
                checked={config.idleScreen.enabled}
                onChange={e => setConfig(prev => ({ ...prev, idleScreen: { ...prev.idleScreen, enabled: e.target.checked } }))}
              />
            }
            label={Locale.label("mobile.checkInPage.kiosk.enableIdleScreen")}
          />
          <TextField
            type="number"
            label={Locale.label("mobile.checkInPage.kiosk.timeoutSeconds")}
            value={config.idleScreen.timeoutSeconds}
            onChange={e => setConfig(prev => ({ ...prev, idleScreen: { ...prev.idleScreen, timeoutSeconds: parseInt(e.target.value) || 120 } }))}
            size="small"
            sx={{ mt: 2, mb: 3, width: 200 }}
            slotProps={{ htmlInput: { min: 10 } }}
          />

          <Typography variant="subtitle2" sx={{ mb: 1 }}>{Locale.label("mobile.checkInPage.kiosk.slides")}</Typography>
          {config.idleScreen.slides.map((slide, index) => (
            <Stack key={index} direction="row" spacing={2} alignItems="center" sx={{ mb: 2, p: 1.5, border: "1px solid #e0e0e0", borderRadius: 2 }}>
              {slide.imageUrl && (
                <img src={slide.imageUrl} alt={`${Locale.label("mobile.checkInPage.kiosk.slides")} ${index + 1}`} style={{ width: 120, height: 68, objectFit: "cover", borderRadius: 4 }} />
              )}
              <Button size="small" variant="outlined" onClick={() => { setEditingSlideIndex(index); setEditingImage("slide"); }}>
                {slide.imageUrl ? Locale.label("common.change") : Locale.label("mobile.checkInPage.kiosk.upload")}
              </Button>
              <TextField
                type="number"
                label={Locale.label("mobile.checkInPage.kiosk.duration")}
                value={slide.durationSeconds}
                onChange={e => updateSlideDuration(index, parseInt(e.target.value) || 10)}
                size="small"
                sx={{ width: 120 }}
                slotProps={{ htmlInput: { min: 3 } }}
              />
              <AppIconButton label={Locale.label("common.delete")} icon={<DeleteIcon />} destructive onClick={() => removeSlide(index)} />
            </Stack>
          ))}
          <Button variant="outlined" startIcon={<AddIcon />} onClick={addSlide}>{Locale.label("mobile.checkInPage.kiosk.addSlide")}</Button>
        </AccordionDetails>
      </Accordion>
    </InputBox>
  );
};
