import React from "react";
import { Box } from "@mui/material";
import type { Breakpoint } from "@mui/material";
import { b1Layout } from "../../helpers/Themes";

interface PageContainerProps {
  children: React.ReactNode;
  /** Defaults to the 1480px content maximum; pass a breakpoint (e.g. "md") for a narrower page. */
  maxWidth?: Breakpoint | false;
  /** Vertical padding in spacing units; defaults to the page-padding scale (16/24/32px). */
  py?: number;
}

export const PageContainer: React.FC<PageContainerProps> = ({ children, maxWidth, py }) => (
  <Box
    sx={(theme) => ({
      width: "100%",
      mx: "auto",
      maxWidth: maxWidth === false ? "none" : maxWidth ? theme.breakpoints.values[maxWidth] : b1Layout.contentMax,
      px: { xs: 2, md: 3, lg: 4 },
      py: py ?? { xs: 2, md: 3, lg: 4 }
    })}>
    {children}
  </Box>
);
