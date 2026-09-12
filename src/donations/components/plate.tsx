import React from "react";
import { Box, Link as MuiLink } from "@mui/material";
import type { SxProps, Theme } from "@mui/material";
import { type DonationInterface } from "@churchapps/helpers";

export const MOBILE = 640;

export const verbSx: SxProps<Theme> = {
  background: "none",
  border: 0,
  padding: 0,
  font: "inherit",
  fontSize: "0.88rem",
  fontWeight: 600,
  color: "var(--c1)",
  cursor: "pointer",
  textDecoration: "none",
  display: "inline",
  "&:hover": { textDecoration: "underline" }
};

export const mutedSx: SxProps<Theme> = {
  color: "var(--text-muted)",
  fontSize: "0.92rem",
  lineHeight: 1.5
};

export const plateSx: SxProps<Theme> = {
  bgcolor: "var(--om-surface, #fff)",
  color: "var(--om-ink, var(--text-main))",
  width: "100%",
  minHeight: "calc(100vh - 56px)",
  boxSizing: "border-box",
  p: "28px 40px 56px",
  [`@media (max-width: ${MOBILE}px)`]: { p: "20px 16px 40px" }
};

export const plainTableSx: SxProps<Theme> = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "0.92rem",
  mt: 1.25,
  [`@media (max-width: ${MOBILE}px)`]: { fontSize: "0.82rem" },
  "& th": {
    textAlign: "left",
    color: "var(--text-muted)",
    fontWeight: 500,
    fontSize: "0.72rem",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    p: "0 12px 8px 0",
    border: 0,
    background: "transparent"
  },
  "& td": {
    p: "8px 12px 8px 0",
    borderTop: "1px solid var(--border-main)",
    color: "var(--text-main)"
  },
  "& th:last-child, & td:last-child": { textAlign: "right", pr: 0 },
  "& .amt": { fontVariantNumeric: "tabular-nums", textAlign: "right" }
};

export const overlaySx: SxProps<Theme> = {
  position: "fixed",
  inset: 0,
  bgcolor: "rgba(14, 61, 134, 0.35)",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  pt: "12vh",
  [`@media (max-width: ${MOBILE}px)`]: { pt: "8vh" },
  zIndex: 1300,
  px: 1.5
};

export const sheetSx: SxProps<Theme> = {
  width: "min(420px, calc(100% - 32px))",
  bgcolor: "#fff",
  border: "1px solid var(--border-main)",
  borderRadius: "14px",
  p: "28px",
  [`@media (max-width: ${MOBILE}px)`]: { p: "22px" },
  boxShadow: "0 30px 80px rgba(14, 61, 134, 0.18)",
  "& h2": {
    fontSize: "1.7rem",
    [`@media (max-width: ${MOBILE}px)`]: { fontSize: "1.4rem" },
    fontWeight: 500,
    letterSpacing: "-0.02em",
    mb: "6px",
    color: "var(--text-main)"
  },
  "& label": {
    display: "block",
    color: "var(--text-muted)",
    fontSize: "0.75rem",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    mt: "14px",
    mb: "6px"
  },
  "& input, & select": {
    width: "100%",
    background: "transparent",
    border: 0,
    borderBottom: "1px solid var(--border-main)",
    color: "var(--text-main)",
    font: "inherit",
    fontSize: "1.05rem",
    py: "8px",
    outline: "none",
    borderRadius: 0
  },
  "& input:focus, & select:focus": { borderBottomColor: "var(--c1)" }
};

interface VerbProps {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  role?: string;
  disabled?: boolean;
  "aria-selected"?: boolean;
  "data-testid"?: string;
}

export const Verb: React.FC<VerbProps> = ({ children, onClick, href, role, disabled, "aria-selected": selected, "data-testid": testId }) => {
  if (href) {
    return (
      <MuiLink href={href} sx={verbSx} underline="none" data-testid={testId}>
        {children}
      </MuiLink>
    );
  }
  return (
    <Box
      component="button"
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      sx={{ ...verbSx, opacity: disabled ? 0.4 : 1, cursor: disabled ? "default" : "pointer" } as object}
      role={role}
      aria-selected={selected}
      data-testid={testId}>
      {children}
    </Box>
  );
};

export const VerbRow: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <Box sx={{ ...mutedSx, mt: 1.25, display: "flex", flexWrap: "wrap", alignItems: "center" } as SxProps<Theme>}>
      {items.map((child, i) => (
        <React.Fragment key={i}>
          {i > 0 && <Box component="span" sx={{ mx: 0.75 }}>·</Box>}
          {child}
        </React.Fragment>
      ))}
    </Box>
  );
};

export const SectionTitle: React.FC<{ children: React.ReactNode; sx?: SxProps<Theme> }> = ({ children, sx }) => (
  <Box
    component="h3"
    sx={{
      fontSize: "0.72rem",
      fontWeight: 650,
      letterSpacing: "0.07em",
      textTransform: "uppercase",
      color: "var(--text-muted)",
      m: "28px 0 10px",
      ...((sx || {}) as object)
    }}>
    {children}
  </Box>
);

interface YearPillsProps {
  years: number[];
  value: number;
  onChange: (year: number) => void;
}

export const YearPills: React.FC<YearPillsProps> = ({ years, value, onChange }) => (
  <Box
    sx={{
      display: "flex",
      flexWrap: "nowrap",
      gap: "6px",
      my: 1,
      mb: 2.25,
      overflowX: "auto",
      WebkitOverflowScrolling: "touch",
      [`@media (min-width: ${MOBILE + 1}px)`]: { flexWrap: "wrap" }
    }}>
    {years.map((y) => (
      <Box
        key={y}
        component="button"
        type="button"
        data-y={y}
        data-value={y}
        onClick={() => onChange(y)}
        sx={{
          background: y === value ? "var(--c1)" : "transparent",
          color: y === value ? "#fff" : "var(--text-main)",
          border: "1px solid",
          borderColor: y === value ? "var(--c1)" : "var(--border-main)",
          font: "inherit",
          fontSize: "0.82rem",
          py: "5px",
          px: "10px",
          borderRadius: "999px",
          cursor: "pointer",
          flex: "0 0 auto"
        }}>
        {y}
      </Box>
    ))}
  </Box>
);

interface LedgerHeadProps {
  title: string;
  big?: React.ReactNode;
  meta?: React.ReactNode;
  action?: React.ReactNode;
}

export const LedgerHead: React.FC<LedgerHeadProps> = ({ title, big, meta, action }) => (
  <Box
    sx={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      mb: 1,
      flexWrap: "wrap",
      gap: 1
    }}>
    <Box>
      <SectionTitle sx={{ mt: 1 }}>{title}</SectionTitle>
      {big != null && (
        <Box sx={{ fontSize: "2.2rem", fontWeight: 500, letterSpacing: "-0.03em", color: "var(--text-main)", fontVariantNumeric: "tabular-nums", [`@media (max-width: ${MOBILE}px)`]: { fontSize: "1.7rem" } }}>
          {big}
        </Box>
      )}
      {meta && <Box sx={mutedSx}>{meta}</Box>}
    </Box>
    {action}
  </Box>
);

interface YearLedgerProps {
  title: string;
  big?: React.ReactNode;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  years: number[];
  year: number;
  onYear: (year: number) => void;
  onBack?: () => void;
  backLabel?: string;
  children: React.ReactNode;
}

export const YearLedger: React.FC<YearLedgerProps> = ({ title, big, meta, action, years, year, onYear, onBack, backLabel, children }) => (
  <Box>
    {onBack && <Verb onClick={onBack}>← {backLabel}</Verb>}
    <LedgerHead title={title} big={big} meta={meta} action={action} />
    <YearPills years={years} value={year} onChange={onYear} />
    {children}
  </Box>
);

export const donationYear = (d: DonationInterface) => {
  const raw = (d.donationDate || "2000-01-01").toString();
  return new Date(raw.split("T")[0] + "T00:00:00").getFullYear();
};

export const donationAmount = (d: DonationInterface) => d.fund?.amount || d.amount || 0;

export const yearsFromDates = (dates: Array<string | Date | undefined | null>) => {
  const set = new Set<number>();
  dates.forEach((value) => {
    if (!value) return;
    const raw = value.toString();
    const year = new Date(raw.split("T")[0] + "T00:00:00").getFullYear();
    if (!Number.isNaN(year)) set.add(year);
  });
  return Array.from(set).sort((a, b) => b - a);
};

export const withCurrentYear = (years: number[], fallback = new Date().getFullYear()) => {
  if (years.includes(fallback)) return years;
  return [fallback, ...years].sort((a, b) => b - a);
};

export const pickPlateYear = (dataYears: number[], fallback = new Date().getFullYear()) => {
  if (dataYears.includes(fallback)) return fallback;
  return dataYears[0] || fallback;
};

export const recentYears = (count = 10, fallback = new Date().getFullYear()) => Array.from({ length: count }, (_, i) => fallback - i);
