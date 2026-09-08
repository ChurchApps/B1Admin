import React from "react";
import { Box, Stack, Typography } from "@mui/material";
import { Link } from "react-router-dom";

const MOBILE = "@media (max-width: 640px)";

const verbSx = {
  background: "none",
  border: 0,
  p: 0,
  fontFamily: "inherit",
  fontSize: "0.88rem",
  fontWeight: 600,
  color: "primary.main",
  cursor: "pointer",
  textDecoration: "none",
  lineHeight: 1.4,
  "&:hover": { textDecoration: "underline" }
};

export type PillItem = {
  label: string;
  selected?: boolean;
  to?: string;
  onClick?: () => void;
  count?: number;
  testId?: string;
};

export const Verb: React.FC<{
  children: React.ReactNode;
  to?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  testId?: string;
  startIcon?: React.ReactNode;
  type?: "button" | "submit";
}> = ({ children, to, onClick, testId, startIcon, type = "button" }) => {
  const inner = (
    <Stack direction="row" spacing={0.75} alignItems="center" component="span">
      {startIcon}
      <span>{children}</span>
    </Stack>
  );
  if (to) {
    return (
      <Box component={Link} to={to} data-testid={testId} sx={verbSx}>
        {inner}
      </Box>
    );
  }
  return (
    <Box component="button" type={type} onClick={onClick} data-testid={testId} sx={verbSx}>
      {inner}
    </Box>
  );
};

export const Pills: React.FC<{ items: PillItem[] }> = ({ items }) => (
  <Box
    sx={{
      display: "flex",
      gap: 1,
      flexWrap: "wrap",
      mb: 2.75,
      [MOBILE]: { flexWrap: "nowrap", overflowX: "auto", WebkitOverflowScrolling: "touch" }
    }}>
    {items.map((p) => {
      const sx = {
        backgroundColor: p.selected ? "primary.main" : "transparent",
        color: p.selected ? "#fff" : "text.primary",
        border: "1px solid",
        borderColor: p.selected ? "primary.main" : "divider",
        fontFamily: "inherit",
        fontSize: "0.88rem",
        fontWeight: 500,
        px: 1.75,
        py: 0.85,
        borderRadius: "999px",
        cursor: "pointer",
        textDecoration: "none",
        whiteSpace: "nowrap",
        lineHeight: 1.2,
        "&:hover": { borderColor: "primary.main" }
      };
      const label = p.count && p.count > 0 ? `${p.label} · ${p.count}` : p.label;
      if (p.to) {
        return (
          <Box key={p.testId || p.label} component={Link} to={p.to} data-testid={p.testId} sx={sx}>
            {label}
          </Box>
        );
      }
      return (
        <Box key={p.testId || p.label} component="button" type="button" onClick={p.onClick} data-testid={p.testId} sx={sx}>
          {label}
        </Box>
      );
    })}
  </Box>
);

export const DirectoryPage: React.FC<{
  title: string;
  lede?: string;
  pills?: PillItem[];
  headerVerbs?: React.ReactNode;
  find?: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
}> = ({ title, lede, pills, headerVerbs, find, children, wide }) => (
  <Box
    sx={{
      width: wide ? "100%" : { xs: "100%", sm: "min(840px, calc(100% - 32px))" },
      maxWidth: wide ? 1100 : 840,
      mx: "auto",
      mt: { xs: 0, sm: 3 },
      mb: 8,
      px: { xs: 2, sm: 5 },
      py: { xs: 3, sm: 4 },
      bgcolor: "background.paper",
      borderRadius: { xs: 0, sm: 1 },
      boxShadow: { xs: "none", sm: "0 2px 8px rgba(0,0,0,0.08)" },
      [MOBILE]: { width: "100%", maxWidth: "100%", mt: 0, borderRadius: 0, boxShadow: "none", px: 2, py: 3, mb: 0 }
    }}>
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} sx={{ mb: 0.5 }}>
      <Typography
        id="page-header-title"
        component="h1"
        sx={{ fontSize: { xs: "1.8rem", sm: "2.5rem" }, fontWeight: 500, letterSpacing: "-0.01em", lineHeight: 1.15 }}>
        {title}
      </Typography>
      {headerVerbs && (
        <Stack
          direction="row"
          spacing={2.25}
          alignItems="center"
          sx={{ flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end", [MOBILE]: { display: "none" } }}>
          {headerVerbs}
        </Stack>
      )}
    </Stack>
    {lede && (
      <Typography id="page-header-subtitle" sx={{ color: "text.secondary", mb: 3.5, mt: 1 }}>
        {lede}
      </Typography>
    )}
    {pills && pills.length > 0 && <Pills items={pills} />}
    {find}
    {children}
  </Box>
);

export const PlatedRecord: React.FC<{
  identity: React.ReactNode;
  slice: React.ReactNode;
}> = ({ identity, slice }) => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: "minmax(280px, 0.9fr) minmax(0, 1.2fr)",
      bgcolor: "background.paper",
      minHeight: "calc(100vh - 64px)",
      [MOBILE]: { gridTemplateColumns: "1fr", minHeight: 0 }
    }}>
    <Box
      sx={{
        px: { xs: 2, sm: 4.5 },
        pt: { xs: 3, sm: 4.5 },
        pb: 9,
        borderRight: "1px solid",
        borderColor: "divider",
        position: "relative",
        "&::before": {
          content: '""',
          position: "absolute",
          left: 0,
          top: 36,
          bottom: 72,
          width: "2px",
          bgcolor: "primary.main"
        },
        [MOBILE]: { borderRight: 0, pb: 3, "&::before": { display: "none" } }
      }}>
      {identity}
    </Box>
    <Box sx={{ px: { xs: 2, sm: 5 }, pt: { xs: 3, sm: 4.5 }, pb: 10, display: "grid", gap: 3.25, alignContent: "start", [MOBILE]: { pt: 1, pb: 6 } }}>
      {slice}
    </Box>
  </Box>
);

export const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography sx={{ fontSize: "0.72rem", fontWeight: 650, letterSpacing: "0.07em", textTransform: "uppercase", color: "text.secondary", mt: 3.5, mb: 1.25 }}>
    {children}
  </Typography>
);

export const FindField: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  testId?: string;
}> = ({ value, onChange, placeholder, testId }) => (
  <Box
    component="input"
    value={value}
    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
    placeholder={placeholder}
    data-testid={testId}
    sx={{
      width: "100%",
      border: 0,
      borderBottom: "1px solid",
      borderColor: "divider",
      bgcolor: "transparent",
      fontSize: { xs: "1.25rem", sm: "1.5rem" },
      fontFamily: "inherit",
      py: 0.75,
      mb: 3.5,
      outline: "none",
      color: "text.primary",
      "&:focus": { borderBottomColor: "primary.main" },
      "&::placeholder": { color: "text.secondary", opacity: 0.7 }
    }}
  />
);

export const AddBlock: React.FC<{ title?: string; children: React.ReactNode }> = ({ title, children }) => (
  <Box sx={{ mt: 4.5, pt: 3, borderTop: "1px solid", borderColor: "divider" }}>
    {title && (
      <Typography sx={{ fontSize: "1.4rem", fontWeight: 500, mb: 1.5 }}>
        {title}
      </Typography>
    )}
    {children}
  </Box>
);

export const plainTableSx = {
  width: "100%",
  "& th": {
    textAlign: "left",
    color: "text.secondary",
    fontWeight: 500,
    fontSize: "0.72rem",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    borderBottom: "1px solid",
    borderColor: "divider",
    px: 0,
    py: 1
  },
  "& td": {
    px: 0,
    py: 1.25,
    borderBottom: "1px solid",
    borderColor: "divider"
  }
};
