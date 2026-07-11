import React, { type ReactNode } from "react";
import { Stack, Typography, type StackProps } from "@mui/material";

export interface PageHeaderStat {
  icon?: ReactNode;
  value: ReactNode;
  label: string;
  minWidth?: number;
}

interface Props {
  items: PageHeaderStat[];
  spacing?: StackProps["spacing"];
  spread?: boolean;
}

export const PageHeaderStats: React.FC<Props> = ({ items, spacing = { xs: 2, sm: 4, md: 5 }, spread = false }) => (
  <Stack
    direction="row"
    spacing={spacing}
    sx={{
    //   position: { xs: "static", md: "absolute" },
    //   left: { md: "50%" },
    //   top: { md: "50%" },
    //   transform: { md: "translateY(-50%)" },
      ...(spread ? { right: { md: "24px" }, justifyContent: { md: "space-between" } } : {}),
      // flexWrap: "wrap",
    }}
  >
    {items.map((item) => (
      <Stack key={item.label} spacing={0.5} alignItems="center" sx={{ minWidth: item.minWidth ?? 100 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          {item.icon}
          <Typography variant="h5" sx={{ color: "#FFF", fontWeight: 700 }}>{item.value}</Typography>
        </Stack>
        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.5 }}>{item.label}</Typography>
      </Stack>
    ))}
  </Stack>
);
