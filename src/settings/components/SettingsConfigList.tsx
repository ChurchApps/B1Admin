import React from "react";
import { Box, Card, List, ListItemButton, Typography, alpha } from "@mui/material";
import { ChevronRight as ChevronRightIcon } from "@mui/icons-material";
import { Locale } from "@churchapps/apphelper";
import { CountChip } from "../../components/ui";

export interface ConfigSection {
  key: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: "primary" | "secondary" | "success" | "info" | "warning" | "error";
  count?: number;
}

interface Props {
  sections: ConfigSection[];
  selected: string;
  onSelect: (key: string) => void;
  /** Prefix for each row's data-testid (defaults to "settings-section" for the ManageChurch pattern). */
  testIdPrefix?: string;
  /** Overrides the header label above the list (defaults to "Configuration"). */
  headerLabel?: string;
}

export const SettingsConfigList: React.FC<Props> = ({ sections, selected, onSelect, testIdPrefix = "settings-section", headerLabel }) => (
  <Card sx={{ borderRadius: 2, overflow: "hidden", border: "1px solid", borderColor: "grey.200" }}>
    <Box sx={{ px: 2.5, py: 2, borderBottom: 1, borderColor: "divider" }}>
      <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: 1, color: "text.secondary" }}>
        {headerLabel || Locale.label("settings.landing.configuration")}
      </Typography>
    </Box>
    <List disablePadding>
      {sections.map((s) => {
        const isSelected = s.key === selected;
        return (
          <ListItemButton
            key={s.key}
            selected={isSelected}
            onClick={() => onSelect(s.key)}
            data-testid={`${testIdPrefix}-${s.key}`}
            sx={{
              px: 2.5,
              py: 1.75,
              gap: 1.5,
              borderLeft: "3px solid",
              borderColor: isSelected ? "primary.main" : "transparent",
              "&.Mui-selected": { backgroundColor: (t) => alpha(t.palette.primary.main, 0.06) },
              "&.Mui-selected:hover": { backgroundColor: (t) => alpha(t.palette.primary.main, 0.1) }
            }}>
            <Box sx={{ width: 40, height: 40, borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: (t) => alpha(t.palette[s.color].main, 0.1), color: `${s.color}.main`, flexShrink: 0 }}>
              {s.icon}
            </Box>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>{s.title}</Typography>
                {s.count != null && s.count > 0 && <CountChip count={s.count} />}
              </Box>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>{s.subtitle}</Typography>
            </Box>
            <ChevronRightIcon sx={{ color: "text.disabled" }} />
          </ListItemButton>
        );
      })}
    </List>
  </Card>
);
