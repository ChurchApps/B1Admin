import React from "react";
import { IconButton, Tooltip } from "@mui/material";
import type { IconButtonProps } from "@mui/material";

type IconTone = "default" | "card" | "header";

export interface AppIconButtonProps extends Omit<IconButtonProps, "color" | "aria-label"> {
  /** Tooltip text + accessible name. Prefer a generic `common.*` label ("Edit") over a specific one ("Edit Group"). */
  label: string;
  /** MUI icon element, e.g. `<EditIcon />`. Sized to match the button automatically. */
  icon: React.ReactElement;
  /** Color by context: `default` gray (rows/inline), `card` blue (card & section headers), `header` white (blue PageHeader). */
  tone?: IconTone;
  /** Destructive actions (Delete/Remove) render error-red, overriding `tone`. */
  destructive?: boolean;
}

export const AppIconButton = React.forwardRef<HTMLButtonElement, AppIconButtonProps>(function AppIconButton(
  { label, icon, tone = "default", destructive = false, size = "small", disabled, sx, ...rest },
  ref
) {
  const color: IconButtonProps["color"] = destructive ? "error" : tone === "card" ? "primary" : tone === "header" ? "inherit" : "default";
  const toneSx = tone === "header" && !destructive ? { color: "common.white" } : null;

  const sizedIcon =
    React.isValidElement(icon) && (icon.props as { fontSize?: unknown }).fontSize === undefined
      ? React.cloneElement(icon as React.ReactElement<{ fontSize?: string }>, { fontSize: size === "small" ? "small" : "medium" })
      : icon;

  const button = (
    <IconButton ref={ref} size={size} color={color} aria-label={label} disabled={disabled} sx={[toneSx, ...(Array.isArray(sx) ? sx : [sx])]} {...rest}>
      {sizedIcon}
    </IconButton>
  );

  // Tooltip needs an enabled child to receive hover/focus events; wrap a disabled button in a span.
  return <Tooltip title={label}>{disabled ? <span style={{ display: "inline-flex" }}>{button}</span> : button}</Tooltip>;
});
