import React, { type ReactNode } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { Surface } from "../../components/ui";

interface Props {
  headerText: string;
  subtitle?: ReactNode;
  aside?: ReactNode;
  id?: string;
  children?: ReactNode;
}

export const AdminPanel: React.FC<Props> = ({ headerText, subtitle, aside, id, children }) => (
  <Surface id={id}>
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "flex-start" }} spacing={1} sx={{ mb: 3 }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h1" component="h2">{headerText}</Typography>
        {subtitle && <Typography sx={{ color: "text.secondary", mt: 0.5 }}>{subtitle}</Typography>}
      </Box>
      {aside && <Box sx={{ flexShrink: 0, color: "text.secondary", typography: "body2" }}>{aside}</Box>}
    </Stack>
    {children}
  </Surface>
);
