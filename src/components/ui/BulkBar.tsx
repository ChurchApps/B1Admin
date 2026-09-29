import React from "react";
import { Box, Typography } from "@mui/material";
import { Locale } from "@churchapps/apphelper";

interface Props {
  count: number;
  /** Short list of what's selected, e.g. "Amazing Grace, Oceans". */
  names?: string;
  /** Verbs for the selection (TextAction or small Buttons). */
  children: React.ReactNode;
  "data-testid"?: string;
}

// Sticky selection bar; renders nothing until at least one row is selected.
export const BulkBar: React.FC<Props> = ({ count, names, children, ...rest }) => {
  if (count < 1) return null;
  const countLabel = Locale.label("common.selectedCount", "{count} selected").replace("{count}", count.toString());
  return (
    <Box
      role="region"
      aria-label={countLabel}
      data-testid={rest["data-testid"]}
      sx={{
        position: "sticky",
        bottom: 16,
        zIndex: 2,
        mt: 3,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
        flexWrap: "wrap",
        px: 2,
        py: 1.5,
        bgcolor: "var(--b1-selected)",
        color: "var(--b1-on-selected)",
        border: 1,
        borderColor: "primary.main",
        borderRadius: "var(--b1-radius-panel)"
      }}>
      <Box aria-live="polite" sx={{ minWidth: 0 }}>
        <Typography component="span" variant="body2" sx={{ fontWeight: 650 }}>{countLabel}</Typography>
        {names && <Typography component="span" variant="body2" sx={{ ml: 1, overflowWrap: "anywhere" }}>{"· " + names}</Typography>}
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>{children}</Box>
    </Box>
  );
};
