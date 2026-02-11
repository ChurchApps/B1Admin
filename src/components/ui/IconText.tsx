import React, { ReactNode } from "react";
import { Stack, Typography } from "@mui/material";

interface IconTextProps {
  icon: ReactNode;
  children: ReactNode;
  iconSize?: number;
  iconColor?: string;
  spacing?: number;
  variant?: "body1" | "body2" | "caption";
  color?: string;
}

export const IconText: React.FC<IconTextProps> = ({ icon, children, iconSize = 18, iconColor = "var(--c1l2)", spacing = 1, variant = "body2", color }) => {
  return (
    <Stack direction="row" spacing={spacing} alignItems="center">
      {React.cloneElement(icon as React.ReactElement, { sx: { fontSize: iconSize, color: iconColor } })}
      <Typography variant={variant} color={color}>
        {children}
      </Typography>
    </Stack>
  );
};
