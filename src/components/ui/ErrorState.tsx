import React from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { Locale } from "@churchapps/apphelper";

interface Props {
  /** e.g. "We couldn't load groups." */
  title: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  /** false when rendered inside an existing panel. */
  bordered?: boolean;
}

export const ErrorState: React.FC<Props> = ({ title, description, onRetry, retryLabel, bordered = true }) => (
  <Box role="alert" sx={{ py: 4, px: 3, textAlign: "center", ...(bordered ? { bgcolor: "background.paper", border: 1, borderColor: "divider", borderRadius: "var(--b1-radius-panel)" } : {}) }}>
    <Stack spacing={1} alignItems="center" sx={{ maxWidth: 480, mx: "auto" }}>
      <Typography variant="h3" component="p">{title}</Typography>
      {description && <Typography variant="body2" color="text.secondary">{description}</Typography>}
      {onRetry && <Box sx={{ pt: 1 }}><Button variant="outlined" onClick={onRetry}>{retryLabel || Locale.label("common.tryAgain")}</Button></Box>}
    </Stack>
  </Box>
);
