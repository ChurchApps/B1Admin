import React from "react";
import { Box, Button, Typography } from "@mui/material";
import { Locale } from "@churchapps/apphelper";
import { b1Layout } from "../../helpers/Themes";

export const labelSx = { fontSize: "0.75rem", lineHeight: "18px", fontWeight: 650, letterSpacing: "0.07em", textTransform: "uppercase", color: "text.secondary" } as const;
export const eyebrowSx = { fontSize: "1.125rem", lineHeight: "25px", fontWeight: 600, color: "text.primary" } as const;
export const titleSx = { fontSize: { xs: "1.625rem", md: "1.875rem" }, lineHeight: { xs: "32px", md: "36px" }, fontWeight: 650, letterSpacing: "-0.02em", color: "text.primary" } as const;
export const sidebarTitleSx = { fontSize: "1.375rem", lineHeight: "29px", fontWeight: 650, color: "text.primary" } as const;
export const verbSx = { fontWeight: 600, textTransform: "none", minWidth: 0, minHeight: 0, px: 0.5, "&:hover": { bgcolor: "transparent", textDecoration: "underline" } } as const;
export const srOnlySx = { position: "absolute", width: "1px", height: "1px", p: 0, m: "-1px", overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0 } as const;

export const SettingsPage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box sx={{ bgcolor: "background.default", minHeight: `calc(100vh - ${b1Layout.headerHeight}px)`, "& .om-section > .MuiPaper-root": { mb: 0 } }}>{children}</Box>
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

// Recipe A shell: pale-blue local navigation (title, intro, grouped links) beside the content-sized work area.
export const SettingsLayout: React.FC<LayoutProps> = ({ eyebrow, title, subtitle, verbs, nav, children }) => (
  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", md: `${b1Layout.sidebarWidthMedium}px minmax(0,1fr)`, lg: `${b1Layout.sidebarWidth}px minmax(0,1fr)` }, minHeight: `calc(100vh - ${b1Layout.headerHeight}px)` }}>
    <Box component="aside" sx={{ bgcolor: "var(--b1-sidebar)", px: 2, py: { xs: 2, md: 3.5 }, minWidth: 0 }}>
      <Box sx={{ position: { md: "sticky" }, top: { md: 16 } }}>
        <Box sx={{ px: 1.5, pb: 3 }}>
          {eyebrow && <Typography sx={{ ...labelSx, mb: 1 }}>{eyebrow}</Typography>}
          <Typography id="page-header-title" component="h1" sx={{ ...sidebarTitleSx, overflowWrap: "anywhere" }}>{title}</Typography>
          {subtitle && <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>{subtitle}</Typography>}
          {verbs && <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mt: 1.5 }}>{verbs}</Box>}
        </Box>
        {nav}
      </Box>
    </Box>
    <Box sx={{ minWidth: 0, width: "100%", maxWidth: b1Layout.contentMax, mx: "auto", p: { xs: 2, md: 3, lg: 4 } }}>
      {children}
    </Box>
  </Box>
);
