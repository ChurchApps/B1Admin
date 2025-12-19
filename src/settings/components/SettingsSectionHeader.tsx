import React from "react";
import { Box, Typography, alpha } from "@mui/material";

interface Props {
  icon: React.ReactNode;
  color: "primary" | "secondary" | "success" | "info" | "warning" | "error";
  title: string;
  subtitle: string;
}

export const SettingsSectionHeader: React.FC<Props> = ({ icon, color, title, subtitle }) => {
  const iconBoxStyles = {
    width: 40,
    height: 40,
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    bgcolor: (theme: any) => alpha(theme.palette[color].main, 0.1),
    color: `${color}.main`,
  };

  return (
    <>
      <Box sx={iconBoxStyles}>{icon}</Box>
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      </Box>
    </>
  );
};
