import React from "react";
import { Stack, Typography } from "@mui/material";

interface Props {
  title: string;
  action?: React.ReactNode;
}

export const SectionHeading: React.FC<Props> = ({ title, action }) => (
  <Stack
    direction="row"
    alignItems="center"
    justifyContent="space-between"
    spacing={2}
    sx={(theme) => ({ mb: 1.5, pb: 1, borderBottom: `1px solid ${theme.palette.divider}` })}
  >
    <Typography
      variant="overline"
      sx={(theme) => ({
        color: theme.palette.primary.main,
        fontWeight: 700,
        letterSpacing: 1,
        lineHeight: 1.5
      })}
    >
      {title}
    </Typography>
    {action}
  </Stack>
);
