import React from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { Locale } from "@churchapps/apphelper";

interface Props {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onCancel: () => void;
  saveButton: React.ReactNode;
}

export const StyleEditHeader: React.FC<Props> = ({ title, subtitle, onCancel, saveButton }) => (
  <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} sx={{ mb: 3 }}>
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="h2" component="h2">{title}</Typography>
      {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
    </Box>
    <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
      <Button variant="outlined" onClick={onCancel}>{Locale.label("common.cancel")}</Button>
      {saveButton}
    </Stack>
  </Stack>
);
