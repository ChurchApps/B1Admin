import React from "react";
import { Box, FormControlLabel, Switch, Typography } from "@mui/material";
import { Locale } from "@churchapps/apphelper";

interface Props {
  styles: any;
  onChange: (styles: any) => void;
}

export const VisibilityToggles: React.FC<Props> = (props) => {
  const isHidden = (device: "desktop" | "mobile") => props.styles?.[device]?.display === "none";

  const handleVisibilityChange = (device: "desktop" | "mobile", hidden: boolean) => {
    const styles: any = { ...(props.styles || {}) };
    const deviceStyles = { ...(styles[device] || {}) };
    if (hidden) deviceStyles.display = "none";
    else delete deviceStyles.display;
    if (Object.keys(deviceStyles).length > 0) styles[device] = deviceStyles;
    else delete styles[device];
    props.onChange(styles);
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", px: 1 }}>
      <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>{Locale.label("site.stylesAnimations.visibility")}</Typography>
      <FormControlLabel
        control={<Switch size="small" checked={isHidden("desktop")} onChange={(e) => handleVisibilityChange("desktop", e.target.checked)} data-testid="hide-on-desktop-switch" />}
        label={<Typography sx={{ fontSize: "0.85rem" }}>{Locale.label("site.stylesAnimations.hideOnDesktop")}</Typography>}
      />
      <FormControlLabel
        control={<Switch size="small" checked={isHidden("mobile")} onChange={(e) => handleVisibilityChange("mobile", e.target.checked)} data-testid="hide-on-mobile-switch" />}
        label={<Typography sx={{ fontSize: "0.85rem" }}>{Locale.label("site.stylesAnimations.hideOnMobile")}</Typography>}
      />
    </Box>
  );
};
