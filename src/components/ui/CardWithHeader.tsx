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
    <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Stack direction="row" spacing={1} alignItems="center">
          {icon}
          <Typography variant="h6">{title}</Typography>
          {count !== undefined && count > 0 && <CountChip count={count} />}
        </Stack>
        {actions}
      </Stack>
    </Box>
    <Box sx={{ p: 2 }}>{children}</Box>
  </Card>
);
