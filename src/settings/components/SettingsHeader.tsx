import React from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { Locale } from "@churchapps/apphelper";
import { b1Layout } from "../../helpers/Themes";
import { labelSx, titleSx } from "./SettingsPage";

interface Props {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  backTo?: string;
  backLabel?: string;
  children?: React.ReactNode;
}

export const SettingsHeader: React.FC<Props> = ({ title, subtitle, eyebrow, backTo, backLabel, children }) => (
  <Box sx={{ maxWidth: b1Layout.contentMax, mx: "auto", px: { xs: 2, md: 3, lg: 4 }, pt: { xs: 2, md: 3, lg: 4 }, pb: { xs: 2, md: 3 } }}>
    {backTo ? (
      <Button size="small" component={RouterLink} to={backTo} startIcon={<ArrowBackIcon />} sx={{ mb: 1.5, ml: -1 }}>
        {backLabel || Locale.label("components.wrapper.set")}
      </Button>
    ) : eyebrow && <Typography sx={{ ...labelSx, mb: 1 }}>{eyebrow}</Typography>}
    <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 2, md: 3 }} justifyContent="space-between" alignItems="flex-start">
      <Box sx={{ minWidth: 0 }}>
        <Typography id="page-header-title" component="h1" sx={{ ...titleSx, overflowWrap: "anywhere" }}>{title}</Typography>
        {subtitle && <Typography sx={{ color: "text.secondary", mt: 1 }}>{subtitle}</Typography>}
      </Box>
      {children && <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap" alignItems="center" sx={{ flexShrink: 0 }}>{children}</Stack>}
    </Stack>
  </Box>
);
