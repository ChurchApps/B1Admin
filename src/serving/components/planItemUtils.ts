import { type InstructionItem } from "@churchapps/content-provider-helper";
import { type PlanItemInterface } from "../../helpers";

/**
 * Recursively searches an instruction tree for a thumbnail.
 * Returns the first thumbnail found in the item or its descendants.
 */
export function findThumbnailRecursive(item: InstructionItem): string | undefined {
  if (item.thumbnail) return item.thumbnail;
  if (item.children) {
    for (const child of item.children) {
      const found = findThumbnailRecursive(child);
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * Safely calculates the next sort value for children.
 * Handles undefined/null children arrays without producing NaN.
 */
export function getNextChildSort(children: PlanItemInterface[] | undefined | null): number {
  return (children?.length ?? 0) + 1;
}

/**
 * Plan item type constants and documentation.
 *
 * ITEM TYPE MAPPINGS:
 *
 * Current (provider-based):
 * - "header"              - Top-level section header in a plan
 * - "item"                - Generic custom item
 * - "arrangementKey"      - Song with arrangement/key info
 * - "providerSection"     - Section from content provider (has children)
 * - "providerPresentation"- Action/slide from provider (leaf node)
 * - "providerFile"        - Downloadable file from provider
 *
 * Legacy (Lessons.church specific - maintain for backwards compatibility):
 * - "lessonSection"       -> maps to "providerSection"
 * - "lessonAction"        -> maps to "providerPresentation"
 * - "lessonAddOn"         -> maps to "providerFile"
 * - "section"             -> maps to "providerSection"
 * - "action"              -> maps to "providerPresentation"
 * - "addon"               -> maps to "providerFile"
 * - "song"                -> maps to "arrangementKey"
 * - "file"                -> maps to "providerFile"
 */
export const ITEM_TYPES = {
  // Current types
  HEADER: "header",
  ITEM: "item",
  ARRANGEMENT_KEY: "arrangementKey",
  PROVIDER_SECTION: "providerSection",
  PROVIDER_PRESENTATION: "providerPresentation",
  PROVIDER_FILE: "providerFile",

  // Legacy types (for reference)
  LEGACY: {
    LESSON_SECTION: "lessonSection",
    LESSON_ACTION: "lessonAction",
    LESSON_ADDON: "lessonAddOn",
    SECTION: "section",
    ACTION: "action",
    ADDON: "addon",
    SONG: "song",
    FILE: "file",
  }
} as const;

// Types that should show label field in edit dialog
const LABEL_TYPES = new Set([
  "header", "item",
  "lessonAction", "lessonSection", "lessonAddOn",
  "action", "section", "addon",
  "providerPresentation", "providerSection", "providerFile"
]);

// Types that should show description field in edit dialog
const DESC_TYPES = new Set([
  "item",
  "lessonAction", "lessonSection", "lessonAddOn",
  "action", "section", "addon",
  "providerPresentation", "providerSection", "providerFile"
]);

// Types that should show duration field in edit dialog
const DURATION_TYPES = new Set([
  "item",
  "lessonAction", "lessonSection",
  "action", "section",
  "providerPresentation", "providerSection"
]);

/**
 * Item types that should show label in edit dialog.
 */
export function shouldShowLabel(itemType: string | undefined, hasRelatedId: boolean): boolean {
  if (!itemType) return false;
  return LABEL_TYPES.has(itemType) || (itemType === "arrangementKey" && hasRelatedId);
}

/**
 * Item types that should show description in edit dialog.
 */
export function shouldShowDescription(itemType: string | undefined, hasRelatedId: boolean): boolean {
  if (!itemType) return false;
  return DESC_TYPES.has(itemType) || (itemType === "arrangementKey" && hasRelatedId);
}

/**
 * Item types that should show duration in edit dialog.
 */
export function shouldShowDuration(itemType: string | undefined, hasRelatedId: boolean): boolean {
  if (!itemType) return false;
  return DURATION_TYPES.has(itemType) || (itemType === "arrangementKey" && hasRelatedId);
}

/**
 * Checks if an item type represents a section (has children).
 */
export function isSectionType(itemType: string | undefined): boolean {
  return ["providerSection", "lessonSection", "section"].includes(itemType || "");
}

/**
 * Checks if an item type represents a presentation/action (leaf).
 */
export function isPresentationType(itemType: string | undefined): boolean {
  return ["providerPresentation", "lessonAction", "action"].includes(itemType || "");
}

/**
 * Checks if an item type represents a file/add-on.
 */
export function isFileType(itemType: string | undefined): boolean {
  return ["providerFile", "lessonAddOn", "addon", "file"].includes(itemType || "");
}

/**
 * Checks if an item type represents a song/music item.
 */
export function isSongType(itemType: string | undefined): boolean {
  return ["song", "arrangementKey"].includes(itemType || "");
}
