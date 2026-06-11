import React from "react";
import { TemplateMiniRender } from "./TemplateMiniRender";
import { getSectionDefs, type SiteTemplatePageDef } from "./siteTemplates";

interface Props {
  page: SiteTemplatePageDef;
  navLabels?: string[];
  churchName?: string;
  maxHeight?: number;
}

export const SiteTemplatePreview: React.FC<Props> = ({ page, navLabels, churchName, maxHeight = 240 }) => (
  <TemplateMiniRender sections={getSectionDefs(page.sections)} navLabels={navLabels} churchName={churchName} maxHeight={maxHeight} />
);
