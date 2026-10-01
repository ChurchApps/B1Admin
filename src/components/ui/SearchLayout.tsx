import React from "react";
import { Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";

export interface ViewOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactElement;
  "data-testid"?: string;
}

interface ViewToggleProps<T extends string> {
  value: T;
  options: ViewOption<T>[];
  onChange: (value: T) => void;
  label?: string;
}

// Mutually exclusive views are a segmented toggle, never a row of text links.
export function ViewToggle<T extends string>({ value, options, onChange, label }: ViewToggleProps<T>) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      {label && <Typography variant="body2" color="text.secondary">{label}</Typography>}
      <ToggleButtonGroup
        exclusive
        size="small"
        value={value}
        onChange={(_, v: T | null) => { if (v) onChange(v); }}
        aria-label={label}
        sx={{ "& .MuiToggleButton-root": { textTransform: "none", fontWeight: 600, px: 1.5, py: 0.5, gap: 0.75, "& .MuiSvgIcon-root": { fontSize: 18 } } }}>
        {options.map((o) => (
          <ToggleButton key={o.value} value={o.value} data-testid={o["data-testid"]}>
            {o.icon}
            {o.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Stack>
  );
}

// The line between the search controls and the results: count (or selection tools) on the left, view controls on the right.
export const ResultsBar: React.FC<{ children: React.ReactNode; end?: React.ReactNode; "data-testid"?: string }> = ({ children, end, ...rest }) => (
  <Stack direction="row" justifyContent="space-between" alignItems="center" useFlexGap flexWrap="wrap" spacing={1} sx={{ minHeight: end ? 40 : undefined, mb: end ? 0 : -1 }} aria-live="polite" data-testid={rest["data-testid"]}>
    <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">{children}</Stack>
    {end}
  </Stack>
);
