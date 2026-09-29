import React, { type ReactNode } from "react";
import { ButtonBase } from "@mui/material";

interface Props {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  "data-testid"?: string;
}

export const filterChipSx = (selected: boolean) => ({
  minHeight: { xs: 44, md: 40 },
  px: "14px",
  borderRadius: "var(--b1-radius-pill)",
  border: 1,
  borderColor: selected ? "primary.main" : "var(--b1-control-border)",
  bgcolor: selected ? "var(--b1-selected)" : "background.paper",
  color: selected ? "var(--b1-on-selected)" : "text.primary",
  fontSize: 14,
  fontWeight: selected ? 650 : 400,
  transition: "background-color 140ms",
  "&:hover": { bgcolor: selected ? "var(--b1-selected)" : "var(--b1-hover)" }
});

// Toggleable filter (aria-pressed); never use for a status — that's StatusBadge.
export const FilterChip: React.FC<Props> = ({ selected, onClick, children, ...rest }) => (
  <ButtonBase aria-pressed={selected} onClick={onClick} data-testid={rest["data-testid"]} sx={filterChipSx(selected)}>
    {children}
  </ButtonBase>
);
