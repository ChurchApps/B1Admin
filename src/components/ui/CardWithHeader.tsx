import React, { type ReactNode } from "react";
import { Card, Box, Stack, Typography } from "@mui/material";
import { CountChip } from "./CountChip";

interface CardWithHeaderProps {
  title: string;
  icon?: ReactNode;
  actions?: ReactNode;
  count?: number;
  children: ReactNode;
}

export const CardWithHeader: React.FC<CardWithHeaderProps> = ({ title, icon, actions, count, children }) => (
  <Card>
    <Box className="om-head" sx={{ px: { xs: 2, md: 3 }, pt: { xs: 2, md: 3 }, pb: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
          {icon && <Box className="om-icon" sx={{ display: "flex", color: "text.secondary", "& .MuiSvgIcon-root, & .material-icons": { fontSize: 20 } }}>{icon}</Box>}
          <Typography className="om-title" variant="h3" component="h2">{title}</Typography>
          {count !== undefined && count > 0 && <CountChip count={count} />}
        </Stack>
        {actions}
      </Stack>
    </Box>
    <Box className="om-body" sx={{ px: { xs: 2, md: 3 }, pb: { xs: 2, md: 3 } }}>{children}</Box>
  </Card>
);
