import { type InstructionItem, type Instructions, type IProvider } from "@churchapps/content-providers";
import { ApiHelper, type PersonInterface } from "@churchapps/apphelper";
import { type AssignmentInterface, type PositionInterface } from "@churchapps/helpers";
import { type PlanItemInterface, type FeedVenueInterface, type FeedSectionInterface, type FeedActionInterface } from "../../helpers";

/** Gets instructions from a provider based on its capabilities, proxying through the API when auth is required. */
export async function getProviderInstructions(provider: IProvider, path: string, ministryId?: string, providerId?: string): Promise<Instructions | null> {
  const capabilities = provider.capabilities;
  if (!capabilities.instructions || !provider.getInstructions) return null;
  if (provider.requiresAuth && ministryId && providerId) {
    return ApiHelper.post("/providerProxy/getInstructions", { ministryId, providerId, path }, "DoingApi");
  }
  return provider.getInstructions(path);
}

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

/** Finds an instruction item by relatedId (or id) anywhere in the tree, returning it with its
 * current dot-notation path. Index paths go stale when the provider edits content; relatedId doesn't. */
export function findByRelatedId(items: InstructionItem[], relatedId: string, parentPath = ""): { item: InstructionItem; path: string } | null {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const currentPath = parentPath ? `${parentPath}.${i}` : `${i}`;
    if (item.relatedId === relatedId || item.id === relatedId) return { item, path: currentPath };
    if (item.children) {
      const found = findByRelatedId(item.children, relatedId, currentPath);
      if (found) return found;
    }
  }
  return null;
}

/** "Expand to Actions" stamps each generated action with `${sectionPath}.${index}`, so the
 * section's own content path is the action's path minus that trailing index. */
export function getExpandedSectionPath(item: PlanItemInterface): string | null {
  if (!isPresentationType(item.itemType) || !item.providerId || !item.providerPath) return null;
  return /^(.+)\.\d+$/.exec(item.providerContentPath || "")?.[1] || null;
}

/** Contiguous runs of action items expanded from the same section, keyed by the run's first item id. */
export function findExpandedRuns(items: PlanItemInterface[]): Map<string, PlanItemInterface[]> {
  const runs = new Map<string, PlanItemInterface[]>();
  let run: PlanItemInterface[] = [];
  let key: string | null = null;
  const flush = () => {
    if (run.length > 1 && run[0].id) runs.set(run[0].id, run);
    run = [];
  };
  items.forEach((item) => {
    const sectionPath = getExpandedSectionPath(item);
    const itemKey = sectionPath ? `${item.providerId}|${item.providerPath}|${sectionPath}` : null;
    if (itemKey !== key) {
      flush();
      key = itemKey;
    }
    if (itemKey) run.push(item);
  });
  flush();
  return runs;
}

/** Handles undefined/null children arrays to avoid NaN. */
export function getNextChildSort(children: PlanItemInterface[] | undefined | null): number {
  return (children?.length ?? 0) + 1;
}

/** Copies a plan item directly below the original. Uses the fractional-sort convention
 * (same as drag-and-drop) via /planItems/sort, which renumbers siblings server-side. */
export async function duplicatePlanItem(planItem: PlanItemInterface): Promise<void> {
  const copy = { ...planItem };
  delete copy.id;
  delete copy.children;
  copy.sort = (copy.sort || 0) + 0.5;
  await ApiHelper.post("/planItems/sort", copy, "DoingApi");
}

/** Fresh media info for a provider item, fetched per page load (provider links can expire). */
export interface ProviderMediaInfo {
  url: string;
  mediaType?: "video" | "image" | "audio";
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
  if (planItem.relatedId && lookup["related:" + planItem.relatedId]) return lookup["related:" + planItem.relatedId];
  if (planItem.providerContentPath && lookup[planItem.providerContentPath]) return lookup[planItem.providerContentPath];
  if (planItem.label && lookup["label:" + planItem.label]) return lookup["label:" + planItem.label];
  return undefined;
}

const VIDEO_EXT_PATTERN = /\.(mp4|webm|mov|m4v|avi|mkv)\s*(\?|#|$)/i;
const AUDIO_EXT_PATTERN = /\.(mp3|m4a|aac|wav|flac|oga)\s*(\?|#|$)/i;

/** Planning estimate for images. Stored seconds stay 0 so playback (FreePlay) leaves the
 * volunteer in control; this value is display/schedule-math only. */
export const ESTIMATED_IMAGE_SECONDS = 300;

/** Effective seconds for schedule math: stored value, else the image planning estimate. */
export function estimateSeconds(planItem: PlanItemInterface, lookup?: Record<string, ProviderMediaInfo>): number {
  if (planItem.seconds && planItem.seconds > 0) return planItem.seconds;
  if (planItem.itemType === "header") return 0;
  const media = matchProviderMedia(planItem, lookup);
  if (media && !isVideoMedia(planItem.label, media) && !isAudioMedia(planItem.label, media)) return ESTIMATED_IMAGE_SECONDS;
  return 0;
}

/** Older provider versions omit mediaType, so also sniff the file extension from the label/url. */
export function isVideoMedia(label: string | undefined, media: ProviderMediaInfo): boolean {
  return media.mediaType === "video" || VIDEO_EXT_PATTERN.test(label || "") || VIDEO_EXT_PATTERN.test(media.url.split("?")[0]);
}

export function isAudioMedia(label: string | undefined, media: ProviderMediaInfo): boolean {
  return media.mediaType === "audio" || AUDIO_EXT_PATTERN.test(label || "") || AUDIO_EXT_PATTERN.test(media.url.split("?")[0]);
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
 * Keys: "related:<relatedId>" (stable across provider edits), dot-notation content paths
 * ("0.2.1", matching providerContentPath on saved plan items), plus "label:<label>"
 * fallbacks for items saved before paths existed.
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
        if (item.relatedId && !lookup["related:" + item.relatedId]) lookup["related:" + item.relatedId] = info;
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

const SECTION_PLAN_TYPES = new Set(["section", "providerSection", "lessonSection", "header"]);

function flattenPlanItems(items: PlanItemInterface[]): PlanItemInterface[] {
  let result: PlanItemInterface[] = [];
  items.forEach(item => {
    result.push(item);
    if (item.children) result = result.concat(flattenPlanItems(item.children));
  });
  return result;
}

/**
 * Reconciles pristine lesson/provider content against the (possibly customized) plan items, so
 * every print format matches the Service Order. Sections still in the plan print in full;
 * sections expanded into actions keep only the actions that survived; anything else is dropped.
 */
export function filterFeedByPlanItems(feed: FeedVenueInterface | null, planItems: PlanItemInterface[]): FeedVenueInterface | null {
  if (!feed?.sections?.length || !planItems?.length) return feed;

  const norm = (s?: string) => (s || "").trim().toLowerCase();
  const flat = flattenPlanItems(planItems);

  const sectionItems = flat.filter(pi => SECTION_PLAN_TYPES.has(pi.itemType || ""));
  const sectionIds = new Set(sectionItems.map(pi => pi.relatedId).filter(Boolean));
  const sectionNames = new Set(sectionItems.map(pi => norm(pi.label || pi.description)).filter(Boolean));

  const actionItems = flat.filter(pi => !SECTION_PLAN_TYPES.has(pi.itemType || ""));
  const actionIds = new Set(actionItems.map(pi => pi.relatedId).filter(Boolean));
  const actionNames = new Set(actionItems
    .filter(pi => pi.providerId || pi.relatedId)
    .map(pi => norm(pi.label || pi.description))
    .filter(Boolean));

  const sectionInPlan = (s: FeedSectionInterface) => (!!s.id && sectionIds.has(s.id)) || sectionNames.has(norm(s.name));

  const sections = feed.sections
    .map((s: FeedSectionInterface) => {
      if (sectionInPlan(s)) return s;
      // id-less actions fall back to exact normalized name match — plan-global, so scope
      // per-section if duplicate action text ever misprints.
      const actions = (s.actions || []).filter((a: FeedActionInterface) => (a.id ? actionIds.has(a.id) : !!a.content && actionNames.has(norm(a.content))));
      return { ...s, actions };
    })
    .filter((s: FeedSectionInterface) => sectionInPlan(s) || !!s.actions?.length);

  return { ...feed, sections };
}

export interface PositionLabel {
  text: string;
  assigned: boolean;
}

/** Maps each position id to the assigned volunteer name(s), falling back to the position name when nobody is assigned. */
export function buildPositionLabels(positions: PositionInterface[], assignments: AssignmentInterface[], people: PersonInterface[]): Record<string, PositionLabel> {
  const result: Record<string, PositionLabel> = {};
  (positions || []).forEach((p) => {
    const names = (assignments || [])
      .filter((a) => a.positionId === p.id)
      .map((a) => (people || []).find((person) => person.id === a.personId)?.name?.display)
      .filter(Boolean);
    if (p.id) result[p.id] = names.length > 0 ? { text: names.join(", "), assigned: true } : { text: p.name || "", assigned: false };
  });
  return result;
}
