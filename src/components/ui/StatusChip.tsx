import React from "react";
import { Chip } from "@mui/material";
import { StatusBadge, type StatusTone } from "./StatusBadge";
import { useHeaderTone } from "./headerTone";

interface StatusChipProps {
  status: string;
  variant?: "standard" | "header";
  size?: "small" | "medium";
}

const STATUS_TONE: Record<string, StatusTone> = {
  member: "success",
  active: "success",
  approved: "success",
  visitor: "warning",
  pending: "warning",
  staff: "info",
  failed: "danger",
  inactive: "neutral"
};

const headerSx = {
  backgroundColor: "rgba(255,255,255,0.2)",
  color: "#FFF",
  fontSize: "0.75rem",
  height: 20
};

export const StatusChip: React.FC<StatusChipProps> = ({ status, variant = "standard", size = "small" }) => {
  const headerTone = useHeaderTone();
  if (variant === "header" && headerTone === "dark") {
    return <Chip label={status} size={size} variant="filled" sx={headerSx} />;
  }
  return <StatusBadge tone={STATUS_TONE[status.toLowerCase()] || "neutral"}>{status}</StatusBadge>;
};
