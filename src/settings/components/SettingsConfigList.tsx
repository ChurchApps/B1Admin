import React from "react";
import { Box, List, ListItemButton, Typography } from "@mui/material";
import { Locale } from "@churchapps/apphelper";
import { CountChip } from "../../components/ui";
import { CANDLE, DUST, INK, LINE } from "../plated";

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
  testIdPrefix?: string;
  headerLabel?: string;
  primaryKeys?: string[];
}

export const SettingsConfigList: React.FC<Props> = ({ sections, selected, onSelect, testIdPrefix = "settings-section", headerLabel, primaryKeys }) => {
  const primary = primaryKeys?.length ? sections.filter((s) => primaryKeys.includes(s.key)) : sections;
  const more = primaryKeys?.length ? sections.filter((s) => !primaryKeys.includes(s.key)) : [];

  const renderItem = (s: ConfigSection) => {
    const isSelected = s.key === selected;
    return (
      <ListItemButton
        key={s.key}
        selected={isSelected}
        onClick={() => onSelect(s.key)}
        data-testid={`${testIdPrefix}-${s.key}`}
        sx={{
          px: 0,
          py: 1.1,
          gap: 1,
          borderLeft: "2px solid",
          borderColor: isSelected ? CANDLE : "transparent",
          pl: 1.5,
          "&.Mui-selected": { backgroundColor: "transparent" },
          "&.Mui-selected:hover": { backgroundColor: "transparent" },
          "&:hover": { backgroundColor: "transparent" }
        }}>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: isSelected ? 650 : 500, color: isSelected ? CANDLE : INK, lineHeight: 1.2 }}>{s.title}</Typography>
            {s.count != null && s.count > 0 && <CountChip count={s.count} />}
          </Box>
          <Typography variant="caption" sx={{ color: DUST, display: "block" }} noWrap>{s.subtitle}</Typography>
        </Box>
      </ListItemButton>
    );
  };

  return (
    <Box>
      {headerLabel && (
        <Typography sx={{ fontSize: "0.72rem", fontWeight: 650, letterSpacing: "0.07em", textTransform: "uppercase", color: DUST, mb: 1 }}>
          {headerLabel}
        </Typography>
      )}
      <List disablePadding>
        {primary.map(renderItem)}
      </List>
      {more.length > 0 && (
        <Box sx={{ mt: 2, pt: 1.5, borderTop: `1px solid ${LINE}` }}>
          <Typography sx={{ fontSize: "0.72rem", fontWeight: 650, letterSpacing: "0.07em", textTransform: "uppercase", color: DUST, mb: 0.5 }}>
            {Locale.label("common.more", "More")}
          </Typography>
          <List disablePadding>
            {more.map(renderItem)}
          </List>
        </Box>
      )}
    </Box>
  );
};
