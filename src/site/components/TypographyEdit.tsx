import { useState, useEffect } from "react";
import { Grid, TextField, Box, Typography, Stack } from "@mui/material";
import { Visibility as VisibilityIcon, FormatSize as FormatSizeIcon } from "@mui/icons-material";
import { Locale } from "@churchapps/apphelper";
import type { GlobalStyleInterface } from "../../helpers/Interfaces";
import { CardWithHeader, LoadingButton } from "../../components/ui";
import { StyleEditHeader } from "./StyleEditHeader";

interface Props {
  globalStyle?: GlobalStyleInterface | null;
  updatedFunction?: (typographyJson: string | null) => void;
}

export interface TypographyInterface {
  baseSize: number;
  scale: number;
  lineHeight: number;
}

export function TypographyEdit(props: Props) {
  const [typography, setTypography] = useState<TypographyInterface | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const defaults: TypographyInterface = { baseSize: 16, scale: 1.25, lineHeight: 1.6 };
    if (props.globalStyle?.typography) {
      try {
        const parsed = JSON.parse(props.globalStyle.typography) as Partial<TypographyInterface>;
        setTypography({
          baseSize: typeof parsed.baseSize === "number" ? parsed.baseSize : defaults.baseSize,
          scale: typeof parsed.scale === "number" ? parsed.scale : defaults.scale,
          lineHeight: typeof parsed.lineHeight === "number" ? parsed.lineHeight : defaults.lineHeight
        });
      } catch {
        setTypography(defaults);
      }
    } else {
      // Set default values
      setTypography(defaults);
    }
  }, [props.globalStyle]);

  const handleSave = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      props.updatedFunction?.(JSON.stringify(typography));
      setIsSubmitting(false);
    }, 500);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setTypography({ ...typography, [e.target.name]: val } as TypographyInterface);
  };

  const getFontSizePreview = (level: number) => {
    return Math.round(typography!.baseSize * Math.pow(typography!.scale, level)) + "px";
  };

  if (!typography) return null;

  return (
    <Box sx={{ maxWidth: 1200 }}>
      <StyleEditHeader title={Locale.label("site.typographyEdit.headerTitle")} subtitle={Locale.label("site.typographyEdit.headerSubtitle")} onCancel={() => props.updatedFunction?.(null)} saveButton={
        <LoadingButton loading={isSubmitting} loadingText={Locale.label("common.saving")} variant="contained" onClick={handleSave} data-testid="save-typography-button">{Locale.label("site.typographyEdit.saveTypography")}</LoadingButton>
      } />

      <Box sx={{ display: "grid", gap: 3 }}>
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
            <Box sx={{ p: 3, backgroundColor: "var(--b1-canvas)", borderRadius: "var(--b1-radius-panel)" }}>
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
