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
  type VenueActionResponseInterface,
} from "@churchapps/helpers";

/**
 * Format seconds as "m:ss" time string
 */
export const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return minutes + ":" + (secs < 10 ? "0" : "") + secs;
};

/**
 * Calculate total duration of a section by summing children's seconds
 */
export const getSectionDuration = (section: PlanItemInterface): number => {
  let totalSeconds = 0;
  section.children?.forEach((child) => {
    if (child.seconds) {
      totalSeconds += child.seconds;
    }
  });
  return totalSeconds;
};
