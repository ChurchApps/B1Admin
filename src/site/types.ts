// Shared types for the website editor (site/).

// Public church settings (key -> value), as returned by /settings/public and passed through to apphelper website components.
export type ChurchSettings = Record<string, string>;

// Answers for a "row" element (comma-separated column sizes and mobile overrides).
export type RowAnswers = {
  columns?: string;
  mobileSizes?: string;
  mobileOrder?: string;
};

// Item carried by react-dnd drags in the website editor (see DraggableIcon and the palette sources).
export type SiteDropItem<T> = {
  elementType?: string;
  blockId?: string;
  data?: T;
};
