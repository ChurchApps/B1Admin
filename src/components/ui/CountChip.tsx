import React from "react";
import { Chip } from "@mui/material";

export const CountChip: React.FC<{ count: number }> = ({ count }) => (
  <Chip
    size="small"
    label={count}
    sx={{ backgroundColor: "var(--bg-sub)", border: "1px solid var(--border-light)", color: "var(--text-muted)", fontWeight: 500, fontSize: "0.75rem" }}
  />
);
