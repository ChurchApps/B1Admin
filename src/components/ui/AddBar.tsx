import React from "react";
import { Box, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material";

interface Props {
  /** e.g. "Add a fund". Omit for a bare verb row. */
  title?: string;
  /** An inline add form, or a VerbRow of add verbs. */
  children: React.ReactNode;
  "data-testid"?: string;
  sx?: SxProps<Theme>;
}

// The one place to add on a list: below the list, always rendered (phones included).
export const AddBar: React.FC<Props> = ({ title, children, sx, ...rest }) => (
  <Box
    component="section"
    aria-label={title}
    data-testid={rest["data-testid"]}
    sx={[{ mt: 4, pt: 3, borderTop: 1, borderColor: "divider" }, ...(Array.isArray(sx) ? sx : [sx])]}>
    {title && <Typography variant="h3" component="h2" sx={{ mb: 1.5 }}>{title}</Typography>}
    {children}
  </Box>
);
