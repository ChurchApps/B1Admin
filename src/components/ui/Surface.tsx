import React, { type ReactNode } from "react";
import { Box } from "@mui/material";
import type { SxProps, Theme } from "@mui/material";

interface Props {
  children: ReactNode;
  /** Drop the 24px inner padding, e.g. for a flush table. */
  disablePadding?: boolean;
  component?: React.ElementType;
  id?: string;
  sx?: SxProps<Theme>;
  "data-testid"?: string;
}

// The white work panel: 1px divider border, 10px radius, no shadow. Sized to its content.
export const Surface: React.FC<Props> = ({ children, disablePadding, component = "section", id, sx, ...rest }) => (
  <Box
    component={component}
    id={id}
    data-testid={rest["data-testid"]}
    sx={[
      { bgcolor: "background.paper", border: 1, borderColor: "divider", borderRadius: "var(--b1-radius-panel)", minWidth: 0, p: disablePadding ? 0 : { xs: 2, md: 3 } },
      ...(Array.isArray(sx) ? sx : [sx])
    ]}>
    {children}
  </Box>
);
