/**
 * Standard responsive Grid sizes. Use with `<Grid size={GRID_SIZES.threeColumn}>`.
 * Defining presets here keeps mobile/tablet breakpoints consistent across pages.
 */
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
