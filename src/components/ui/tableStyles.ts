import type { SxProps, Theme } from "@mui/material";

// Row hover is theme-level for every tbody row; these remain for explicit use and the pointer cursor.
export const hoverRowSx: SxProps<Theme> = {
  "&:hover": { backgroundColor: "action.hover" },
  transition: "background-color 140ms"
};

export const clickableRowSx: SxProps<Theme> = {
  cursor: "pointer",
  "&:hover": { backgroundColor: "action.hover" },
  transition: "background-color 140ms"
};

// Money and aligned counts: right-aligned tabular numerals. Put on both the header and body cell.
export const numericCellSx: SxProps<Theme> = { textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };

// Wrap a Table so narrow screens scroll the table, not the page. Add role="region", aria-label and tabIndex={0} on the wrapper.
export const tableScrollSx: SxProps<Theme> = { overflowX: "auto", width: "100%" };
