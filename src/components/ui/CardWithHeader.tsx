import React, { ReactNode } from "react";
import { Card, Box, Stack, Typography } from "@mui/material";

interface CardWithHeaderProps {
  title: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  borderColor?: string;
  borderRadius?: number;
}

export const CardWithHeader: React.FC<CardWithHeaderProps> = ({ title, icon, actions, children, borderColor = "grey.200", borderRadius = 2 }) => {
  return (
    <Card
      sx={{
        borderRadius,
        border: "1px solid",
        borderColor
      }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center">
            {icon}
            <Typography variant="h6">{title}</Typography>
          </Stack>
          {actions}
        </Stack>
      </Box>
      <Box sx={{ p: 2 }}>{children}</Box>
    </Card>
  );
};
