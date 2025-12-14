import { useState, useEffect } from "react";
import {
  Grid, TextField, Box, Typography, Stack, Button, alpha
} from "@mui/material";
import { SpaceBar as SpaceBarIcon, Visibility as VisibilityIcon } from "@mui/icons-material";
import { Locale } from "@churchapps/apphelper";
import type { GlobalStyleInterface } from "../../helpers/Interfaces";
import { CardWithHeader, LoadingButton } from "../../components/ui";

interface Props {
  globalStyle?: GlobalStyleInterface;
  updatedFunction?: (spacingJson: string) => void;
}

export interface SpacingInterface {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

export function SpacingScaleEdit(props: Props) {
  const [spacing, setSpacing] = useState<SpacingInterface>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (props.globalStyle?.spacing) {
      setSpacing(JSON.parse(props.globalStyle.spacing));
    } else {
      // Set default values
      setSpacing({
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 48
      });
    }
  }, [props.globalStyle]);

  const handleSave = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      props.updatedFunction(JSON.stringify(spacing));
      setIsSubmitting(false);
    }, 500);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    const s = { ...spacing };
    switch (e.target.name) {
      case "xs": s.xs = val; break;
      case "sm": s.sm = val; break;
      case "md": s.md = val; break;
      case "lg": s.lg = val; break;
      case "xl": s.xl = val; break;
      case "xxl": s.xxl = val; break;
    }
    setSpacing(s);
  };

  const spacingItems = [
    { key: "xs", label: "Extra Small", description: "Tight spacing for compact layouts" },
    { key: "sm", label: "Small", description: "Small gaps between related elements" },
    { key: "md", label: "Medium", description: "Standard spacing for most layouts" },
    { key: "lg", label: "Large", description: "Spacious layouts and sections" },
    { key: "xl", label: "Extra Large", description: "Large gaps between major sections" },
    { key: "xxl", label: "2X Large", description: "Maximum spacing for dramatic layouts" }
  ];

  if (!spacing) return null;

  return (
    <Box sx={{ maxWidth: 1200 }}>
      <Box sx={{ backgroundColor: "var(--c1l2)", color: "#FFF", p: 3, borderRadius: "12px 12px 0 0", mb: 0 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={2} alignItems="center">
            <Box sx={{
              backgroundColor: "rgba(255,255,255,0.2)", borderRadius: "8px", p: 1, display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <SpaceBarIcon sx={{ fontSize: 24, color: "#FFF" }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>Spacing Scale</Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.9)" }}>Configure consistent spacing values</Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => props.updatedFunction(null)} sx={{ color: "#FFF", borderColor: "rgba(255,255,255,0.5)", "&:hover": { borderColor: "#FFF", backgroundColor: "rgba(255,255,255,0.1)" } }}>{Locale.label("common.cancel")}</Button>
            <LoadingButton loading={isSubmitting} loadingText={Locale.label("common.saving")} variant="contained" onClick={handleSave} sx={{ backgroundColor: "#FFF", color: "var(--c1l2)", "&:hover": { backgroundColor: "rgba(255,255,255,0.9)" } }} data-testid="save-spacing-button">Save Spacing</LoadingButton>
          </Stack>
        </Stack>
      </Box>

      <Box sx={{
        p: 3, backgroundColor: "#FFF", borderRadius: "0 0 12px 12px", border: "1px solid", borderColor: "grey.200", borderTop: "none"
      }}>
        <CardWithHeader title="Spacing Values" icon={<SpaceBarIcon />}>
          <Grid container spacing={3}>
            {spacingItems.map((item) => (
              <Grid size={{ xs: 12, md: 6 }} key={item.key}>
                <TextField
                  type="number"
                  label={item.label}
                  fullWidth
                  name={item.key}
                  value={spacing[item.key as keyof SpacingInterface]}
                  onChange={handleChange}
                  inputProps={{ min: 0, max: 200, step: 4 }}
                  data-testid={`spacing-${item.key}-input`}
                  InputProps={{
                    endAdornment: <Typography variant="body2" color="text.secondary">px</Typography>
                  }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                  {item.description}
                </Typography>
              </Grid>
            ))}
          </Grid>
        </CardWithHeader>

        <Box sx={{ mt: 3 }}>
          <CardWithHeader title="Practical Examples" icon={<VisibilityIcon />}>
            <Box sx={{ p: 3, backgroundColor: alpha("#f5f5f5", 0.3), borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                See how your spacing values affect real UI elements
              </Typography>

              {/* Icon Row - uses xs */}
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Icon Row</Typography>
              <Box sx={{
                border: "1px solid #ddd",
                borderRadius: 2,
                p: `${spacing.sm}px`,
                mb: 4,
                backgroundColor: "#fff",
                display: "flex",
                gap: `${spacing.xs}px`
              }}>
                {["A", "B", "C", "D", "E"].map((letter) => (
                  <Box key={letter} sx={{ width: 32, height: 32, backgroundColor: "grey.200", borderRadius: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.875rem", fontWeight: 600 }}>{letter}</Box>
                ))}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: -3, mb: 4, display: "block" }}>
                Icons use <strong>xs ({spacing.xs}px)</strong> gap between them
              </Typography>

              {/* Card Example - uses sm, md */}
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Card with Content</Typography>
              <Box sx={{
                border: "1px solid #ddd",
                borderRadius: 2,
                p: `${spacing.md}px`,
                mb: 4,
                backgroundColor: "#fff"
              }}>
                <Typography variant="h6" sx={{ mb: `${spacing.sm}px` }}>Card Title</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: `${spacing.md}px` }}>
                  This card uses <strong>md ({spacing.md}px)</strong> padding and <strong>sm ({spacing.sm}px)</strong> gap between title and text.
                </Typography>
                <Stack direction="row" spacing={`${spacing.sm}px`}>
                  <Box sx={{ px: 2, py: 1, backgroundColor: "primary.main", color: "#fff", borderRadius: 1, fontSize: "0.875rem" }}>Button 1</Box>
                  <Box sx={{ px: 2, py: 1, backgroundColor: "grey.300", borderRadius: 1, fontSize: "0.875rem" }}>Button 2</Box>
                </Stack>
              </Box>

              {/* Section Example - uses lg, xl */}
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Page Section</Typography>
              <Box sx={{
                border: "1px solid #ddd",
                borderRadius: 2,
                overflow: "hidden",
                mb: 4
              }}>
                <Box sx={{ backgroundColor: "#1976d2", color: "#fff", py: `${spacing.xl}px`, px: `${spacing.lg}px`, textAlign: "center" }}>
                  <Typography variant="h5" sx={{ mb: `${spacing.sm}px` }}>Hero Section</Typography>
                  <Typography variant="body2">
                    Uses <strong>xl ({spacing.xl}px)</strong> vertical and <strong>lg ({spacing.lg}px)</strong> horizontal padding
                  </Typography>
                </Box>
              </Box>

              {/* Full Page Section - uses xxl */}
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Full-Width Banner</Typography>
              <Box sx={{
                border: "1px solid #ddd",
                borderRadius: 2,
                overflow: "hidden",
                mb: 4
              }}>
                <Box sx={{ backgroundColor: "#424242", color: "#fff", py: `${spacing.xxl}px`, px: `${spacing.lg}px`, textAlign: "center" }}>
                  <Typography variant="h4" sx={{ mb: `${spacing.md}px` }}>Dramatic Section</Typography>
                  <Typography variant="body1">
                    Uses <strong>xxl ({spacing.xxl}px)</strong> vertical padding for maximum impact
                  </Typography>
                </Box>
              </Box>
            </Box>
          </CardWithHeader>
        </Box>
      </Box>
    </Box>
  );
}
