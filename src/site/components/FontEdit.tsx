import { useState, useEffect } from "react";
import { Button, Grid, Box, Typography, Stack } from "@mui/material";
import { TextFields as TextFieldsIcon, Visibility as VisibilityIcon, FormatSize as FormatSizeIcon, Style as StyleIcon } from "@mui/icons-material";
import { Locale } from "@churchapps/apphelper";
import type { GlobalStyleInterface } from "../../helpers/Interfaces";
import { CardWithHeader, LoadingButton } from "../../components/ui";
import { CustomFontModal } from "./CustomFontModal";
import { StyleEditHeader } from "./StyleEditHeader";

interface Props {
  globalStyle?: GlobalStyleInterface | null;
  updatedFunction?: (fontsJson: string | null) => void;
}

export interface FontsInterface {
  body: string;
  heading: string;
}

export function FontEdit(props: Props) {
  const [fonts, setFonts] = useState<FontsInterface | null>(null);
  const [showFont, setShowFont] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fontList = [
    "Open Sans", "Montserrat", "Oswald", "Roboto", "Poppins", "Playfair Display", "Lato", "Raleway", "Inter"
  ];

  useEffect(() => {
    if (props.globalStyle) {
      const parsed = props.globalStyle.fonts ? JSON.parse(props.globalStyle.fonts) : { heading: "Roboto", body: "Roboto" };
      setFonts(parsed);
    }
  }, [props.globalStyle]);

  const handleSave = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      props.updatedFunction?.(JSON.stringify(fonts));
      setIsSubmitting(false);
    }, 500);
  };

  const updateFont = (font: string) => {
    const f = { ...fonts! };
    if (showFont === "body") f.body = font;
    else f.heading = font;
    setFonts(f);
  };

  const getPairings = () => (
    <Grid container spacing={2}>
      {fontList.map(heading => (
        <Grid size={{ xs: 12, md: 6 }} key={heading}>
          <Box sx={{ border: 1, borderColor: "divider", borderRadius: "var(--b1-radius-panel)", overflow: "hidden" }}>
            <Box sx={{ p: 2, backgroundColor: "var(--b1-canvas)", borderBottom: "1px solid", borderColor: "divider" }}>
              <Typography variant="h3" component="p" sx={{ fontFamily: heading }}>{heading}</Typography>
            </Box>
            <Box sx={{ p: 1.5 }}>
              <Stack spacing={1}>
                {fontList.map(body => (
                  <Box key={`${heading}-${body}`} onClick={() => setFonts({ body, heading })} sx={{ p: 1.5, borderRadius: "var(--b1-radius-control)", cursor: "pointer", border: "1px solid", borderColor: "transparent", transition: "background-color 140ms", "&:hover": { backgroundColor: "action.hover", borderColor: "primary.main" } }}>
                    <Typography variant="body2" sx={{ fontFamily: body, color: "text.primary", fontSize: "0.875rem" }}>{heading} heading with {body} body</Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Box>
        </Grid>
      ))}
    </Grid>
  );

  const getFont = () => {
    if (showFont) return <CustomFontModal onClose={() => { setShowFont(""); }} updateValue={(val) => { setShowFont(""); updateFont(val); }} />;
  };

  if (!fonts) return Locale.label("site.fontEdit.fontsNull");

  return (
    <Box sx={{ maxWidth: 1200 }}>
      {getFont()}

      <StyleEditHeader title={Locale.label("site.fontEdit.headerTitle")} subtitle={Locale.label("site.fontEdit.headerSubtitle")} onCancel={() => props.updatedFunction?.(null)} saveButton={
        <LoadingButton loading={isSubmitting} loadingText={Locale.label("site.fontEdit.saving")} variant="contained" onClick={handleSave} data-testid="save-fonts-button">{Locale.label("site.fontEdit.saveFonts")}</LoadingButton>
      } />

      <Box sx={{ display: "grid", gap: 3 }}>
        <CardWithHeader title={Locale.label("site.fontEdit.fontSelection")} icon={<StyleIcon />}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: "text.primary" }}>{Locale.label("site.fontEdit.headingFont")}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{Locale.label("site.fontEdit.headingFontDesc")}</Typography>
                <Button variant="outlined" onClick={() => setShowFont("heading")} data-testid="heading-font-button" startIcon={<FormatSizeIcon />} sx={{ fontFamily: fonts?.heading || "Roboto", textTransform: "none", justifyContent: "flex-start", minHeight: 48, px: 2 }} fullWidth>{fonts?.heading || "Roboto"}</Button>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: "text.primary" }}>{Locale.label("site.fontEdit.bodyFont")}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{Locale.label("site.fontEdit.bodyFontDesc")}</Typography>
                <Button variant="outlined" onClick={() => setShowFont("body")} data-testid="body-font-button" startIcon={<TextFieldsIcon />} sx={{ fontFamily: fonts?.body || "Roboto", textTransform: "none", justifyContent: "flex-start", minHeight: 48, px: 2 }} fullWidth>{fonts?.body || "Roboto"}</Button>
              </Box>
            </Grid>
          </Grid>
        </CardWithHeader>

        <Box sx={{ mt: 3 }}>
          <CardWithHeader title={Locale.label("site.fontEdit.typographyPreview")} icon={<VisibilityIcon />}>
            <Box sx={{ p: 3, backgroundColor: "var(--b1-canvas)", borderRadius: "var(--b1-radius-panel)" }}>
              <Typography variant="h4" sx={{ fontFamily: fonts?.heading || "Roboto", fontWeight: 600, mb: 2, color: "primary.main" }}>{Locale.label("site.fontEdit.mainHeadingPreview")}</Typography>
              <Typography variant="body1" sx={{ fontFamily: fonts?.body || "Roboto", mb: 3, lineHeight: 1.6, color: "text.primary" }}>{Locale.label("site.fontEdit.previewBody")}</Typography>
              <Typography variant="h6" sx={{ fontFamily: fonts?.heading || "Roboto", fontWeight: 600, mb: 2, color: "text.primary" }}>{Locale.label("site.fontEdit.secondaryHeading")}</Typography>
              <Typography variant="body1" sx={{ fontFamily: fonts?.body || "Roboto", lineHeight: 1.6, color: "text.primary" }}>{Locale.label("site.fontEdit.previewBody2")}</Typography>
            </Box>
          </CardWithHeader>
        </Box>

        <Box sx={{ mt: 3 }}>
          <CardWithHeader title={Locale.label("site.fontEdit.popularFontCombinations")} icon={<StyleIcon />}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{Locale.label("site.fontEdit.applyCombination")}</Typography>
            {getPairings()}
          </CardWithHeader>
        </Box>
      </Box>
    </Box>
  );
}
