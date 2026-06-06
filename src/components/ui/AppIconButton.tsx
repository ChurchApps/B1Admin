import React from "react";
import { IconButton, Tooltip } from "@mui/material";
import type { IconButtonProps } from "@mui/material";

type IconTone = "default" | "card" | "header";
type IconIntent = "add" | "remove";

export interface AppIconButtonProps extends Omit<IconButtonProps, "color" | "aria-label"> {
  /** Tooltip text + accessible name. Prefer a generic `common.*` label ("Edit") over a specific one ("Edit Group"). */
  label: string;
  /** MUI icon element, e.g. `<EditIcon />`. Sized to match the button automatically. */
  icon: React.ReactElement;
  /** Color by context: `default` gray (rows/inline), `card` blue (card & section headers), `header` white (blue PageHeader). Delete/Remove follow tone too — red is reserved for the confirm button inside a delete dialog. */
  tone?: IconTone;
  /** Hover-color cue: `add` → green, `remove` → red. Otherwise the icon hovers blue (white-on-header stays white). Resting color is always set by `tone`. */
  intent?: IconIntent;
}

export const AppIconButton = React.forwardRef<HTMLButtonElement, AppIconButtonProps>(function AppIconButton(
  { label, icon, tone = "default", intent, size = "small", disabled, sx, ...rest },
  ref
) {
  const color: IconButtonProps["color"] = tone === "card" ? "primary" : tone === "header" ? "inherit" : "default";
  const hoverColor = intent === "add" ? "success.main" : intent === "remove" ? "error.main" : tone === "header" ? undefined : "primary.main";
  const baseSx = {
    ...(tone === "header" ? { color: "common.white" } : {}),
    ...(hoverColor ? { "&:hover": { color: hoverColor } } : {}),
  };

  const sizedIcon =
    React.isValidElement(icon) && (icon.props as { fontSize?: unknown }).fontSize === undefined
      ? React.cloneElement(icon as React.ReactElement<{ fontSize?: string }>, { fontSize: size === "small" ? "small" : "medium" })
      : icon;

  const button = (
    <IconButton ref={ref} size={size} color={color} aria-label={label} disabled={disabled} sx={[baseSx, ...(Array.isArray(sx) ? sx : [sx])]} {...rest}>
      {sizedIcon}
    </IconButton>
  );

  // Tooltip needs an enabled child to receive hover/focus events; wrap a disabled button in a span.
  return <Tooltip title={label}>{disabled ? <span style={{ display: "inline-flex" }}>{button}</span> : button}</Tooltip>;
});
