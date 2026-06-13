import React from "react";
import { Box } from "@mui/material";

export interface BreadcrumbCrumb {
  label: string;
  onClick?: () => void;
}

interface Props {
  crumbs: BreadcrumbCrumb[];
}

export const SelectionBreadcrumb: React.FC<Props> = ({ crumbs }) => (
  <Box
    data-testid="selection-breadcrumb"
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 0.5,
      fontSize: "0.7rem",
      color: "text.secondary",
      lineHeight: 1.2,
      whiteSpace: "nowrap",
      overflow: "hidden"
    }}
  >
    {crumbs.map((c, i) => (
      <React.Fragment key={i}>
        {i > 0 && <span>›</span>}
        {c.onClick ? (
          <Box
            component="button"
            type="button"
            data-testid={`breadcrumb-crumb-${i}`}
            onClick={c.onClick}
            sx={{
              background: "none",
              border: "none",
              padding: 0,
              font: "inherit",
              color: "inherit",
              cursor: "pointer",
              "&:hover": { textDecoration: "underline", color: "primary.main" }
            }}
          >
            {c.label}
          </Box>
        ) : (
          <Box component="span" data-testid={`breadcrumb-crumb-${i}`} sx={{ color: "text.primary", fontWeight: 600 }}>
            {c.label}
          </Box>
        )}
      </React.Fragment>
    ))}
  </Box>
);
