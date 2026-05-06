import { useState, useEffect } from "react";
import { Grid, TextField, Box, Typography, Stack, Button, Switch, FormControlLabel } from "@mui/material";
import { Menu as MenuIcon } from "@mui/icons-material";
import { Locale } from "@churchapps/apphelper";
import type { GlobalStyleInterface } from "../../helpers/Interfaces";
import { CardWithHeader, LoadingButton } from "../../components/ui";

interface Props {
  globalStyle?: GlobalStyleInterface;
  updatedFunction?: (navStylesJson: string) => void;
}

export interface NavSolidInterface {
  backgroundColor: string;
  linkColor: string;
  linkHoverColor: string;
  activeColor: string;
}

export interface NavTransparentInterface {
  linkColor: string | null;
  linkHoverColor: string | null;
  activeColor: string | null;
}

export interface NavStylesInterface {
  solid: NavSolidInterface;
  transparent: NavTransparentInterface;
}

const SOLID_DEFAULTS: NavSolidInterface = {
  backgroundColor: "#FFFFFF",
  linkColor: "#555555",
  linkHoverColor: "#03A9F4",
  activeColor: "#03A9F4"
};

const TRANSPARENT_DEFAULTS: NavTransparentInterface = {
  linkColor: null,
  linkHoverColor: null,
  activeColor: null
};

export function NavStyleEdit(props: Props) {
  const [navStyles, setNavStyles] = useState<NavStylesInterface>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (props.globalStyle?.navStyles) {
      try {
        const parsed = JSON.parse(props.globalStyle.navStyles);
        setNavStyles({
          solid: { ...SOLID_DEFAULTS, ...(parsed.solid || {}) },
          transparent: { ...TRANSPARENT_DEFAULTS, ...(parsed.transparent || {}) }
        });
      } catch {
        setNavStyles({ solid: { ...SOLID_DEFAULTS }, transparent: { ...TRANSPARENT_DEFAULTS } });
      }
    } else {
      setNavStyles({ solid: { ...SOLID_DEFAULTS }, transparent: { ...TRANSPARENT_DEFAULTS } });
    }
  }, [props.globalStyle]);

  const handleSave = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      props.updatedFunction(JSON.stringify(navStyles));
      setIsSubmitting(false);
    }, 500);
  };

  const handleSolidChange = (field: keyof NavSolidInterface, value: string) => {
    setNavStyles({ ...navStyles, solid: { ...navStyles.solid, [field]: value } });
  };

  const handleTransparentToggle = (field: keyof NavTransparentInterface, enabled: boolean) => {
    const next = { ...navStyles.transparent };
    next[field] = enabled ? "#FFFFFF" : null;
    setNavStyles({ ...navStyles, transparent: next });
  };

  const handleTransparentChange = (field: keyof NavTransparentInterface, value: string) => {
    setNavStyles({ ...navStyles, transparent: { ...navStyles.transparent, [field]: value } });
  };

  if (!navStyles) return null;

  const transparentField = (field: keyof NavTransparentInterface, label: string, testId: string) => {
    const value = navStyles.transparent[field];
    const enabled = value !== null;
    return (
      <Grid size={{ xs: 12, md: 4 }}>
        <FormControlLabel
          control={<Switch checked={enabled} onChange={(e) => handleTransparentToggle(field, e.target.checked)} data-testid={`${testId}-toggle`} />}
          label={Locale.label("site.navStyleEdit.override")}
        />
        <TextField
          type="color"
          label={label}
          fullWidth
          value={enabled ? value : "#FFFFFF"}
          disabled={!enabled}
          onChange={(e) => handleTransparentChange(field, e.target.value)}
          data-testid={`${testId}-input`}
          sx={{ "& .MuiInputBase-input": { height: 48 } }}
          helperText={enabled ? null : Locale.label("site.navStyleEdit.auto")}
        />
      </Grid>
    );
  };

  return (
    <Box sx={{ maxWidth: 1200 }}>
      <Box sx={{ backgroundColor: "primary.light", color: "#FFF", p: 3, borderRadius: "12px 12px 0 0", mb: 0 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={2} alignItems="center">
            <Box sx={{ backgroundColor: "rgba(255,255,255,0.2)", borderRadius: "8px", p: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MenuIcon sx={{ fontSize: 24, color: "#FFF" }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>{Locale.label("site.navStyleEdit.headerTitle")}</Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.9)" }}>{Locale.label("site.navStyleEdit.headerSubtitle")}</Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => props.updatedFunction(null)} sx={{ color: "#FFF", borderColor: "rgba(255,255,255,0.5)", "&:hover": { borderColor: "#FFF", backgroundColor: "rgba(255,255,255,0.1)" } }}>{Locale.label("common.cancel")}</Button>
            <LoadingButton loading={isSubmitting} loadingText={Locale.label("common.saving")} variant="contained" onClick={handleSave} sx={{ backgroundColor: "#FFF", color: "primary.light", "&:hover": { backgroundColor: "rgba(255,255,255,0.9)" } }} data-testid="save-nav-button">{Locale.label("site.navStyleEdit.saveNav")}</LoadingButton>
          </Stack>
        </Stack>
      </Box>

      <Box sx={{ p: 3, backgroundColor: "#FFF", borderRadius: "0 0 12px 12px", border: "1px solid", borderColor: "grey.200", borderTop: "none" }}>
        <CardWithHeader title={Locale.label("site.navStyleEdit.solidSection")} icon={<MenuIcon />}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{Locale.label("site.navStyleEdit.solidSectionDesc")}</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField type="color" label={Locale.label("site.navStyleEdit.backgroundColor")} fullWidth value={navStyles.solid.backgroundColor} onChange={(e) => handleSolidChange("backgroundColor", e.target.value)} data-testid="nav-solid-bg-input" sx={{ "& .MuiInputBase-input": { height: 48 } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField type="color" label={Locale.label("site.navStyleEdit.linkColor")} fullWidth value={navStyles.solid.linkColor} onChange={(e) => handleSolidChange("linkColor", e.target.value)} data-testid="nav-solid-link-input" sx={{ "& .MuiInputBase-input": { height: 48 } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField type="color" label={Locale.label("site.navStyleEdit.linkHoverColor")} fullWidth value={navStyles.solid.linkHoverColor} onChange={(e) => handleSolidChange("linkHoverColor", e.target.value)} data-testid="nav-solid-hover-input" sx={{ "& .MuiInputBase-input": { height: 48 } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField type="color" label={Locale.label("site.navStyleEdit.activeColor")} fullWidth value={navStyles.solid.activeColor} onChange={(e) => handleSolidChange("activeColor", e.target.value)} data-testid="nav-solid-active-input" sx={{ "& .MuiInputBase-input": { height: 48 } }} />
            </Grid>
          </Grid>
        </CardWithHeader>

        <Box sx={{ mt: 3 }}>
          <CardWithHeader title={Locale.label("site.navStyleEdit.transparentSection")} icon={<MenuIcon />}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{Locale.label("site.navStyleEdit.transparentSectionDesc")}</Typography>
            <Grid container spacing={2}>
              {transparentField("linkColor", Locale.label("site.navStyleEdit.linkColor"), "nav-transparent-link")}
              {transparentField("linkHoverColor", Locale.label("site.navStyleEdit.linkHoverColor"), "nav-transparent-hover")}
              {transparentField("activeColor", Locale.label("site.navStyleEdit.activeColor"), "nav-transparent-active")}
            </Grid>
          </CardWithHeader>
        </Box>
      </Box>
    </Box>
  );
}
