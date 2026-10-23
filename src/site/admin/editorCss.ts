export const EDITOR_HOVER_CSS = `
.section.sectionWrapper .elementWrapper { position: relative; }
.section.sectionWrapper .elementWrapper:hover:not(:has(.elementWrapper:hover)) {
  outline: 1px dashed color-mix(in srgb, var(--focus) 45%, transparent);
  outline-offset: 2px;
}
.section.sectionWrapper .elementWrapper[data-el-label]:hover:not(:has(.elementWrapper:hover))::before {
  content: attr(data-el-label);
  position: absolute;
  top: 2px;
  left: 2px;
  z-index: 1000;
  padding: 1px 6px;
  border-radius: 3px;
  background: color-mix(in srgb, var(--focus) 85%, #fff);
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.5;
  font-family: Roboto, Arial, sans-serif;
  pointer-events: none;
  white-space: nowrap;
}
.sectionEditWrapper { position: relative; }
.sectionEditWrapper .sectionHoverEdge {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: color-mix(in srgb, var(--focus) 45%, transparent);
  opacity: 0;
  transition: opacity 0.15s ease;
  pointer-events: none;
  z-index: 1000;
}
.sectionEditWrapper:hover .sectionHoverEdge { opacity: 1; }
.sectionEditWrapper .sectionToolbarPill {
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}
.sectionEditWrapper:hover .sectionToolbarPill,
.sectionEditWrapper .sectionToolbarPill.pillVisible {
  opacity: 1;
  pointer-events: auto;
}
.dragActive .elementWrapper:hover { outline: none; }
.dragActive .elementWrapper[data-el-label]:hover::before { display: none; }
`;

// The Theme sets --headingFont/--bodyFont; B1App applies them via pages.css, which the editor can't import.
export const EDITOR_PAGE_FONT_CSS = `
.page { font-family: var(--bodyFont), "Roboto", sans-serif; }
.page h1, .page h2, .page h3, .page h4, .page h5, .page h6 { font-family: var(--headingFont), "Roboto", sans-serif; }
`;

// Section photo backgrounds and light text, mirrored from pages.css so the editor matches the live site.
export const EDITOR_SECTION_CSS = `
.page .sectionDark { color: var(--dark-bg-text-color, #EEEEEE); }
.page .sectionBG { background-position: 50% 50%; background-size: cover; position: relative; }
.page .sectionBG:before { content: ''; position: absolute; inset: 0; background: #000; opacity: .55; pointer-events: none; }
.page .sectionBG > .MuiContainer-root { position: relative; z-index: 1; }
`;

export const getSelectionSuppressCss = (selectedElementId: string | null): string => {
  if (!selectedElementId) return "";
  return `
.elementWrapper:has(> #el-${selectedElementId}):hover { outline: none !important; }
.elementWrapper:has(> #el-${selectedElementId}):hover::before { display: none; }
.elementWrapper.rawHTML[data-element-id="${selectedElementId}"]:hover { outline: none !important; }
.elementWrapper.rawHTML[data-element-id="${selectedElementId}"]:hover::before { display: none; }
`;
};
