import React from "react";
import { Box, ButtonBase } from "@mui/material";
import type { SxProps, Theme } from "@mui/material";
import { filterChipSx } from "./FilterChip";

export interface PillOption {
  value: string;
  label: React.ReactNode;
  "data-testid"?: string;
}

interface Props {
  options: PillOption[];
  value: string;
  onChange: (value: string) => void;
  /** role=tablist/tab + aria-selected, for slices that specs still find by role="tab". Otherwise aria-pressed. */
  tabs?: boolean;
  "aria-label"?: string;
  "data-testid"?: string;
  sx?: SxProps<Theme>;
}

// One row of mutually exclusive pills; scrolls sideways on phones instead of wrapping.
export const PillTabs: React.FC<Props> = ({ options, value, onChange, tabs, sx, ...rest }) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!tabs || (e.key !== "ArrowRight" && e.key !== "ArrowLeft")) return;
    const buttons = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("[role=tab]"));
    const i = buttons.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;
    const next = buttons[(i + (e.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length];
    next.focus();
    next.click();
  };

  return (
    <Box
      role={tabs ? "tablist" : "group"}
      aria-label={rest["aria-label"]}
      data-testid={rest["data-testid"]}
      onKeyDown={handleKeyDown}
      sx={[
        { display: "flex", gap: 1, flexWrap: { xs: "nowrap", sm: "wrap" }, overflowX: { xs: "auto", sm: "visible" }, WebkitOverflowScrolling: "touch", pb: { xs: 0.5, sm: 0 } },
        ...(Array.isArray(sx) ? sx : [sx])
      ]}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <ButtonBase
            key={o.value}
            role={tabs ? "tab" : undefined}
            aria-selected={tabs ? selected : undefined}
            aria-pressed={tabs ? undefined : selected}
            tabIndex={tabs && !selected ? -1 : 0}
            onClick={() => onChange(o.value)}
            data-testid={o["data-testid"]}
            sx={{ ...filterChipSx(selected), flexShrink: 0, whiteSpace: "nowrap" }}>
            {o.label}
          </ButtonBase>
        );
      })}
    </Box>
  );
};
