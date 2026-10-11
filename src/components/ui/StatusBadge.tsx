import React, { type ReactNode } from "react";
import { Box } from "@mui/material";

export type StatusTone = "neutral" | "success" | "warning" | "danger" | "info";

const toneVars: Record<StatusTone, { fg: string; bg: string }> = {
  neutral: { fg: "var(--b1-neutral)", bg: "var(--b1-neutral-bg)" },
  success: { fg: "var(--b1-success)", bg: "var(--b1-success-bg)" },
  warning: { fg: "var(--b1-warning)", bg: "var(--b1-warning-bg)" },
  danger: { fg: "var(--b1-danger)", bg: "var(--b1-danger-bg)" },
  info: { fg: "var(--b1-on-selected)", bg: "var(--b1-selected)" }
};

interface Props {
  children: ReactNode;
  tone?: StatusTone;
  /** "badge" = tinted pill; "dot" = colored dot + text, no fill (e.g. "● Active"). */
  variant?: "badge" | "dot";
  "data-testid"?: string;
}

// Noninteractive status label; the text carries the meaning, color only reinforces it.
export const StatusBadge: React.FC<Props> = ({ children, tone = "neutral", variant = "badge", ...rest }) => {
  const c = toneVars[tone];
  if (variant === "dot") {
    return (
      <Box component="span" data-testid={rest["data-testid"]} sx={{ display: "inline-flex", alignItems: "center", gap: "7px", fontSize: 14, lineHeight: "21px", color: c.fg, whiteSpace: "nowrap" }}>
        <Box component="span" aria-hidden sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "currentColor", flexShrink: 0 }} />
        {children}
      </Box>
    );
  }
  return (
    <Box component="span" data-testid={rest["data-testid"]} sx={{ display: "inline-flex", alignItems: "center", gap: "6px", px: "9px", py: "3px", borderRadius: "var(--b1-radius-pill)", fontSize: 12, lineHeight: "18px", fontWeight: 600, whiteSpace: "nowrap", color: c.fg, bgcolor: c.bg }}>
      {children}
    </Box>
  );
};
