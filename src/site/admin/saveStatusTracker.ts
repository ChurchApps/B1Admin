import { clearSiteCache } from "../siteCache";

export type SaveStatus = "saved" | "saving" | "error";

let inflight = 0;
let status: SaveStatus = "saved";
let lastSavedAt: number | null = null;
// Bumped on reset so saves still in flight from a previous page can't drive inflight negative.
let generation = 0;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((cb) => cb());

export function trackSave<T>(promise: Promise<T>): Promise<T> {
  const gen = generation;
  inflight++;
  if (status === "saved") { status = "saving"; notify(); }
  return promise.then(
    (result) => {
      if (gen === generation) {
        inflight--;
        if (inflight === 0) {
          lastSavedAt = Date.now();
          if (status !== "error") status = "saved";
          notify();
          clearSiteCache();
        }
      }
      return result;
    },
    (error) => {
      if (gen === generation) {
        inflight--;
        status = "error";
        notify();
      }
      throw error;
    }
  );
}

export const getSaveStatus = (): SaveStatus => status;
export const getLastSavedAt = (): number | null => lastSavedAt;

export function subscribeSaveStatus(cb: () => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function resetSaveStatus() {
  generation++;
  inflight = 0;
  status = "saved";
  lastSavedAt = null;
  notify();
}
