import React from "react";
import { Box, Button, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { Locale } from "@churchapps/apphelper";
import { labelSx, titleSx, verbSx } from "./SettingsPage";

interface Props {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  backTo?: string;
  backLabel?: string;
  children?: React.ReactNode;
}

export const SettingsHeader: React.FC<Props> = ({ title, subtitle, eyebrow, backTo, backLabel, children }) => (
  <Box sx={{ px: { xs: 2, md: 4 }, pt: { xs: 3, md: 5 }, pb: 3 }}>
    {backTo ? (
      <Button size="small" component={RouterLink} to={backTo} sx={{ ...verbSx, mb: 1.5 }}>
        ← {backLabel || Locale.label("components.wrapper.set")}
      </Button>
    ) : eyebrow && <Typography sx={{ ...labelSx, mb: 1.5 }}>{eyebrow}</Typography>}
    <Typography id="page-header-title" component="h1" sx={titleSx}>{title}</Typography>
    {subtitle && <Typography sx={{ color: "text.secondary", mt: 1 }}>{subtitle}</Typography>}
    {children && <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center", mt: 2.5 }}>{children}</Box>}
  </Box>
);
