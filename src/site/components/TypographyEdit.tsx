import { useState, useEffect } from "react";
import { Grid, TextField, Box, Typography, Stack, Button, alpha } from "@mui/material";
import { TextFields as TextFieldsIcon, Visibility as VisibilityIcon, FormatSize as FormatSizeIcon } from "@mui/icons-material";
import { Locale } from "@churchapps/apphelper";
import type { GlobalStyleInterface } from "../../helpers/Interfaces";
import { CardWithHeader, LoadingButton } from "../../components/ui";

interface Props {
  globalStyle?: GlobalStyleInterface;
  updatedFunction?: (typographyJson: string) => void;
}

export interface TypographyInterface {
  baseSize: number;
  scale: number;
  lineHeight: number;
}

export function TypographyEdit(props: Props) {
  const [typography, setTypography] = useState<TypographyInterface>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (props.globalStyle?.typography) {
      setTypography(JSON.parse(props.globalStyle.typography));
    } else {
      // Set default values
      setTypography({ baseSize: 16, scale: 1.25, lineHeight: 1.6 });
    }
  }, [props.globalStyle]);

  const handleSave = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      props.updatedFunction(JSON.stringify(typography));
      setIsSubmitting(false);
    }, 500);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const t = { ...typography };
    switch (e.target.name) {
      case "baseSize": t.baseSize = val; break;
      case "scale": t.scale = val; break;
      case "lineHeight": t.lineHeight = val; break;
    }
    setTypography(t);
  };

  const getFontSizePreview = (level: number) => {
    return Math.round(typography.baseSize * Math.pow(typography.scale, level)) + "px";
  };

  if (!typography) return null;

  return (
    <Box sx={{ maxWidth: 1200 }}>
      <Box sx={{ backgroundColor: "primary.light", color: "#FFF", p: 3, borderRadius: "12px 12px 0 0", mb: 0 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={2} alignItems="center">
            <Box sx={{ backgroundColor: "rgba(255,255,255,0.2)", borderRadius: "8px", p: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <TextFieldsIcon sx={{ fontSize: 24, color: "#FFF" }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>{Locale.label("site.typographyEdit.headerTitle")}</Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.9)" }}>{Locale.label("site.typographyEdit.headerSubtitle")}</Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => props.updatedFunction(null)} sx={{ color: "#FFF", borderColor: "rgba(255,255,255,0.5)", "&:hover": { borderColor: "#FFF", backgroundColor: "rgba(255,255,255,0.1)" } }}>{Locale.label("common.cancel")}</Button>
            <LoadingButton loading={isSubmitting} loadingText={Locale.label("common.saving")} variant="contained" onClick={handleSave} sx={{ backgroundColor: "#FFF", color: "primary.light", "&:hover": { backgroundColor: "rgba(255,255,255,0.9)" } }} data-testid="save-typography-button">{Locale.label("site.typographyEdit.saveTypography")}</LoadingButton>
          </Stack>
        </Stack>
      </Box>

      <Box sx={{ p: 3, backgroundColor: "#FFF", borderRadius: "0 0 12px 12px", border: "1px solid", borderColor: "grey.200", borderTop: "none" }}>
        <CardWithHeader title={Locale.label("site.typographyEdit.typographyScale")} icon={<FormatSizeIcon />}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                type="number"
                label={Locale.label("site.typographyEdit.baseSize")}
                fullWidth
                name="baseSize"
                value={typography.baseSize}
                onChange={handleNumberChange}
                inputProps={{ min: 12, max: 24, step: 1 }}
                data-testid="base-size-input"
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                {Locale.label("site.typographyEdit.baseSizeDesc")}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                type="number"
                label={Locale.label("site.typographyEdit.scale")}
                fullWidth
                name="scale"
                value={typography.scale}
                onChange={handleNumberChange}
                inputProps={{ min: 1.1, max: 2, step: 0.05 }}
                data-testid="scale-input"
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                {Locale.label("site.typographyEdit.scaleDesc")}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                type="number"
                label={Locale.label("site.typographyEdit.lineHeight")}
                fullWidth
                name="lineHeight"
                value={typography.lineHeight}
                onChange={handleNumberChange}
                inputProps={{ min: 1, max: 2.5, step: 0.1 }}
                data-testid="line-height-input"
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                {Locale.label("site.typographyEdit.lineHeightDesc")}
              </Typography>
            </Grid>
          </Grid>
        </CardWithHeader>

        <Box sx={{ mt: 3 }}>
          <CardWithHeader title={Locale.label("site.typographyEdit.preview")} icon={<VisibilityIcon />}>
            <Box sx={{ p: 3, backgroundColor: alpha("#f5f5f5", 0.3), borderRadius: 2 }}>
              <Stack spacing={2}>
                <Box>
                  <Typography
                    sx={{
                      fontSize: getFontSizePreview(4),
                      fontWeight: 600,
                      lineHeight: typography.lineHeight,
                      color: "text.primary"
                    }}
                  >
                    {Locale.label("site.typographyEdit.headingPreview").replace("{level}", "1").replace("{size}", getFontSizePreview(4))}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    sx={{
                      fontSize: getFontSizePreview(3),
                      fontWeight: 600,
                      lineHeight: typography.lineHeight,
                      color: "text.primary"
                    }}
                  >
                    {Locale.label("site.typographyEdit.headingPreview").replace("{level}", "2").replace("{size}", getFontSizePreview(3))}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    sx={{
                      fontSize: getFontSizePreview(2),
                      fontWeight: 600,
                      lineHeight: typography.lineHeight,
                      color: "text.primary"
                    }}
                  >
                    {Locale.label("site.typographyEdit.headingPreview").replace("{level}", "3").replace("{size}", getFontSizePreview(2))}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    sx={{
                      fontSize: getFontSizePreview(1),
                      fontWeight: 600,
                      lineHeight: typography.lineHeight,
                      color: "text.primary"
                    }}
                  >
                    {Locale.label("site.typographyEdit.headingPreview").replace("{level}", "4").replace("{size}", getFontSizePreview(1))}
                  </Typography>
                </Box>
                <Box sx={{ pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
                  <Typography
                    sx={{
                      fontSize: typography.baseSize + "px",
                      lineHeight: typography.lineHeight,
                      color: "text.primary"
                    }}
                  >
                    {Locale.label("site.typographyEdit.bodyText").replace("{size}", typography.baseSize.toString())}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    sx={{
                      fontSize: getFontSizePreview(-1),
                      lineHeight: typography.lineHeight,
                      color: "text.secondary"
                    }}
                  >
                    {Locale.label("site.typographyEdit.smallText").replace("{size}", getFontSizePreview(-1))}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </CardWithHeader>
        </Box>
      </Box>
    </Box>
  );
}
