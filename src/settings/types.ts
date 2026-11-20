import type { ChurchInterface, LinkInterface } from "@churchapps/helpers";

/** A church record with the week-start and time-zone fields the church info section edits. */
export interface ChurchInfoInterface extends ChurchInterface {
  firstDayOfWeek?: number;
  timeZone?: string;
}

/**
 * A b1Tab link. The API also stores who can see the tab, its photo and, for "groups" visibility,
 * a JSON array of group ids. A null parentId moves the tab to the top level.
 */
export interface AppTabInterface extends Omit<LinkInterface, "parentId"> {
  parentId?: string | null;
  visibility?: string;
  photo?: string;
  groupIds?: string | null;
}
