import React, { CSSProperties } from "react";
import { Box, Container, Grid } from "@mui/material";
import { AppearanceHelper } from "@churchapps/apphelper";
import { Element, YoutubeBackground } from "@churchapps/apphelper-website";
import { StyleHelper } from "@churchapps/apphelper-website";
import type { SectionInterface, GlobalStyleInterface, ElementInterface } from "../../helpers/Interfaces";

interface Props {
  church: any;
  appearance: any;
  globalStyles?: GlobalStyleInterface;
  footerSections?: SectionInterface[];
}

interface ElementRendererProps {
  element: ElementInterface;
  churchSettings: any;
  textColor: string;
}

const ElementRenderer: React.FC<ElementRendererProps> = ({ element, churchSettings, textColor }) => {
  return <Element element={element} churchSettings={churchSettings} textColor={textColor} />;
};

interface SectionProps {
  section: SectionInterface;
  first?: boolean;
  churchSettings: any;
  globalStyles: GlobalStyleInterface;
}

const SectionRenderer: React.FC<SectionProps> = ({ section, first, churchSettings, globalStyles }) => {
  const getElements = () => {
    const result: React.ReactElement[] = [];
    const textColor = StyleHelper.getTextColor(section?.textColor, globalStyles || {}, churchSettings);
    section?.elements?.forEach(e => {
      result.push(<ElementRenderer key={e.id} element={e} churchSettings={churchSettings} textColor={textColor} />);
    });
    return result;
  };

  const getStyle = (): CSSProperties => {
    let result: CSSProperties = {};
    if (section.background?.indexOf("/") > -1) {
      result = { backgroundImage: "url('" + section.background + "')" };
    } else {
      result = { background: section.background };
    }
    if (section.textColor?.startsWith("var(")) result.color = section.textColor;
    return result;
  };

  const getClassName = () => {
    let result = "section";
    if (section.background?.indexOf("/") > -1) result += " sectionBG";
    if (section.textColor === "light") result += " sectionDark";
    if (first) result += " sectionFirst";

    let hc = section.headingColor;
    if (hc) {
      hc = hc.replace("var(--", "").replace(")", "");
      result += " headings" + hc[0].toUpperCase() + hc.slice(1);
    }
    let lc = section.linkColor;
    if (lc) {
      lc = lc.replace("var(--", "").replace(")", "");
      result += " links" + lc[0].toUpperCase() + lc.slice(1);
    }
    return result;
  };

  const getVideoClassName = () => {
    let result = "sectionVideo";
    if (section.textColor === "light") result += " sectionDark";
    if (first) result += " sectionFirst";
    return result;
  };

  const getId = () => {
    let result = "section-" + section.answers?.sectionId?.toString();
    if (result === "section-undefined") result = "section-" + section.id;
    return result;
  };

  const getSectionAnchor = () => {
    if (section.answers?.sectionId) return <a id={section.answers?.sectionId} className="sectionAnchor"></a>;
    else return <></>;
  };

  const contents = <Container>{getElements()}</Container>;

  if (section.background && section.background.indexOf("youtube:") > -1) {
    const youtubeId = section.background.split(":")[1];
    return (
      <>
        {getSectionAnchor()}
        <YoutubeBackground isDragging={false} id={getId()} videoId={youtubeId} overlay="rgba(0,0,0,.4)" contentClassName={getVideoClassName()}>
          {contents}
        </YoutubeBackground>
      </>
    );
  } else {
    return (
      <>
        {getSectionAnchor()}
        <Box component="div" sx={{ ":before": { opacity: (section.answers?.backgroundOpacity) ? section.answers.backgroundOpacity + " !important" : "" } }} style={getStyle()} className={getClassName()} id={getId()}>
          {contents}
        </Box>
      </>
    );
  }
};

export function WebsiteFooter(props: Props) {
  if (props.footerSections?.length > 0) {
    return (
      <>
        {props.footerSections.map((section, index) => (
          <SectionRenderer key={section.id} section={section} first={index === 0} churchSettings={props.appearance} globalStyles={props.globalStyles || {}} />
        ))}
      </>
    );
  } else {
    const logoUrl = AppearanceHelper.getLogoDark(props.appearance, "/images/logo.png");
    const photo = <img src={logoUrl} className="img-fluid" id="el-footer-logo" alt={props.church.name} />;

    return (
      <>
        <div className="section headingsLight linksLightAccent" style={{ backgroundColor: "var(--dark)", color: "var(--light)", paddingTop: 40, paddingBottom: 40 }}>
          <Grid container spacing={2} className="container">
            <Grid item xs={12} md={6}>
              {photo}
            </Grid>
            <Grid item xs={12} md={6}>
              <h2>{props.church.name}</h2>
              <p>
                {props.church.address1}<br />
                {props.church.city && <>{props.church.city}, {props.church.state} {props.church.zip}</>}
              </p>
            </Grid>
          </Grid>
        </div>
      </>
    );
  }
}
