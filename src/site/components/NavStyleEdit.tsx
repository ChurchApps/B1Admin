import { useState, useEffect } from "react";
import { Grid, TextField, Box, Typography, Stack, Button, Switch, FormControlLabel } from "@mui/material";
import { Menu as MenuIcon } from "@mui/icons-material";
import { Locale } from "@churchapps/apphelper";
import type { GlobalStyleInterface } from "../../helpers/Interfaces";
import { CardWithHeader, LoadingButton } from "../../components/ui";

interface Props {
  globalStyle?: GlobalStyleInterface | null;
  updatedFunction?: (navStylesJson: string | null) => void;
}

export interface NavSolidInterface {
  backgroundColor: string | null;
  linkColor: string | null;
  linkHoverColor: string | null;
  activeColor: string | null;
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

const EMPTY_SOLID: NavSolidInterface = { backgroundColor: null, linkColor: null, linkHoverColor: null, activeColor: null };
const EMPTY_TRANSPARENT: NavTransparentInterface = { linkColor: null, linkHoverColor: null, activeColor: null };

// Starting color when an override is first toggled on.
const PICKER_INITIAL = {
  backgroundColor: "#FFFFFF",
  linkColor: "#555555",
  linkHoverColor: "#03A9F4",
  activeColor: "#03A9F4"
};

export function NavStyleEdit(props: Props) {
  const [navStyles, setNavStyles] = useState<NavStylesInterface | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (props.globalStyle?.navStyles) {
      try {
        const parsed = JSON.parse(props.globalStyle.navStyles);
        setNavStyles({
          solid: { ...EMPTY_SOLID, ...(parsed.solid || {}) },
          transparent: { ...EMPTY_TRANSPARENT, ...(parsed.transparent || {}) }
        });
        return;
      } catch { /* fall through to empty */ }
    }
    setNavStyles({ solid: { ...EMPTY_SOLID }, transparent: { ...EMPTY_TRANSPARENT } });
  }, [props.globalStyle]);

  const handleSave = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      props.updatedFunction?.(JSON.stringify(navStyles));
      setIsSubmitting(false);
    }, 500);
  };

  const setSolid = (field: keyof NavSolidInterface, value: string | null) => {
    setNavStyles({ ...navStyles!, solid: { ...navStyles!.solid, [field]: value } });
  };

  const setTransparent = (field: keyof NavTransparentInterface, value: string | null) => {
    setNavStyles({ ...navStyles!, transparent: { ...navStyles!.transparent, [field]: value } });
  };

  if (!navStyles) return null;

  const colorField = (
    value: string | null,
    initial: string,
    label: string,
    testId: string,
    onChange: (val: string | null) => void
  ) => {
    const enabled = value !== null;
    return (
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <FormControlLabel
          control={<Switch checked={enabled} onChange={(e) => onChange(e.target.checked ? initial : null)} data-testid={`${testId}-toggle`} />}
          label={Locale.label("site.navStyleEdit.override")}
        />
        <TextField
          type="color"
          label={label}
          fullWidth
          value={enabled ? value : initial}
          disabled={!enabled}
          onChange={(e) => onChange(e.target.value)}
          data-testid={`${testId}-input`}
          sx={{ "& .MuiInputBase-input": { height: 48 } }}
          helperText={enabled ? null : Locale.label("site.navStyleEdit.unset")}
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
            <Button variant="outlined" onClick={() => props.updatedFunction?.(null)} sx={{ color: "#FFF", borderColor: "rgba(255,255,255,0.5)", "&:hover": { borderColor: "#FFF", backgroundColor: "rgba(255,255,255,0.1)" } }}>{Locale.label("common.cancel")}</Button>
            <LoadingButton loading={isSubmitting} loadingText={Locale.label("common.saving")} variant="contained" onClick={handleSave} sx={{ backgroundColor: "#FFF", color: "primary.light", "&:hover": { backgroundColor: "rgba(255,255,255,0.9)" } }} data-testid="save-nav-button">{Locale.label("site.navStyleEdit.saveNav")}</LoadingButton>
          </Stack>
        </Stack>
      </Box>

      <Box sx={{ p: 3, backgroundColor: "#FFF", borderRadius: "0 0 12px 12px", border: "1px solid", borderColor: "grey.200", borderTop: "none" }}>
        <CardWithHeader title={Locale.label("site.navStyleEdit.solidSection")} icon={<MenuIcon />}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{Locale.label("site.navStyleEdit.solidSectionDesc")}</Typography>
          <Grid container spacing={2}>
            {colorField(navStyles.solid.backgroundColor, PICKER_INITIAL.backgroundColor, Locale.label("site.navStyleEdit.backgroundColor"), "nav-solid-bg", (v) => setSolid("backgroundColor", v))}
            {colorField(navStyles.solid.linkColor, PICKER_INITIAL.linkColor, Locale.label("site.navStyleEdit.linkColor"), "nav-solid-link", (v) => setSolid("linkColor", v))}
            {colorField(navStyles.solid.linkHoverColor, PICKER_INITIAL.linkHoverColor, Locale.label("site.navStyleEdit.linkHoverColor"), "nav-solid-hover", (v) => setSolid("linkHoverColor", v))}
            {colorField(navStyles.solid.activeColor, PICKER_INITIAL.activeColor, Locale.label("site.navStyleEdit.activeColor"), "nav-solid-active", (v) => setSolid("activeColor", v))}
          </Grid>
        </CardWithHeader>

        <Box sx={{ mt: 3 }}>
          <CardWithHeader title={Locale.label("site.navStyleEdit.transparentSection")} icon={<MenuIcon />}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{Locale.label("site.navStyleEdit.transparentSectionDesc")}</Typography>
            <Grid container spacing={2}>
              {colorField(navStyles.transparent.linkColor, PICKER_INITIAL.linkColor, Locale.label("site.navStyleEdit.linkColor"), "nav-transparent-link", (v) => setTransparent("linkColor", v))}
              {colorField(navStyles.transparent.linkHoverColor, PICKER_INITIAL.linkHoverColor, Locale.label("site.navStyleEdit.linkHoverColor"), "nav-transparent-hover", (v) => setTransparent("linkHoverColor", v))}
              {colorField(navStyles.transparent.activeColor, PICKER_INITIAL.activeColor, Locale.label("site.navStyleEdit.activeColor"), "nav-transparent-active", (v) => setTransparent("activeColor", v))}
            </Grid>
          </CardWithHeader>
        </Box>
      </Box>
    </Box>
  );
}
