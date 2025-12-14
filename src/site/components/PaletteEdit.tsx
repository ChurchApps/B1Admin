import { useState, useEffect } from "react";
import {
  Grid, TextField, Box, Typography, Card, CardContent, Stack, Button, alpha 
} from "@mui/material";
import { Palette as PaletteIcon, Visibility as VisibilityIcon, ColorLens as ColorLensIcon } from "@mui/icons-material";
import { Locale } from "@churchapps/apphelper";
import type { GlobalStyleInterface } from "../../helpers/Interfaces";
import { CardWithHeader, LoadingButton } from "../../components/ui";

interface Props {
  globalStyle?: GlobalStyleInterface;
  updatedFunction?: (paletteJson: string) => void;
}

export interface ColorInterface {
  light: string;
  lightAccent: string;
  accent: string;
  darkAccent: string;
  dark: string;
  primary?: string;
  secondary?: string;
  success?: string;
  warning?: string;
  error?: string;
}

export function PaletteEdit(props: Props) {
  const [palette, setPalette] = useState<ColorInterface>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pairings = [
    { background: "light", text: "lightAccent" },
    { background: "light", text: "accent" },
    { background: "light", text: "darkAccent" },
    { background: "light", text: "dark" },
    { background: "lightAccent", text: "light" },
    { background: "lightAccent", text: "accent" },
    { background: "lightAccent", text: "darkAccent" },
    { background: "lightAccent", text: "dark" },
    { background: "accent", text: "light" },
    { background: "accent", text: "lightAccent" },
    { background: "accent", text: "darkAccent" },
    { background: "accent", text: "dark" },
    { background: "darkAccent", text: "light" },
    { background: "darkAccent", text: "lightAccent" },
    { background: "darkAccent", text: "accent" },
    { background: "darkAccent", text: "dark" },
    { background: "dark", text: "light" },
    { background: "dark", text: "lightAccent" },
    { background: "dark", text: "accent" },
    { background: "dark", text: "darkAccent" },
  ];

  const suggestions = [
    { light: "#ffffff", lightAccent: "#dddddd", accent: "#dd0000", darkAccent: "#dd9999", dark: "#000000" },
    { light: "#faffff", lightAccent: "#7db8d6", accent: "#a77b60", darkAccent: "#37515e", dark: "#19191b" },
    { light: "#ffffff", lightAccent: "#e2dbe9", accent: "#5a4565", darkAccent: "#3e204f", dark: "#000000" },
    { light: "#ffffff", lightAccent: "#beccae", accent: "#506545", darkAccent: "#314f20", dark: "#000000" },
    { light: "#ffffff", lightAccent: "#aecccc", accent: "#455f65", darkAccent: "#20474f", dark: "#000000" },
    { light: "#ffffff", lightAccent: "#aebdcc", accent: "#454f65", darkAccent: "#20304f", dark: "#000000" },
    { light: "#ffffff", lightAccent: "#e4b0db", accent: "#925b7e", darkAccent: "#88366d", dark: "#000000" },
    { light: "#ffffff", lightAccent: "#de95a1", accent: "#944946", darkAccent: "#901e1e", dark: "#000000" },
    { light: "#ffffff", lightAccent: "#28c4f4", accent: "#f25822", darkAccent: "#0b4a7f", dark: "#000000" },
    { light: "#ffffff", lightAccent: "#efb302", accent: "#da3a2a", darkAccent: "#2f5095", dark: "#000000" },
    { light: "#ffffff", lightAccent: "#d4eb76", accent: "#5cb772", darkAccent: "#2f65af", dark: "#000000" },
    { light: "#ffffff", lightAccent: "#d6edfb", accent: "#5bc5ed", darkAccent: "#019cdf", dark: "#000000" },
    { light: "#ffffff", lightAccent: "#f6e43a", accent: "#328a3c", darkAccent: "#c70922", dark: "#000000" },
    { light: "#ffffff", lightAccent: "#ff9900", accent: "#cd0104", darkAccent: "#010066", dark: "#000000" },
    { light: "#ffffff", lightAccent: "#9cbe2b", accent: "#6ea501", darkAccent: "#004300", dark: "#000000" },
    { light: "#ffffff", lightAccent: "#ffb516", accent: "#ff640a", darkAccent: "#c90217", dark: "#000000" }
  ];

  useEffect(() => {
    if (props.globalStyle) setPalette(JSON.parse(props.globalStyle.palette));
  }, [props.globalStyle]);

  const handleSave = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      props.updatedFunction(JSON.stringify(palette));
      setIsSubmitting(false);
    }, 500);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const p = { ...palette };
    switch (e.target.name) {
      case "light": p.light = val; break;
      case "lightAccent": p.lightAccent = val; break;
      case "accent": p.accent = val; break;
      case "darkAccent": p.darkAccent = val; break;
      case "dark": p.dark = val; break;
      case "primary": p.primary = val; break;
      case "secondary": p.secondary = val; break;
      case "success": p.success = val; break;
      case "warning": p.warning = val; break;
      case "error": p.error = val; break;
    }
    setPalette(p);
  };

  const getPalette = (p: ColorInterface, index: number) => (
    <Card
      sx={{
        cursor: "pointer",
        transition: "all 0.2s ease-in-out",
        border: "1px solid",
        borderColor: "grey.200",
        "&:hover": { transform: "translateY(-2px)", boxShadow: 2, borderColor: "primary.main" }
      }}
      onClick={() => setPalette(p)}
      data-testid="suggested-palette"
      aria-label="Apply suggested color palette">
      <CardContent sx={{ p: 2 }}>
        <Stack direction="row" spacing={0.5} sx={{ mb: 1 }}>
          {Object.entries(p).map(([key, color]) => (
            <Box
              key={key}
              sx={{
                width: 32,
                height: 32,
                backgroundColor: color,
                borderRadius: 1,
                border: "1px solid",
                borderColor: "grey.300",
                flexShrink: 0
              }}
            />
          ))}
        </Stack>
        <Typography variant="caption" color="text.secondary">Palette {index + 1}</Typography>
      </CardContent>
    </Card>
  );

  const getPalettes = () => (
    <Grid container spacing={2}>
      {suggestions.map((s, index) => (
        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>{getPalette(s, index)}</Grid>
      ))}
    </Grid>
  );

  const getPairings = () => (
    <Grid container spacing={1}>
      {pairings.map((p, index) => {
        const backgroundName = p.background as keyof ColorInterface;
        const textName = p.text as keyof ColorInterface;
        const bg = palette[backgroundName];
        const text = palette[textName];
        return (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
            <Box
              sx={{
                backgroundColor: bg,
                color: text,
                border: "1px solid",
                borderColor: alpha(text, 0.3),
                borderRadius: 1,
                p: 1.5,
                textAlign: "center",
                minHeight: 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
              <Typography variant="body2" sx={{ fontSize: "0.75rem" }}>{p.background} + {p.text}</Typography>
            </Box>
          </Grid>
        );
      })}
    </Grid>
  );

  if (!palette) return null;

  return (
    <Box sx={{ maxWidth: 1200 }}>
      <Box sx={{ backgroundColor: "var(--c1l2)", color: "#FFF", p: 3, borderRadius: "12px 12px 0 0", mb: 0 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={2} alignItems="center">
            <Box sx={{
              backgroundColor: "rgba(255,255,255,0.2)", borderRadius: "8px", p: 1, display: "flex", alignItems: "center", justifyContent: "center" 
            }}>
              <PaletteIcon sx={{ fontSize: 24, color: "#FFF" }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>Color Palette</Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.9)" }}>Customize your site's color scheme</Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => props.updatedFunction(null)} sx={{ color: "#FFF", borderColor: "rgba(255,255,255,0.5)", "&:hover": { borderColor: "#FFF", backgroundColor: "rgba(255,255,255,0.1)" } }}>{Locale.label("common.cancel")}</Button>
            <LoadingButton loading={isSubmitting} loadingText={Locale.label("common.saving")} variant="contained" onClick={handleSave} sx={{ backgroundColor: "#FFF", color: "var(--c1l2)", "&:hover": { backgroundColor: "rgba(255,255,255,0.9)" } }} data-testid="save-palette-button">{Locale.label("site.paletteEdit.savePalette")}</LoadingButton>
          </Stack>
        </Stack>
      </Box>

      <Box sx={{
        p: 3, backgroundColor: "#FFF", borderRadius: "0 0 12px 12px", border: "1px solid", borderColor: "grey.200", borderTop: "none" 
      }}>
        <CardWithHeader title={Locale.label("site.paletteEdit.colorValues")} icon={<ColorLensIcon />}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: "text.primary" }}>Base Colors</Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
              <TextField type="color" label="Light" fullWidth name="light" value={palette.light} onChange={handleChange} data-testid="light-color-input" aria-label="Light color" sx={{ "& .MuiInputBase-input": { height: 48 } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
              <TextField type="color" label="Light Accent" fullWidth name="lightAccent" value={palette.lightAccent} onChange={handleChange} data-testid="light-accent-color-input" aria-label="Light accent color" sx={{ "& .MuiInputBase-input": { height: 48 } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
              <TextField type="color" label="Accent" fullWidth name="accent" value={palette.accent} onChange={handleChange} data-testid="accent-color-input" aria-label="Accent color" sx={{ "& .MuiInputBase-input": { height: 48 } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
              <TextField type="color" label="Dark Accent" fullWidth name="darkAccent" value={palette.darkAccent} onChange={handleChange} data-testid="dark-accent-color-input" aria-label="Dark accent color" sx={{ "& .MuiInputBase-input": { height: 48 } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
              <TextField type="color" label="Dark" fullWidth name="dark" value={palette.dark} onChange={handleChange} data-testid="dark-color-input" aria-label="Dark color" sx={{ "& .MuiInputBase-input": { height: 48 } }} />
            </Grid>
          </Grid>

          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: "text.primary" }}>Semantic Colors</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
              <TextField type="color" label="Primary" fullWidth name="primary" value={palette.primary || "#1976d2"} onChange={handleChange} data-testid="primary-color-input" aria-label="Primary color" sx={{ "& .MuiInputBase-input": { height: 48 } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
              <TextField type="color" label="Secondary" fullWidth name="secondary" value={palette.secondary || "#dc004e"} onChange={handleChange} data-testid="secondary-color-input" aria-label="Secondary color" sx={{ "& .MuiInputBase-input": { height: 48 } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
              <TextField type="color" label="Success" fullWidth name="success" value={palette.success || "#2e7d32"} onChange={handleChange} data-testid="success-color-input" aria-label="Success color" sx={{ "& .MuiInputBase-input": { height: 48 } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
              <TextField type="color" label="Warning" fullWidth name="warning" value={palette.warning || "#ed6c02"} onChange={handleChange} data-testid="warning-color-input" aria-label="Warning color" sx={{ "& .MuiInputBase-input": { height: 48 } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
              <TextField type="color" label="Error" fullWidth name="error" value={palette.error || "#d32f2f"} onChange={handleChange} data-testid="error-color-input" aria-label="Error color" sx={{ "& .MuiInputBase-input": { height: 48 } }} />
            </Grid>
          </Grid>
        </CardWithHeader>

        <Box sx={{ mt: 3 }}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <CardWithHeader title={Locale.label("site.paletteEdit.suggestedPalettes")} icon={<PaletteIcon />}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Click any palette to apply it instantly</Typography>
                {getPalettes()}
              </CardWithHeader>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <CardWithHeader title={Locale.label("site.paletteEdit.colorCombinationsPreview")} icon={<VisibilityIcon />}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Preview how your colors work together</Typography>
                {getPairings()}
              </CardWithHeader>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Box>
  );
}
