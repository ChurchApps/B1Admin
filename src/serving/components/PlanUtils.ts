import { PlanHelper } from "@churchapps/helpers";

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
export const getSectionDuration = PlanHelper.getSectionDuration;
