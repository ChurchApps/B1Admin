import React from "react";
import { Box, ButtonBase, Typography } from "@mui/material";
import { Locale } from "@churchapps/apphelper";
import { type ConfigSection } from "./SettingsConfigList";
import { labelSx, srOnlySx } from "./SettingsPage";
import { CountChip } from "../../components/ui";

export interface SectionNavGroup {
  label: string;
  keys: string[];
}

interface Props {
  sections: ConfigSection[];
  selected: string;
  onSelect: (key: string) => void;
  label?: string;
  hideOnMobile?: boolean;
  /** Short uppercase groups (e.g. Directory / Operations / System); unlisted sections fall into a trailing unlabeled group. */
  groups?: SectionNavGroup[];
  /** Keep subtitles for screen readers only; use when they are descriptions rather than live state. */
  hideSubtitles?: boolean;
}

export const SectionNav: React.FC<Props> = ({ sections, selected, onSelect, label, hideOnMobile, groups, hideSubtitles }) => {
  const renderItem = (s: ConfigSection) => {
    const on = s.key === selected;
    return (
      <ButtonBase
        key={s.key}
        onClick={() => onSelect(s.key)}
        data-testid={`settings-section-${s.key}`}
        aria-current={on ? "page" : undefined}
        className={on ? "Mui-selected" : undefined}
        sx={{
          display: "flex",
          width: "100%",
          minHeight: 44,
          px: 1.5,
          py: 1.25,
          gap: 1.5,
          borderRadius: "var(--b1-radius-control)",
          textAlign: "left",
          justifyContent: "flex-start",
          alignItems: "center",
          color: on ? "var(--b1-on-selected)" : "text.primary",
          bgcolor: on ? "var(--b1-selected)" : "transparent",
          transition: "background-color 140ms",
          "&:hover": { bgcolor: on ? "var(--b1-selected)" : "var(--b1-hover)" }
        }}>
        {s.icon && <Box aria-hidden sx={{ display: "flex", flexShrink: 0, color: on ? "inherit" : "text.secondary", "& .MuiSvgIcon-root": { fontSize: 20 } }}>{s.icon}</Box>}
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography component="span" sx={{ display: "block", fontSize: 14, lineHeight: "21px", fontWeight: on ? 650 : 400, color: "inherit" }}>{s.title}</Typography>
          {s.subtitle && (hideSubtitles
            ? <Box component="span" sx={srOnlySx}>{s.subtitle}</Box>
            : <Typography component="span" noWrap sx={{ display: "block", fontSize: 12, lineHeight: "18px", color: "text.secondary" }}>{s.subtitle}</Typography>)}
        </Box>
        {!!s.count && s.count > 0 && <CountChip count={s.count} />}
        {s.status === "todo" && (
          <>
            <Box aria-hidden sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "var(--b1-warning)", flexShrink: 0 }} />
            <Box component="span" sx={srOnlySx}>{Locale.label("settings.landing.notConfigured")}</Box>
          </>
        )}
      </ButtonBase>
    );
  };

  const listed = new Set(groups?.flatMap((g) => g.keys) || []);
  const rest = sections.filter((s) => !listed.has(s.key));

  return (
    <Box component="nav" aria-label={label} sx={{ display: hideOnMobile ? { xs: "none", md: "block" } : "block" }}>
      {groups ? (
        <>
          {groups.map((g) => ({ label: g.label, items: sections.filter((s) => g.keys.includes(s.key)) })).filter((g) => g.items.length > 0).map((g, i) => (
            <Box key={g.label} sx={{ mt: i === 0 ? 0 : 3 }}>
              <Typography sx={{ ...labelSx, px: 1.5, pb: 1 }}>{g.label}</Typography>
              {g.items.map(renderItem)}
            </Box>
          ))}
          {rest.length > 0 && <Box sx={{ mt: 3 }}>{rest.map(renderItem)}</Box>}
        </>
      ) : (
        <>
          {label && <Typography sx={{ ...labelSx, px: 1.5, pb: 1 }}>{label}</Typography>}
          {sections.map(renderItem)}
        </>
      )}
    </Box>
  );
};
