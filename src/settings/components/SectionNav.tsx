import React from "react";
import { Box, ButtonBase, Typography } from "@mui/material";
import { type ConfigSection } from "./SettingsConfigList";
import { labelSx } from "./SettingsPage";

const dotColor = { ok: "success.main", todo: "warning.main" };

interface Props {
  sections: ConfigSection[];
  selected: string;
  onSelect: (key: string) => void;
  label?: string;
  hideOnMobile?: boolean;
}

export const SectionNav: React.FC<Props> = ({ sections, selected, onSelect, label, hideOnMobile }) => (
  <Box component="nav" sx={{ display: hideOnMobile ? { xs: "none", md: "block" } : "block" }}>
    {label && <Typography sx={{ ...labelSx, mb: 1 }}>{label}</Typography>}
    {sections.map((s) => {
      const on = s.key === selected;
      return (
        <ButtonBase
          key={s.key}
          onClick={() => onSelect(s.key)}
          data-testid={`settings-section-${s.key}`}
          aria-current={on ? "true" : undefined}
          className={on ? "Mui-selected" : undefined}
          sx={{ display: "flex", width: "100%", textAlign: "left", justifyContent: "flex-start", alignItems: "baseline", gap: 1.5, py: 0.75, pl: 1.5, ml: -1.5, borderLeft: "2px solid", borderColor: on ? "var(--c1)" : "transparent", "&:hover .om-nav-title": { color: "var(--c1)" } }}>
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography className="om-nav-title" sx={{ fontSize: "0.95rem", fontWeight: on ? 600 : 400, color: on ? "var(--c1)" : "text.primary", lineHeight: 1.35 }}>{s.title}</Typography>
            <Typography noWrap sx={{ fontSize: "0.8rem", color: "text.secondary" }}>{s.subtitle}</Typography>
          </Box>
          {s.status && <Box aria-hidden sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: dotColor[s.status], flexShrink: 0, alignSelf: "center" }} />}
        </ButtonBase>
      );
    })}
  </Box>
);
