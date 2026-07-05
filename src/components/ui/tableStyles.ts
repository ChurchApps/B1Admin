import type { SxProps, Theme } from "@mui/material";

// Shared row-hover styling for MUI TableRows (replaces the inline sx pasted across pages).
export const hoverRowSx: SxProps<Theme> = {
  "&:hover": { backgroundColor: "action.hover" },
  transition: "background-color 0.2s ease"
};

// Same, plus a pointer cursor for rows that navigate on click.
export const clickableRowSx: SxProps<Theme> = {
  cursor: "pointer",
  "&:hover": { backgroundColor: "action.hover" },
  transition: "background-color 0.2s ease"
};
