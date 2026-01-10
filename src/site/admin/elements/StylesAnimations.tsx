import type { AnimationsInterface, InlineStylesInterface } from "../../../helpers";
import React from "react";
import { StyleList } from "./StyleList";
import { AnimationsEdit } from "./AnimationsEdit";
import { Accordion, AccordionSummary, Typography, AccordionDetails, Icon } from "@mui/material";

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
  return <>
    <div style={{ backgroundColor: "var(--bg-sub)", padding: 10, marginBottom: 10 }}>
      <Accordion expanded={expanded === "styles"} onChange={() => setExpanded((expanded === "styles") ? "" : "styles")}>
        <AccordionSummary expandIcon={<Icon>expand_more</Icon>}>
          <Typography sx={{ width: "33%", flexShrink: 0 }}>Styles</Typography>
          <Typography sx={{ color: "text.secondary" }}>Advanced appearance options.</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <StyleList fields={props.fields} styles={props.styles} onChange={props.onStylesChange} />
        </AccordionDetails>
      </Accordion>

      <Accordion expanded={expanded === "animations"} onChange={() => setExpanded("animations")}>
        <AccordionSummary expandIcon={<Icon>expand_more</Icon>}>
          <Typography sx={{ width: "33%", flexShrink: 0 }}>Animations</Typography>
          <Typography sx={{ color: "text.secondary" }}>Effect for when element is shown.</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <AnimationsEdit animations={props.animations} onSave={(animations) => { setExpanded(""); props.onAnimationsChange(animations); }} />
        </AccordionDetails>
      </Accordion>

    </div>
  </>;

};
