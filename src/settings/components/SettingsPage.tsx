import React from "react";
import { Box, Button, Grid, Typography } from "@mui/material";
import { Locale } from "@churchapps/apphelper";
import { ThemeProvider, createTheme, type Theme } from "@mui/material/styles";

export const labelSx = { fontSize: "0.72rem", fontWeight: 650, letterSpacing: "0.07em", textTransform: "uppercase", color: "text.secondary" } as const;
export const eyebrowSx = { fontSize: "0.8rem", fontWeight: 600, letterSpacing: "0.02em", lineHeight: 1.4, color: "var(--c1)" } as const;
export const titleSx = { fontSize: { xs: "2rem", md: "2.4rem" }, fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1.08, color: "text.primary" } as const;
export const verbSx = { fontWeight: 600, textTransform: "none", minWidth: 0, p: 0, "&:hover": { bgcolor: "transparent", textDecoration: "underline" } } as const;

const plateTheme = (outer: Theme) => createTheme(outer, {
  components: {
    MuiTextField: { defaultProps: { variant: "standard" } },
    MuiFormControl: { defaultProps: { variant: "standard" } },
    MuiInputLabel: { styleOverrides: { root: { textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500 } } },
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { fontWeight: 600 } } },
    MuiChip: { defaultProps: { variant: "outlined" } }
  }
});

// Flattens the shared card chrome (DisplayBox ids, om-* classes on FormCard/SectionListCard/CardWithHeader) into the omarchy plate.
const plateSx = {
  bgcolor: "background.paper",
  minHeight: "calc(100vh - 64px)",
  "& .MuiCard-root, & .MuiPaper-root:not(.MuiAlert-root)": { boxShadow: "none", border: 0, borderRadius: 0, bgcolor: "transparent" },
  "& .MuiCard-root": { p: 0 },
  "& .MuiPaper-outlined": { borderBottom: "1px solid", borderColor: "divider" },
  "& .MuiPaper-root:has(> #display-box-header)": { p: 0, mb: { xs: 4, md: 6 } },
  "& .om-section > .MuiPaper-root": { mb: 0 },
  "& .om-head, & #display-box-header": { px: 0, pt: 0, pb: 1, border: 0, minHeight: 32 },
  "& .om-title, & #display-box-title": { ...eyebrowSx, m: 0 },
  "& .om-icon, & #display-box-icon": { display: "none" },
  "& #display-box-content": { mt: 0 },
  "& .om-body": { px: 0 },
  "& .om-foot": { px: 0, border: 0 },
  "& .MuiTableCell-root:first-of-type": { pl: 0 },
  "& .MuiTableCell-root:last-of-type": { pr: 0 }
} as const;

export const SettingsPage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={plateTheme}>
    <Box sx={plateSx}>{children}</Box>
  </ThemeProvider>
);

export const SettingsRow: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "11rem 1fr" }, columnGap: 2, py: 0.75 }}>
    <Typography variant="body2" sx={{ color: "text.secondary" }}>{label}</Typography>
    <Typography variant="body2" component="div" sx={{ color: "text.primary" }}>{value || "—"}</Typography>
  </Box>
);

export const EditVerb: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <Button size="small" onClick={onClick} data-testid="small-button-edit" sx={verbSx}>{Locale.label("common.edit")}</Button>
);

interface LayoutProps {
  eyebrow?: string;
  title: string;
  subtitle?: React.ReactNode;
  verbs?: React.ReactNode;
  nav: React.ReactNode;
  children: React.ReactNode;
}

// The record shape from the mockups: who (identity + index) on the left, the living slice on the right.
export const SettingsLayout: React.FC<LayoutProps> = ({ eyebrow, title, subtitle, verbs, nav, children }) => (
  <Grid container>
    <Grid size={{ xs: 12, md: 4 }} sx={{ borderRight: { md: "1px solid" }, borderColor: { md: "divider" } }}>
      <Box sx={{ px: { xs: 2, md: 4 }, pt: { xs: 3, md: 5 }, pb: { xs: 1, md: 5 }, position: { md: "sticky" }, top: { md: 0 } }}>
        {eyebrow && <Typography sx={{ ...labelSx, mb: 1.5 }}>{eyebrow}</Typography>}
        <Typography id="page-header-title" component="h1" sx={titleSx}>{title}</Typography>
        {subtitle && <Typography sx={{ color: "text.secondary", mt: 1 }}>{subtitle}</Typography>}
        {verbs && <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mt: 2 }}>{verbs}</Box>}
        <Box sx={{ mt: 4 }}>{nav}</Box>
      </Box>
    </Grid>
    <Grid size={{ xs: 12, md: 8 }} sx={{ px: { xs: 2, md: 5 }, pt: { xs: 2, md: 5 }, pb: 8, minWidth: 0 }}>
      {children}
    </Grid>
  </Grid>
);
