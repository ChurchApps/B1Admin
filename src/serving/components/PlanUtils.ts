import { PlanHelper } from "@churchapps/helpers";
import { DateHelper } from "@churchapps/apphelper";
import { type PlanItemInterface } from "../../helpers";

// Re-export lesson interfaces from @churchapps/helpers for convenience
export {
  type LessonActionInterface,
  type LessonSectionInterface,
  type LessonVenueInterface,
  type LessonInfoInterface,
  type LessonStudyInterface,
  type LessonProgramInterface,
  type LessonTreeInterface,
  type LessonActionTreeInterface,
  type VenueActionResponseInterface
} from "@churchapps/helpers";

// Re-export utility functions from PlanHelper for backwards compatibility
export const formatTime = PlanHelper.formatTime;
// PlanHelper.getSectionDuration takes the shared PlanItemInterface, whose parentId leaves out the null the Api sends for
// top-level rows (@churchapps/helpers 2.15.0). Same sum, typed with the local interface, until Packages widens it.
export const getSectionDuration = (section: PlanItemInterface) => (section.children || []).reduce((total, child) => total + (child.seconds || 0), 0);

export const formatClockTime = (startTime: Date | string | undefined, totalSecs: number): string => {
  if (!startTime) return "";
  const d = new Date(startTime);
  if (isNaN(d.getTime())) return "";
  d.setSeconds(d.getSeconds() + totalSecs);
  return d.toLocaleTimeString(DateHelper.locale, { hour: "numeric", minute: "2-digit" });
};
