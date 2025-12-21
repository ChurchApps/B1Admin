import { type PlanItemInterface } from "../../helpers";

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

// Shared interfaces for lesson tree structures
export interface ActionInterface {
  id: string;
  name: string;
  actionType: string;
  roleName?: string;
  seconds?: number;
}

export interface SectionInterface {
  id: string;
  name: string;
  actions?: ActionInterface[];
}

export interface VenueInterface {
  id: string;
  name: string;
  sections?: SectionInterface[];
}

export interface LessonInterface {
  id: string;
  name: string;
  venues?: VenueInterface[];
}

export interface StudyInterface {
  id: string;
  name: string;
  lessons?: LessonInterface[];
}

export interface ProgramInterface {
  id: string;
  name: string;
  studies?: StudyInterface[];
}

export interface LessonTreeInterface {
  programs?: ProgramInterface[];
}

export interface VenueActionsInterface {
  venueName?: string;
  sections?: SectionInterface[];
}

export interface ActionTreeInterface {
  programs?: Array<ProgramInterface & {
    studies?: Array<StudyInterface & {
      lessons?: Array<LessonInterface & {
        venues?: Array<VenueInterface>;
      }>;
    }>;
  }>;
}
