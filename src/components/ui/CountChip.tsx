import React from "react";
import { Box } from "@mui/material";

export const CountChip: React.FC<{ count: number }> = ({ count }) => (
  <Box
    component="span"
    sx={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 24, height: 22, px: 1, borderRadius: "var(--b1-radius-pill)", bgcolor: "var(--b1-neutral-bg)", color: "var(--b1-neutral)", fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}
  >
    {count}
  </Box>
);
