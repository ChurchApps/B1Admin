import React from "react";
import { TemplateMiniRender, type MiniPalette } from "./TemplateMiniRender";
import { getSectionDefs, type SiteTemplatePageDef } from "./siteTemplates";

interface Props {
  page: SiteTemplatePageDef;
  navLabels?: string[];
  churchName?: string;
  maxHeight?: number;
  palette?: MiniPalette;
}

export const SiteTemplatePreview: React.FC<Props> = ({ page, navLabels, churchName, maxHeight = 240, palette }) => (
  <TemplateMiniRender sections={getSectionDefs(page.sections)} navLabels={navLabels} churchName={churchName} maxHeight={maxHeight} palette={palette} />
);
