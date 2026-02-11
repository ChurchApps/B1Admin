import { useState, useEffect } from "react";
import { Button, Grid, type SelectChangeEvent, Box, Typography, Card, CardContent, Stack, alpha } from "@mui/material";
import { TextFields as TextFieldsIcon, Visibility as VisibilityIcon, FormatSize as FormatSizeIcon, Style as StyleIcon } from "@mui/icons-material";
import { Locale } from "@churchapps/apphelper";
import type { GlobalStyleInterface } from "../../helpers/Interfaces";
import { CardWithHeader, LoadingButton } from "../../components/ui";
import { CustomFontModal } from "./CustomFontModal";

interface Props {
  globalStyle?: GlobalStyleInterface;
  updatedFunction?: (fontsJson: string) => void;
}

export interface FontsInterface {
  body: string;
  heading: string;
}

export function FontEdit(props: Props) {
  const [fonts, setFonts] = useState<FontsInterface>(null);
  const [showFont, setShowFont] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fontList = [
    "Open Sans", "Montserrat", "Oswald", "Roboto", "Poppins", "Playfair Display", "Lato", "Raleway", "Inter"
  ];

  useEffect(() => {
    if (props.globalStyle) setFonts(JSON.parse(props.globalStyle.fonts));
  }, [props.globalStyle]);

  const handleSave = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      props.updatedFunction(JSON.stringify(fonts));
      setIsSubmitting(false);
    }, 500);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement> | SelectChangeEvent<string>) => {
    const val = e.target.value;
    const f = { ...fonts };
    switch (e.target.name) {
      case "body": f.body = val; break;
      case "heading": f.heading = val; break;
    }
    setFonts(f);
  };

  const updateFont = (font: string) => {
    const f = { ...fonts };
    if (showFont === "body") f.body = font;
    else f.heading = font;
    setFonts(f);
  };

  const getPairings = () => (
    <Grid container spacing={2}>
      {fontList.map(heading => (
        <Grid size={{ xs: 12, md: 6 }} key={heading}>
          <Card sx={{ border: "1px solid", borderColor: "grey.200", borderRadius: 2, overflow: "hidden" }}>
            <Box sx={{ p: 2, backgroundColor: alpha("#1976d2", 0.04), borderBottom: "1px solid", borderColor: "divider" }}>
              <Typography variant="h6" sx={{ fontFamily: heading, fontWeight: 600, color: "primary.main", fontSize: "1.125rem" }}>{heading}</Typography>
            </Box>
            <CardContent sx={{ p: 1.5 }}>
              <Stack spacing={1}>
                {fontList.map(body => (
                  <Box key={`${heading}-${body}`} onClick={() => setFonts({ body, heading })} sx={{ p: 1.5, borderRadius: 1, cursor: "pointer", border: "1px solid", borderColor: "transparent", transition: "all 0.2s ease-in-out", "&:hover": { backgroundColor: "action.hover", borderColor: "primary.main", transform: "translateY(-1px)" } }}>
                    <Typography variant="body2" sx={{ fontFamily: body, color: "text.primary", fontSize: "0.875rem" }}>{heading} heading with {body} body</Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  const getFont = () => {
    if (showFont) return <CustomFontModal onClose={() => { setShowFont(""); }} updateValue={(val) => { setShowFont(""); updateFont(val); }} />;
  };

  if (!fonts) return "Fonts null";

  return (
    <Box sx={{ maxWidth: 1200 }}>
      {getFont()}

      <Box sx={{ backgroundColor: "var(--c1l2)", color: "#FFF", p: 3, borderRadius: "12px 12px 0 0", mb: 0 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={2} alignItems="center">
            <Box sx={{ backgroundColor: "rgba(255,255,255,0.2)", borderRadius: "8px", p: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <TextFieldsIcon sx={{ fontSize: 24, color: "#FFF" }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>Typography Settings</Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.9)" }}>Select and customize your site's fonts</Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => props.updatedFunction(null)} sx={{ color: "#FFF", borderColor: "rgba(255,255,255,0.5)", "&:hover": { borderColor: "#FFF", backgroundColor: "rgba(255,255,255,0.1)" } }}>{Locale.label("common.cancel")}</Button>
            <LoadingButton loading={isSubmitting} loadingText="Saving..." variant="contained" onClick={handleSave} sx={{ backgroundColor: "#FFF", color: "var(--c1l2)", "&:hover": { backgroundColor: "rgba(255,255,255,0.9)" } }} data-testid="save-fonts-button">Save Fonts</LoadingButton>
          </Stack>
        </Stack>
      </Box>

      <Box sx={{ p: 3, backgroundColor: "#FFF", borderRadius: "0 0 12px 12px", border: "1px solid", borderColor: "grey.200", borderTop: "none" }}>
        <CardWithHeader title={Locale.label("site.fontEdit.fontSelection")} icon={<StyleIcon />}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: "text.primary" }}>Heading Font</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Used for titles, headings, and emphasis text</Typography>
                <Button variant="outlined" onClick={() => setShowFont("heading")} data-testid="heading-font-button" startIcon={<FormatSizeIcon />} sx={{ fontFamily: fonts?.heading || "Roboto", textTransform: "none", justifyContent: "flex-start", minHeight: 48, px: 2 }} fullWidth>{fonts?.heading || "Roboto"}</Button>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: "text.primary" }}>Body Font</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Used for paragraphs, descriptions, and body text</Typography>
                <Button variant="outlined" onClick={() => setShowFont("body")} data-testid="body-font-button" startIcon={<TextFieldsIcon />} sx={{ fontFamily: fonts?.body || "Roboto", textTransform: "none", justifyContent: "flex-start", minHeight: 48, px: 2 }} fullWidth>{fonts?.body || "Roboto"}</Button>
              </Box>
            </Grid>
          </Grid>
        </CardWithHeader>

        <Box sx={{ mt: 3 }}>
          <CardWithHeader title={Locale.label("site.fontEdit.typographyPreview")} icon={<VisibilityIcon />}>
            <Box sx={{ p: 3, backgroundColor: alpha("#f5f5f5", 0.3), borderRadius: 2 }}>
              <Typography variant="h4" sx={{ fontFamily: fonts?.heading || "Roboto", fontWeight: 600, mb: 2, color: "primary.main" }}>Main Heading Preview</Typography>
              <Typography variant="body1" sx={{ fontFamily: fonts?.body || "Roboto", mb: 3, lineHeight: 1.6, color: "text.primary" }}>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Rhoncus urna neque viverra justo nec ultrices dui sapien. Faucibus pulvinar elementum integer enim neque volutpat ac tincidunt.</Typography>
              <Typography variant="h6" sx={{ fontFamily: fonts?.heading || "Roboto", fontWeight: 600, mb: 2, color: "text.primary" }}>Secondary Heading</Typography>
              <Typography variant="body1" sx={{ fontFamily: fonts?.body || "Roboto", lineHeight: 1.6, color: "text.primary" }}>Faucibus purus in massa tempor. Venenatis lectus magna fringilla urna porttitor rhoncus dolor purus non. Accumsan tortor posuere ac ut. Sit amet facilisis magna etiam.</Typography>
            </Box>
          </CardWithHeader>
        </Box>

        <Box sx={{ mt: 3 }}>
          <CardWithHeader title={Locale.label("site.fontEdit.popularFontCombinations")} icon={<StyleIcon />}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Click any combination to apply it instantly</Typography>
            {getPairings()}
          </CardWithHeader>
        </Box>
      </Box>
    </Box>
  );
}
