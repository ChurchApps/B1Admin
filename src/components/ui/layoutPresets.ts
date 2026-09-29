/** Standard responsive Grid sizes for consistent mobile/tablet/desktop breakpoints. Use with `<Grid size={GRID_SIZES.threeColumn}>`. */
export const GRID_SIZES = {
  /** 1-up mobile, 2-up tablet, 3-up desktop. Cards, feature lists. */
  threeColumn: { xs: 12, sm: 6, md: 4 },
  /** 1-up mobile, 2-up desktop. Forms, side-by-side comparisons. */
  twoColumn: { xs: 12, md: 6 },
  /** 1-up mobile, 4-up desktop. Stat tiles, dense card grids. */
  fourColumn: { xs: 12, sm: 6, md: 3 },
  /** Sidebar (1/3) + main (2/3) — pair with `mainContent`. */
  sidebar: { xs: 12, md: 4 },
  /** Main content (2/3) — pair with `sidebar`. */
  mainContent: { xs: 12, md: 8 }
} as const;

/** Recipe B record/profile: 304px identity column (280px medium) + flexible detail stack; stacks on small screens. */
export const profileLayoutSx = {
  display: "grid",
  gridTemplateColumns: { xs: "minmax(0,1fr)", md: "280px minmax(0,1fr)", lg: "304px minmax(0,1fr)" },
  gap: 3,
  alignItems: "start"
} as const;

/** Recipe D: readable single-column form width. */
export const formWidthSx = { maxWidth: 640 } as const;
