import React from "react";
import { Box, type BoxProps, type SxProps, type Theme } from "@mui/material";

export const CANDLE = "var(--c1)";
export const INK = "var(--text-main, #333333)";
export const DUST = "var(--text-sub, #666666)";
export const LINE = "var(--border-main)";
export const MOBILE = 640;
const PHONE = "@media (max-width: 640px)";

export const plateSx: SxProps<Theme> = {
  bgcolor: "background.paper",
  borderRadius: 0,
  mx: 0,
  mt: 0,
  mb: 0,
  boxShadow: "none",
  overflow: "hidden",
  width: "100%",
  minHeight: "calc(100vh - 56px)",
  boxSizing: "border-box"
};

export const dirPadSx: SxProps<Theme> = {
  px: 5,
  pt: 4,
  pb: 8,
  [PHONE]: { px: 2, pt: 3, pb: 8 }
};

export const h1Sx: SxProps<Theme> = {
  fontSize: "2.5rem",
  fontWeight: 500,
  letterSpacing: "-0.01em",
  lineHeight: 1.15,
  color: INK,
  m: 0,
  [PHONE]: { fontSize: "1.8rem" }
};

export const ledeSx: SxProps<Theme> = {
  color: DUST,
  mt: 1,
  mb: 3.5,
  fontSize: "0.95rem"
};

export const verbSx: SxProps<Theme> = {
  background: "none",
  border: 0,
  p: 0,
  font: "inherit",
  fontSize: "0.88rem",
  fontWeight: 600,
  color: CANDLE,
  cursor: "pointer",
  textDecoration: "none",
  "&:hover": { textDecoration: "underline" }
};

export const h3Sx: SxProps<Theme> = {
  fontSize: "0.72rem",
  fontWeight: 650,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  color: DUST,
  mt: 3.5,
  mb: 1.25
};

export const findSx: SxProps<Theme> = {
  width: "100%",
  bgcolor: "transparent",
  border: 0,
  borderBottom: `1px solid ${LINE}`,
  color: INK,
  fontSize: "1.5rem",
  fontFamily: "inherit",
  outline: "none",
  py: 0.75,
  px: 0,
  mb: 1,
  "&:focus": { borderBottomColor: CANDLE },
  [PHONE]: { fontSize: "1.25rem" }
};

export const pillSx = (on: boolean): SxProps<Theme> => ({
  background: on ? CANDLE : "transparent",
  border: `1px solid ${on ? CANDLE : LINE}`,
  color: on ? "#fff" : INK,
  font: "inherit",
  fontSize: "0.88rem",
  fontWeight: 500,
  px: 1.75,
  py: 0.85,
  borderRadius: "999px",
  cursor: "pointer",
  whiteSpace: "nowrap"
});

export const addBarSx: SxProps<Theme> = {
  mt: 4.5,
  pt: 3,
  borderTop: `1px solid ${LINE}`
};

export const whoSx: SxProps<Theme> = {
  px: 4.5,
  py: 4.5,
  pb: 9,
  borderRight: `1px solid ${LINE}`,
  position: "relative",
  "&::before": {
    content: '""',
    position: "absolute",
    left: 0,
    top: 36,
    bottom: 72,
    width: "2px",
    bgcolor: CANDLE
  },
  [PHONE]: {
    px: 2,
    py: 2.5,
    pb: 5,
    borderRight: 0,
    borderBottom: `1px solid ${LINE}`,
    "&::before": { top: 20, bottom: 40 }
  }
};

export const restSx: SxProps<Theme> = {
  px: 5,
  py: 4.5,
  pb: 10,
  display: "grid",
  gap: 3.25,
  alignContent: "start",
  minWidth: 0,
  [PHONE]: { px: 2, py: 2.5, pb: 8 }
};

export const recordGridSx: SxProps<Theme> = {
  display: "grid",
  gridTemplateColumns: "minmax(280px, 0.9fr) minmax(0, 1.2fr)",
  [PHONE]: { gridTemplateColumns: "1fr" }
};

export const dlRowSx: SxProps<Theme> = {
  display: "grid",
  gridTemplateColumns: "7.5rem 1fr",
  gap: "6px 12px",
  py: 0.75,
  borderTop: `1px solid ${LINE}`,
  fontSize: "0.9rem",
  "& dt": { color: DUST, m: 0 },
  "& dd": { m: 0, color: INK },
  [PHONE]: { gridTemplateColumns: "1fr", gap: 0.25 }
};

export const Plate: React.FC<BoxProps & { directory?: boolean }> = ({ directory, sx, children, ...rest }) => (
  <Box sx={[plateSx, directory ? dirPadSx : {}, sx] as SxProps<Theme>} {...rest}>{children}</Box>
);

export const Record: React.FC<{ who: React.ReactNode; rest: React.ReactNode }> = ({ who, rest }) => (
  <Box sx={recordGridSx}>
    <Box sx={whoSx}>{who}</Box>
    <Box sx={restSx}>{rest}</Box>
  </Box>
);

export const Verbs: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box sx={{ display: "flex", gap: 1.75, flexWrap: "wrap", my: 2 }}>{children}</Box>
);

export const SectionLabel: React.FC<{ children: React.ReactNode; sx?: SxProps<Theme> }> = ({ children, sx }) => (
  <Box component="h3" sx={[h3Sx, sx] as SxProps<Theme>}>{children}</Box>
);
