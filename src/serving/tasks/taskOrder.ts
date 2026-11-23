import { type TaskInterface } from "@churchapps/helpers";

// The Api returns tasks oldest first and cards soonest due first; My Work shows what just arrived on top.
export const newestFirst = (a: TaskInterface, b: TaskInterface) => (new Date(b.dateCreated || 0).getTime() - new Date(a.dateCreated || 0).getTime()) || ((b.taskNumber || 0) - (a.taskNumber || 0));

// A card entering a step gets the step's highest sort, so the latest arrival heads its column.
export const latestArrivalFirst = (a: TaskInterface, b: TaskInterface) => ((b.sort || 0) - (a.sort || 0)) || ((b.taskNumber || 0) - (a.taskNumber || 0));

export type CardSort = "newest" | "oldest" | "firstName" | "lastName";

// Cards only carry the person's display name, so first and last name are its first and last words.
const nameParts = (card: TaskInterface) => (card.associatedWithLabel || card.title || "").trim().split(/\s+/);
const byName = (pick: (parts: string[]) => string) => (a: TaskInterface, b: TaskInterface) =>
  pick(nameParts(a)).localeCompare(pick(nameParts(b)), undefined, { sensitivity: "base" }) || nameParts(a).join(" ").localeCompare(nameParts(b).join(" "));

export const cardSorts: Record<CardSort, (a: TaskInterface, b: TaskInterface) => number> = {
  newest: latestArrivalFirst,
  oldest: (a, b) => latestArrivalFirst(b, a),
  firstName: byName((parts) => parts[0] || ""),
  lastName: byName((parts) => parts[parts.length - 1] || "")
};
