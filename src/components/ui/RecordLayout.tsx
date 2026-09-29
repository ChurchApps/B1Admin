import React from "react";
import { Box, Stack } from "@mui/material";
import type { SxProps, Theme } from "@mui/material";
import { profileLayoutSx } from "./layoutPresets";

interface Props {
  identity: React.ReactNode;
  children: React.ReactNode;
  /** Gap between slice sections, in theme spacing units. */
  spacing?: number;
  "data-testid"?: string;
  sliceSx?: SxProps<Theme>;
}

// One white record surface: identity column | 1px rule | the current slice. Stacks below md.
export const RecordLayout: React.FC<Props> = ({ identity, children, spacing = 5, sliceSx, ...rest }) => (
  <Box sx={{ ...profileLayoutSx, gap: 0, alignItems: "stretch", bgcolor: "background.paper", border: 1, borderColor: "divider", borderRadius: "var(--b1-radius-panel)" }}>
    <Box sx={{ p: { xs: 2, md: 3 }, borderRight: { md: 1 }, borderBottom: { xs: 1, md: 0 }, borderColor: { xs: "divider", md: "divider" }, minWidth: 0 }}>
      {identity}
    </Box>
    <Stack
      spacing={spacing}
      sx={[
        {
          p: { xs: 2, md: 4 },
          minWidth: 0,
          // Slices often reuse boxed components; flatten their outer card so the record stays one surface.
          "& > .MuiPaper-root, & > * > .MuiPaper-root": { border: 0, boxShadow: "none", bgcolor: "transparent", "& > .MuiCardContent-root, & > div": { px: 0 } }
        },
        ...(Array.isArray(sliceSx) ? sliceSx : [sliceSx])
      ]}
      data-testid={rest["data-testid"]}>
      {children}
    </Stack>
  </Box>
);
