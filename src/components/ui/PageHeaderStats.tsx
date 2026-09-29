import React, { type ReactNode } from "react";
import { Stack, Typography, type StackProps } from "@mui/material";
import { useHeaderTone } from "./headerTone";

export interface PageHeaderStat {
  icon?: ReactNode;
  value: ReactNode;
  label: string;
  minWidth?: number;
  note?: string;
}

interface Props {
  items: PageHeaderStat[];
  spacing?: StackProps["spacing"];
  spread?: boolean;
}

export const PageHeaderStats: React.FC<Props> = ({ items, spacing = { xs: 2, sm: 4, md: 5 }, spread = false }) => {
  const light = useHeaderTone() === "light";
  return (
    <Stack direction="row" spacing={spacing} sx={spread ? { justifyContent: { md: "space-between" } } : undefined}>
      {items.map((item) => (
        <Stack key={item.label} spacing={0.5} alignItems={light ? "flex-start" : "center"} sx={{ minWidth: item.minWidth ?? 100 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            {item.icon}
            <Typography sx={light ? { fontSize: 18, lineHeight: "25px", fontWeight: 650, fontVariantNumeric: "tabular-nums", color: "text.primary" } : { fontSize: "1.5rem", color: "#FFF", fontWeight: 700 }}>{item.value}</Typography>
          </Stack>
          <Typography variant="caption" sx={light ? { color: "text.secondary" } : { color: "rgba(255,255,255,0.85)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.5 }}>{item.label}</Typography>
          {item.note && <Typography variant="caption" sx={{ color: light ? "text.secondary" : "rgba(255,255,255,0.75)", fontSize: "0.7rem", textAlign: light ? "left" : "center" }}>{item.note}</Typography>}
        </Stack>
      ))}
    </Stack>
  );
};
