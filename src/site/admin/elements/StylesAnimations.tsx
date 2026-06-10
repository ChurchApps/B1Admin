import type { AnimationsInterface, InlineStylesInterface } from "../../../helpers";
import React from "react";
import { StyleList } from "./StyleList";
import { AnimationsEdit } from "./AnimationsEdit";
import { Accordion, AccordionSummary, Typography, AccordionDetails, Icon, Box, FormControlLabel, Switch } from "@mui/material";
import { Locale } from "@churchapps/apphelper";

interface Props {
  fields: string[],
  styles: InlineStylesInterface,
  animations: AnimationsInterface,
  onStylesChange: (styles: any) => void;
  onAnimationsChange: (animations: AnimationsInterface | null) => void;
}

export const StylesAnimations: React.FC<Props> = (props) => {
  //const [showStyles, setShowStyles] = React.useState(props.styles && Object.keys(props.styles).length > 0);
  //const [showAnimations, setShowAnimations] = React.useState(props.animations && Object.keys(props.animations).length > 0);
  const [expanded, setExpanded] = React.useState<string | false>("");
  /*

    <div style={{marginTop:10}}>
      <a href="about:blank" onClick={(e) => {e.preventDefault(); setShowStyles(!showStyles)}}>{showStyles ? "Hide" : "Show"} Styles</a>
    &nbsp; | &nbsp;
      <a href="about:blank" onClick={(e) => {e.preventDefault(); setShowAnimations(!showAnimations)}}>{showAnimations ? "Hide" : "Show"} Animation</a>
    </div>
*/
  const isHidden = (device: "desktop" | "mobile") => (props.styles as any)?.[device]?.display === "none";

  const handleVisibilityChange = (device: "desktop" | "mobile", hidden: boolean) => {
    const styles: any = { ...(props.styles || {}) };
    const deviceStyles = { ...(styles[device] || {}) };
    if (hidden) deviceStyles.display = "none";
    else delete deviceStyles.display;
    if (Object.keys(deviceStyles).length > 0) styles[device] = deviceStyles;
    else delete styles[device];
    props.onStylesChange(styles);
  };

  return <>
    <Box sx={{ backgroundColor: "background.subtle", padding: "10px", marginBottom: "10px" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, paddingLeft: "16px", paddingBottom: "6px", flexWrap: "wrap" }}>
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
      <Accordion expanded={expanded === "styles"} onChange={() => setExpanded((expanded === "styles") ? "" : "styles")}>
        <AccordionSummary expandIcon={<Icon>expand_more</Icon>}>
          <Typography sx={{ width: "33%", flexShrink: 0 }}>{Locale.label("site.stylesAnimations.styles")}</Typography>
          <Typography sx={{ color: "text.secondary" }}>{Locale.label("site.stylesAnimations.stylesDesc")}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <StyleList fields={props.fields} styles={props.styles} onChange={props.onStylesChange} />
        </AccordionDetails>
      </Accordion>

      <Accordion expanded={expanded === "animations"} onChange={() => setExpanded("animations")}>
        <AccordionSummary expandIcon={<Icon>expand_more</Icon>}>
          <Typography sx={{ width: "33%", flexShrink: 0 }}>{Locale.label("site.stylesAnimations.animations")}</Typography>
          <Typography sx={{ color: "text.secondary" }}>{Locale.label("site.stylesAnimations.animationsDesc")}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <AnimationsEdit animations={props.animations} onSave={(animations) => { setExpanded(""); props.onAnimationsChange(animations); }} />
        </AccordionDetails>
      </Accordion>

    </Box>
  </>;

};
