import React from "react";
import { Box, List, ListItemButton, Typography } from "@mui/material";
import { ChevronRight as ChevronRightIcon } from "@mui/icons-material";
import { Locale } from "@churchapps/apphelper";
import { CountChip } from "../../components/ui";
import { labelSx } from "./SettingsPage";

export interface ConfigSection {
  key: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: "primary" | "secondary" | "success" | "info" | "warning" | "error";
  count?: number;
  status?: "ok" | "todo";
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
  <Box>
    <Box sx={{ px: 1.5, pb: 1 }}>
      <Typography sx={labelSx}>{headerLabel || Locale.label("settings.landing.configuration")}</Typography>
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
            aria-current={isSelected ? "true" : undefined}
            sx={{ px: 1.5, py: 1.25, gap: 1.5, minHeight: 44 }}>
            <Box aria-hidden sx={{ display: "flex", flexShrink: 0, color: isSelected ? "inherit" : "text.secondary", "& .MuiSvgIcon-root": { fontSize: 20 } }}>
              {s.icon}
            </Box>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: isSelected ? 650 : 400, color: "inherit" }}>{s.title}</Typography>
                {s.count != null && s.count > 0 && <CountChip count={s.count} />}
              </Box>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>{s.subtitle}</Typography>
            </Box>
            <ChevronRightIcon sx={{ color: "text.disabled" }} />
          </ListItemButton>
        );
      })}
    </List>
  </Box>
);
