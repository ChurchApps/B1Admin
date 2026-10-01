import React from "react";
import { Box, Link, Stack, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material";

export const eyebrowSx = { typography: "overline", fontWeight: 600, letterSpacing: "0.08em", color: "var(--b1-eyebrow)", m: 0 } as const;

interface HeadProps {
  id?: string;
  label: string;
  children?: React.ReactNode;
}

// Eyebrow section heading with trailing text-link verbs on the same line.
export const RecordHeading: React.FC<HeadProps> = ({ id, label, children }) => (
  <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1.5, minHeight: 24 }}>
    <Typography
      id={id}
      component="h2"
      sx={{
        ...eyebrowSx,
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--b1-tick-gap)",
        "&::before": { content: '""', width: "var(--b1-tick-width)", height: 14, borderRadius: "2px", bgcolor: "var(--b1-tick)", flexShrink: 0 }
      }}>
      {label}
    </Typography>
    {children}
  </Stack>
);

interface ActionProps {
  onClick?: () => void;
  href?: string;
  to?: string;
  disabled?: boolean;
  children: React.ReactNode;
  "aria-label"?: string;
  "data-testid"?: string;
  small?: boolean;
  component?: React.ElementType;
}

export const TextAction: React.FC<ActionProps> = ({ onClick, href, to, disabled, children, small, component, ...rest }) => {
  const sx: SxProps<Theme> = {
    typography: small ? "body2" : "body1",
    fontWeight: 600,
    border: 0,
    p: 0,
    bgcolor: "transparent",
    cursor: disabled ? "default" : "pointer",
    color: disabled ? "text.disabled" : "var(--b1-link)",
    fontFamily: "inherit",
    verticalAlign: "baseline"
  };
  if (href) return <Link href={href} underline="hover" sx={sx} {...rest}>{children}</Link>;
  if (to && component) return <Link component={component} to={to} underline="hover" sx={sx} {...rest}>{children}</Link>;
  return (
    <Link component="button" type="button" underline="hover" onClick={disabled ? undefined : onClick} aria-disabled={disabled || undefined} sx={sx} {...rest}>
      {children}
    </Link>
  );
};

// Text links separated by middots; falsy children are dropped.
export const VerbRow: React.FC<{ children: React.ReactNode; sx?: SxProps<Theme>; plain?: boolean }> = ({ children, sx, plain }) => {
  const items = React.Children.toArray(children).filter(Boolean);
  if (items.length === 0) return null;
  return (
    <Box sx={[{ display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: plain ? 2 : 1, rowGap: 0.5, color: "text.secondary", typography: "body2" }, ...(Array.isArray(sx) ? sx : [sx])]}>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && !plain && <span aria-hidden>·</span>}
          {item}
        </React.Fragment>
      ))}
    </Box>
  );
};

type PillTone = "primary" | "neutral" | "warning";

const pillTone: Record<PillTone, object> = {
  primary: { bgcolor: "var(--b1-pill-bg)", color: "var(--b1-pill-fg)", borderColor: "var(--b1-pill-border)" },
  neutral: { borderColor: "var(--b1-border)", color: "text.secondary", bgcolor: "transparent" },
  warning: { borderColor: "transparent", color: "var(--b1-on-chip-alt)", bgcolor: "var(--b1-chip-alt)" }
};

export const Pill: React.FC<{ tone?: PillTone; children: React.ReactNode; title?: string; "data-testid"?: string }> = ({ tone = "neutral", children, ...rest }) => (
  <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, border: 1, borderRadius: "var(--b1-radius-pill)", px: 1.5, py: 0.25, typography: "body2", maxWidth: "100%", overflowWrap: "anywhere", ...pillTone[tone] }} {...rest}>
    {children}
  </Box>
);

export const srOnlySx = { position: "absolute", width: "1px", height: "1px", p: 0, m: "-1px", overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0 } as const;
