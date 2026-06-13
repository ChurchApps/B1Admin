import React, { type ReactNode } from "react";
import { TableHead, TableRow, TableCell, TableSortLabel, Typography } from "@mui/material";

export type SortDirection = "asc" | "desc";

export interface SortableColumn {
  key: string;
  label: ReactNode;
  sortable?: boolean;
  minWidth?: number | string;
  align?: "left" | "right" | "center";
}

interface SortableTableHeadProps {
  columns: SortableColumn[];
  sortBy?: string;
  sortDirection?: SortDirection;
  onSort?: (key: string) => void;
  /** Cells rendered before the columns, e.g. a select-all checkbox cell. */
  leading?: ReactNode;
}

export const SortableTableHead: React.FC<SortableTableHeadProps> = ({ columns, sortBy, sortDirection = "asc", onSort, leading }) => (
  <TableHead
    sx={{
      "& .MuiTableCell-root": {
        backgroundColor: "var(--bg-sub)",
        borderBottom: "2px solid var(--border-main)",
        whiteSpace: "nowrap"
      }
    }}>
    <TableRow>
      {leading}
      {columns.map((c) => {
        const active = sortBy === c.key;
        const label = (
          <Typography component="span" variant="subtitle2" sx={{ fontWeight: 600 }}>
            {c.label}
          </Typography>
        );
        return (
          <TableCell key={c.key} align={c.align} sx={{ minWidth: c.minWidth }} sortDirection={active ? sortDirection : false}>
            {c.sortable && onSort ? (
              <TableSortLabel active={active} direction={active ? sortDirection : "asc"} onClick={() => onSort(c.key)}>
                {label}
              </TableSortLabel>
            ) : (
              label
            )}
          </TableCell>
        );
      })}
    </TableRow>
  </TableHead>
);
