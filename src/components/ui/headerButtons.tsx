import React from "react";
import { Button } from "@mui/material";
import type { ButtonProps } from "@mui/material/Button";
import { useHeaderTone } from "./headerTone";

// Header buttons are often links: `component={RouterLink} to=…` or `href` + `target`.
type HeaderButtonProps = ButtonProps & { component?: React.ElementType; to?: string; target?: string; rel?: string };

// Page-header CTA: solid primary under ui/PageHeader; white pill on the legacy blue apphelper banner.
export const HeaderPrimaryButton: React.FC<HeaderButtonProps> = ({ sx, ...props }) => {
  const tone = useHeaderTone();
  if (tone === "light") return <Button variant="contained" {...props} sx={sx} />;
  return (
    <Button
      variant="contained"
      {...props}
      sx={{
        backgroundColor: "#FFF",
        color: "var(--c1d1, #11439B)",
        fontWeight: 600,
        borderRadius: "7px",
        boxShadow: "0 1px 4px rgba(0,0,0,.22)",
        "&:hover": {
          backgroundColor: "#F0F5FD",
          boxShadow: "0 1px 4px rgba(0,0,0,.22)"
        },
        ...sx
      }}
    />
  );
};

// Secondary page-header action: outlined secondary under ui/PageHeader; white ghost on the legacy banner.
export const HeaderSecondaryButton: React.FC<HeaderButtonProps> = ({ sx, ...props }) => {
  const tone = useHeaderTone();
  if (tone === "light") return <Button variant="outlined" {...props} sx={sx} />;
  return (
    <Button
      variant="outlined"
      {...props}
      sx={{
        border: "1px solid rgba(255,255,255,.55)",
        color: "#FFF",
        backgroundColor: "transparent",
        "&:hover": {
          backgroundColor: "rgba(255,255,255,.12)",
          border: "1px solid rgba(255,255,255,.8)"
        },
        ...sx
      }}
    />
  );
};

// Low-emphasis page-header verb (Demographics, Print, Health…); the primary action stays a HeaderPrimaryButton.
export const HeaderTextButton: React.FC<HeaderButtonProps> = ({ sx, ...props }) => (
  <Button variant="text" {...props} sx={[{ fontWeight: 600, px: 1, minWidth: 0 }, ...(Array.isArray(sx) ? sx : [sx])]} />
);
