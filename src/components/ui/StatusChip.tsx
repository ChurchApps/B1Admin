import React from "react";
import { Chip, alpha } from "@mui/material";
import type { ChipProps, Theme } from "@mui/material";

interface StatusChipProps {
  status: string;
  variant?: "standard" | "header";
  size?: "small" | "medium";
}

type StatusKind = "success" | "warning" | "info" | "default";

const STATUS_KIND: Record<string, StatusKind> = {
  member: "success",
  active: "success",
  visitor: "warning",
  pending: "warning",
  staff: "info"
};

const headerSx = {
  backgroundColor: "rgba(255,255,255,0.2)",
  color: "#fff"
};

const tintedSx = (kind: Exclude<StatusKind, "default">) => (theme: Theme) => ({
  backgroundColor: alpha(theme.palette[kind].main, 0.12),
  color: theme.palette[kind].dark,
  fontWeight: 600
});

export const StatusChip: React.FC<StatusChipProps> = ({ status, variant = "standard", size = "small" }) => {
  if (variant === "header") {
    return <Chip label={status} size={size} variant="filled" sx={headerSx} />;
  }

  const kind: StatusKind = STATUS_KIND[status.toLowerCase()] || "default";

  const chipProps: Partial<ChipProps> =
    kind === "default"
      ? { variant: "outlined", sx: { color: "text.secondary", borderColor: "divider", fontSize: "0.75rem" } }
      : { variant: "filled", sx: tintedSx(kind) };

  return <Chip label={status} size={size} {...chipProps} />;
};
