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

export const getSelectionSuppressCss = (selectedElementId: string | null): string => {
  if (!selectedElementId) return "";
  return `
.elementWrapper:has(> #el-${selectedElementId}):hover { outline: none !important; }
.elementWrapper:has(> #el-${selectedElementId}):hover::before { display: none; }
.elementWrapper.rawHTML[data-element-id="${selectedElementId}"]:hover { outline: none !important; }
.elementWrapper.rawHTML[data-element-id="${selectedElementId}"]:hover::before { display: none; }
`;
};
