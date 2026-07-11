import { type InstructionItem } from "@churchapps/content-providers";
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

/** Handles undefined/null children arrays to avoid NaN. */
export function getNextChildSort(children: PlanItemInterface[] | undefined | null): number {
  return (children?.length ?? 0) + 1;
}

/** Fresh media info for a provider item, fetched per page load (provider links can expire). */
export interface ProviderMediaInfo {
  url: string;
  mediaType?: "video" | "image";
  seconds?: number;
}

/** Returns the first descendant (or the item itself) that carries a downloadUrl. */
export function findFileRecursive(item: InstructionItem): InstructionItem | undefined {
  if (item.downloadUrl) return item;
  if (item.children) {
    for (const child of item.children) {
      const found = findFileRecursive(child);
      if (found) return found;
    }
  }
  return undefined;
}

/** Match a plan item to its fresh provider media by content path, falling back to label. */
export function matchProviderMedia(planItem: PlanItemInterface, lookup?: Record<string, ProviderMediaInfo>): ProviderMediaInfo | undefined {
  if (!lookup) return undefined;
  if (planItem.providerContentPath && lookup[planItem.providerContentPath]) return lookup[planItem.providerContentPath];
  if (planItem.label && lookup["label:" + planItem.label]) return lookup["label:" + planItem.label];
  return undefined;
}

const VIDEO_EXT_PATTERN = /\.(mp4|webm|mov|m4v|avi|mkv)\s*(\?|#|$)/i;

/** Planning estimate for images. Stored seconds stay 0 so playback (FreePlay) leaves the
 * volunteer in control; this value is display/schedule-math only. */
export const ESTIMATED_IMAGE_SECONDS = 300;

/** Effective seconds for schedule math: stored value, else the image planning estimate. */
export function estimateSeconds(planItem: PlanItemInterface, lookup?: Record<string, ProviderMediaInfo>): number {
  if (planItem.seconds && planItem.seconds > 0) return planItem.seconds;
  if (planItem.itemType === "header") return 0;
  const media = matchProviderMedia(planItem, lookup);
  if (media && !isVideoMedia(planItem.label, media)) return ESTIMATED_IMAGE_SECONDS;
  return 0;
}

/** Older provider versions omit mediaType, so also sniff the file extension from the label/url. */
export function isVideoMedia(label: string | undefined, media: ProviderMediaInfo): boolean {
  return media.mediaType === "video" || VIDEO_EXT_PATTERN.test(label || "") || VIDEO_EXT_PATTERN.test(media.url.split("?")[0]);
}

/** Reads a video's duration (seconds) by loading just its metadata. Resolves null on error/timeout. */
export function getVideoDuration(url: string, timeoutMs = 15000): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    let settled = false;
    const done = (value: number | null) => {
      if (settled) return;
      settled = true;
      video.removeAttribute("src");
      video.load();
      resolve(value);
    };
    const timer = setTimeout(() => done(null), timeoutMs);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      clearTimeout(timer);
      done(Number.isFinite(video.duration) && video.duration > 0 ? video.duration : null);
    };
    video.onerror = () => {
      clearTimeout(timer);
      done(null);
    };
    video.src = url;
  });
}

/**
 * Builds a lookup of fresh media urls from a provider instructions tree.
 * Keys: dot-notation content paths ("0.2.1", matching providerContentPath on saved
 * plan items) plus "label:<label>" fallbacks for items saved before paths existed.
 */
export function buildProviderMediaLookup(items: InstructionItem[]): Record<string, ProviderMediaInfo> {
  const lookup: Record<string, ProviderMediaInfo> = {};
  const walk = (list: InstructionItem[], indices: number[]) => {
    list.forEach((item, i) => {
      const path = [...indices, i];
      const file = findFileRecursive(item);
      if (file?.downloadUrl) {
        const info: ProviderMediaInfo = { url: file.downloadUrl, mediaType: file.mediaType, seconds: file.seconds ?? item.seconds };
        lookup[path.join(".")] = info;
        if (item.label && !lookup["label:" + item.label]) lookup["label:" + item.label] = info;
      }
      if (item.children) walk(item.children, path);
    });
  };
  walk(items, []);
  return lookup;
}

/** Item types: reads accept legacy aliases; writes emit current types only.
 * Mappings: lessonSection/section→providerSection, lessonAction/action→providerPresentation, lessonAddOn/addon/file→providerFile, song→arrangementKey. */
export const ITEM_TYPES = {
  // Current types
  HEADER: "header",
  ITEM: "item",
  ARRANGEMENT_KEY: "arrangementKey",
  PROVIDER_SECTION: "providerSection",
  PROVIDER_PRESENTATION: "providerPresentation",
  PROVIDER_FILE: "providerFile",

  LEGACY: {
    LESSON_SECTION: "lessonSection",
    LESSON_ACTION: "lessonAction",
    LESSON_ADDON: "lessonAddOn",
    SECTION: "section",
    ACTION: "action",
    ADDON: "addon",
    SONG: "song",
    FILE: "file"
  }
} as const;

const LABEL_TYPES = new Set([
  "header",
  "item",
  "lessonAction",
  "lessonSection",
  "lessonAddOn",
  "action",
  "section",
  "addon",
  "providerPresentation",
  "providerSection",
  "providerFile"
]);

const DESC_TYPES = new Set([
  "item",
  "lessonAction",
  "lessonSection",
  "lessonAddOn",
  "action",
  "section",
  "addon",
  "providerPresentation",
  "providerSection",
  "providerFile"
]);

const DURATION_TYPES = new Set([
  "item",
  "lessonAction",
  "lessonSection",
  "action",
  "section",
  "providerPresentation",
  "providerSection"
]);

export function shouldShowLabel(itemType: string | undefined, hasRelatedId: boolean): boolean {
  if (!itemType) return false;
  return LABEL_TYPES.has(itemType) || (itemType === "arrangementKey" && hasRelatedId);
}

export function shouldShowDescription(itemType: string | undefined, hasRelatedId: boolean): boolean {
  if (!itemType) return false;
  return DESC_TYPES.has(itemType) || (itemType === "arrangementKey" && hasRelatedId);
}

export function shouldShowDuration(itemType: string | undefined, hasRelatedId: boolean): boolean {
  if (!itemType) return false;
  return DURATION_TYPES.has(itemType) || (itemType === "arrangementKey" && hasRelatedId);
}

export function isSectionType(itemType: string | undefined): boolean {
  return ["providerSection", "lessonSection", "section"].includes(itemType || "");
}

export function isPresentationType(itemType: string | undefined): boolean {
  return ["providerPresentation", "lessonAction", "action"].includes(itemType || "");
}

export function isFileType(itemType: string | undefined): boolean {
  return ["providerFile", "lessonAddOn", "addon", "file"].includes(itemType || "");
}

export function isSongType(itemType: string | undefined): boolean {
  return ["song", "arrangementKey"].includes(itemType || "");
}
