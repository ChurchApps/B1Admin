import React from "react";
import { Box, ButtonBase } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { CountChip, filterChipSx } from "../../components/ui";

export interface SectionPill {
  label: string;
  to: string;
  selected: boolean;
  count?: number;
  "data-testid"?: string;
}

// Pills that are real links between sibling pages; scrolls sideways on phones.
export const SectionPills: React.FC<{ items: SectionPill[]; "aria-label": string }> = ({ items, ...rest }) => (
  <Box component="nav" aria-label={rest["aria-label"]} sx={{ display: "flex", gap: 1, flexWrap: { xs: "nowrap", sm: "wrap" }, overflowX: { xs: "auto", sm: "visible" }, pb: { xs: 0.5, sm: 0 } }}>
    {items.map((item) => (
      <ButtonBase
        key={item.to}
        component={RouterLink}
        to={item.to}
        aria-current={item.selected ? "page" : undefined}
        data-testid={item["data-testid"]}
        sx={{ ...filterChipSx(item.selected), gap: 1, flexShrink: 0, whiteSpace: "nowrap" }}>
        {item.label}
        {!!item.count && <CountChip count={item.count} />}
      </ButtonBase>
    ))}
  </Box>
);
