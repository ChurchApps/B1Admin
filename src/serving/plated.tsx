import React from "react";
import { Box, type BoxProps } from "@mui/material";
import { Link } from "react-router-dom";

const ink = "var(--text-main)";
const mute = "var(--text-muted)";
const line = "var(--border-main)";
const accent = "var(--link)";
const surface = "var(--bg-card)";
const lift = "var(--bg-sub)";
const here = "var(--success, #2e7d32)";
const first = "var(--warning, #ed6c02)";

export const platedColor = { ink, mute, line, accent, surface, lift, here, first };

const verbSx = {
  background: "none",
  border: 0,
  padding: 0,
  font: "inherit",
  fontSize: "0.88rem",
  fontWeight: 600,
  color: accent,
  cursor: "pointer",
  textDecoration: "none",
  "&:hover": { textDecoration: "underline" },
  "&:disabled": { color: mute, cursor: "default", textDecoration: "none" }
} as const;

export function DirectoryPage({ title, lede, children }: { title: string; lede?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <Box
      sx={{
        width: "100%",
        margin: 0,
        background: surface,
        padding: { xs: "24px 16px 80px", sm: "32px 40px 80px" },
        minHeight: "calc(100vh - 56px)",
        boxSizing: "border-box",
        "@media (max-width: 640px)": { width: "100%", padding: "24px 16px 80px" }
      }}>
      <Box component="h1" sx={{ m: 0, fontSize: { xs: "1.8rem", sm: "2.5rem" }, fontWeight: 500, letterSpacing: "-0.03em", color: ink, lineHeight: 1.08 }}>
        {title}
      </Box>
      {lede && (
        <Box sx={{ color: mute, mt: "8px", mb: "28px", fontSize: "0.95rem" }}>{lede}</Box>
      )}
      {children}
    </Box>
  );
}

export function PlatedRecord({ who, rest }: { who: React.ReactNode; rest: React.ReactNode }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "minmax(280px, 0.9fr) minmax(0, 1.3fr)" },
        background: surface,
        minHeight: "calc(100vh - 56px)",
        "@media (max-width: 640px)": { gridTemplateColumns: "1fr" }
      }}>
      <Box
        sx={{
          padding: { xs: "20px 16px 40px", sm: "36px 36px 72px" },
          borderRight: { md: `1px solid ${line}` },
          borderBottom: { xs: `1px solid ${line}`, md: 0 },
          position: "relative",
          "&::before": {
            content: '""',
            position: "absolute",
            left: 0,
            top: { xs: "20px", sm: "36px" },
            bottom: { xs: "40px", sm: "72px" },
            width: "2px",
            background: accent
          }
        }}>
        {who}
      </Box>
      <Box sx={{ padding: { xs: "20px 16px 40px", sm: "36px 40px 80px" }, display: "grid", gap: "26px", alignContent: "start" }}>
        {rest}
      </Box>
    </Box>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ color: accent, fontSize: "0.8rem", fontWeight: 600, letterSpacing: "0.02em", mb: "10px" }}>
      {children}
    </Box>
  );
}

export function RecordTitle({ children }: { children: React.ReactNode }) {
  return (
    <Box component="h1" sx={{ m: 0, fontSize: { xs: "1.55rem", sm: "2.4rem" }, fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1.05, color: ink }}>
      {children}
    </Box>
  );
}

export function Facts({ children }: { children: React.ReactNode }) {
  return <Box sx={{ color: mute, mt: "8px", mb: "12px", fontSize: "0.95rem", lineHeight: 1.55 }}>{children}</Box>;
}

export function SectionLabel({ children, sx, role }: { children: React.ReactNode; sx?: BoxProps["sx"]; role?: React.AriaRole }) {
  return (
    <Box component="h3" role={role} sx={{ fontSize: "0.72rem", fontWeight: 650, letterSpacing: "0.07em", textTransform: "uppercase", color: mute, m: "28px 0 10px", ...sx }}>
      {children}
    </Box>
  );
}

export function Verbs({ children }: { children: React.ReactNode }) {
  return <Box sx={{ display: "flex", gap: "14px", flexWrap: "wrap", my: "16px" }}>{children}</Box>;
}

export function Verb({ children, onClick, to, disabled, testId }: { children: React.ReactNode; onClick?: (e: React.MouseEvent<HTMLElement>) => void; to?: string; disabled?: boolean; testId?: string }) {
  if (to) {
    return (
      <Box component={Link} to={to} data-testid={testId} sx={verbSx}>
        {children}
      </Box>
    );
  }
  return (
    <Box component="button" type="button" onClick={onClick} disabled={disabled} data-testid={testId} sx={verbSx}>
      {children}
    </Box>
  );
}

export function ListPills({ children, tablist }: { children: React.ReactNode; tablist?: boolean }) {
  return (
    <Box
      role={tablist ? "tablist" : undefined}
      sx={{
        display: "flex",
        gap: "8px",
        flexWrap: { xs: "nowrap", sm: "wrap" },
        overflowX: { xs: "auto", sm: "visible" },
        mb: "22px",
        "@media (max-width: 640px)": { flexWrap: "nowrap", overflowX: "auto", WebkitOverflowScrolling: "touch" }
      }}>
      {children}
    </Box>
  );
}

export function Pill({ on, children, onClick, testId, tab }: { on?: boolean; children: React.ReactNode; onClick?: () => void; testId?: string; tab?: boolean }) {
  return (
    <Box
      component="button"
      type="button"
      role={tab ? "tab" : undefined}
      aria-selected={tab ? !!on : undefined}
      onClick={onClick}
      data-testid={testId}
      sx={{
        background: on ? ink : "transparent",
        color: on ? surface : ink,
        border: `1px solid ${line}`,
        font: "inherit",
        fontSize: "0.88rem",
        fontWeight: 500,
        padding: "7px 14px",
        borderRadius: "999px",
        cursor: "pointer",
        whiteSpace: "nowrap",
        flexShrink: 0
      }}>
      {children}
    </Box>
  );
}

export function FindField({ value, onChange, placeholder, autoFocus }: { value: string; onChange: (v: string) => void; placeholder: string; autoFocus?: boolean }) {
  return (
    <Box
      component="input"
      value={value}
      autoFocus={autoFocus}
      placeholder={placeholder}
      aria-label={placeholder}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      sx={{
        width: "100%",
        background: "transparent",
        border: 0,
        borderBottom: `1px solid ${line}`,
        color: ink,
        font: "inherit",
        fontSize: { xs: "1.25rem", sm: "1.5rem" },
        padding: "6px 0 12px",
        outline: "none",
        "&:focus": { borderBottomColor: accent },
        "&::placeholder": { color: mute }
      }}
    />
  );
}

export function DirRow({ to, onClick, name, meta, mark, markKind, children }: { to?: string; onClick?: () => void; name: React.ReactNode; meta?: React.ReactNode; mark?: React.ReactNode; markKind?: "here" | "first"; children?: React.ReactNode }) {
  const markColor = markKind === "here" ? here : markKind === "first" ? first : mute;
  const inner = (
    <>
      <Box>
        <Box sx={{ fontSize: "1.12rem", fontWeight: 650, color: ink }}>{name}</Box>
        {meta && <Box sx={{ color: mute, fontSize: "0.9rem", mt: "2px" }}>{meta}</Box>}
        {children}
      </Box>
      {mark != null && (
        <Box sx={{ color: markColor, fontSize: "0.88rem", textAlign: { xs: "left", sm: "right" } }}>{mark}</Box>
      )}
    </>
  );
  const sx = {
    display: "grid",
    gridTemplateColumns: { xs: "1fr", sm: mark != null ? "1fr auto" : "1fr" },
    gap: "8px 18px",
    alignItems: "center",
    padding: "11px 0",
    borderTop: `1px solid ${line}`,
    textDecoration: "none",
    color: "inherit",
    background: "none",
    width: "100%",
    textAlign: "left" as const,
    cursor: to || onClick ? "pointer" : "default",
    font: "inherit",
    "&:hover .plated-name": { color: accent }
  };
  if (to) {
    return (
      <Box component={Link} to={to} sx={sx}>
        {inner}
      </Box>
    );
  }
  if (onClick) {
    return (
      <Box component="button" type="button" onClick={onClick} sx={sx}>
        {inner}
      </Box>
    );
  }
  return <Box sx={sx}>{inner}</Box>;
}

export function ServingPerson({ name, role, onClick }: { name: React.ReactNode; role?: React.ReactNode; onClick?: () => void }) {
  return (
    <Box
      component={onClick ? "button" : "div"}
      type={onClick ? "button" : undefined}
      onClick={onClick}
      sx={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: "12px",
        padding: "8px 0",
        borderBottom: `1px solid ${line}`,
        fontSize: "0.98rem",
        background: "none",
        border: 0,
        borderBottomWidth: 1,
        borderBottomStyle: "solid",
        borderBottomColor: line,
        width: "100%",
        textAlign: "left",
        font: "inherit",
        color: ink,
        cursor: onClick ? "pointer" : "default"
      }}>
      <Box>{name}</Box>
      {role != null && <Box sx={{ color: mute }}>{role}</Box>}
    </Box>
  );
}

export function AddBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mt: "36px", pt: "24px", borderTop: `1px solid ${line}` }}>
      <Box component="h2" sx={{ m: 0, mb: "12px", fontSize: "1.4rem", fontWeight: 500, color: ink }}>
        {title}
      </Box>
      {children}
    </Box>
  );
}

export function BulkBar({ count, names, children, testId }: { count: number; names?: string; children: React.ReactNode; testId?: string }) {
  if (count < 1) return null;
  return (
    <Box
      data-testid={testId}
      sx={{
        position: "sticky",
        bottom: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
        flexWrap: "wrap",
        background: lift,
        border: `1px solid ${line}`,
        borderRadius: "12px",
        padding: "12px 16px",
        mt: "28px"
      }}>
      <Box>
        <Box component="b" sx={{ fontWeight: 650, color: ink }}>{count} selected</Box>
        {names && <Box component="span" sx={{ color: mute, fontSize: "0.88rem", ml: 1 }}>· {names}</Box>}
      </Box>
      <Box sx={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>{children}</Box>
    </Box>
  );
}

export function OrderList({ children }: { children: React.ReactNode }) {
  return <Box component="ol" sx={{ listStyle: "none", p: 0, m: 0, display: "grid" }}>{children}</Box>;
}

export function Dl({ children }: { children: React.ReactNode }) {
  return (
    <Box
      component="dl"
      sx={{
        display: "grid",
        gridTemplateColumns: "7.5rem 1fr",
        gap: "6px 12px",
        fontSize: "0.9rem",
        m: 0,
        "& dt": { color: mute, m: 0 },
        "& dd": { m: 0, color: ink }
      }}>
      {children}
    </Box>
  );
}
