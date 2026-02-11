import React from "react";
import { Chip } from "@mui/material";

interface StatusChipProps {
  status: string;
  variant?: "standard" | "header";
  size?: "small" | "medium";
}

const getStatusColors = (status: string, variant: "standard" | "header") => {
  const normalizedStatus = status.toLowerCase();

  if (variant === "header") {
    return {
      backgroundColor: "rgba(255,255,255,0.2)",
      color: "#FFF",
      fontSize: "0.75rem",
      height: 20
    };
  }

  // Standard status colors
  switch (normalizedStatus) {
    case "member":
    case "active":
      return {
        backgroundColor: "#e8f5e9",
        color: "#2e7d32",
        fontWeight: 600
      };
    case "visitor":
    case "pending":
      return {
        backgroundColor: "#fff3e0",
        color: "#f57c00",
        fontWeight: 600
      };
    case "staff":
      return {
        backgroundColor: "#e3f2fd",
        color: "#1565c0",
        fontWeight: 600
      };
    default:
      return {
        color: "text.secondary",
        borderColor: "grey.400",
        fontSize: "0.75rem"
      };
  }
};

export const StatusChip: React.FC<StatusChipProps> = ({ status, variant = "standard", size = "small" }) => {
  const colors = getStatusColors(status, variant);
  const isOutlined = variant === "standard" && !["member", "active", "visitor", "pending", "staff"].includes(status.toLowerCase());

  return <Chip label={status} size={size} variant={isOutlined ? "outlined" : "filled"} sx={colors} />;
};
