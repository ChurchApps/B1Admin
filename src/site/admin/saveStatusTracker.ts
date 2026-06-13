export type SaveStatus = "saved" | "saving" | "error";

let inflight = 0;
let status: SaveStatus = "saved";
let lastSavedAt: number | null = null;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((cb) => cb());

export function trackSave<T>(promise: Promise<T>): Promise<T> {
  inflight++;
  if (status !== "saving") { status = "saving"; notify(); }
  return promise.then(
    (result) => {
      inflight--;
      if (inflight === 0) {
        status = "saved";
        lastSavedAt = Date.now();
        notify();
      }
      return result;
    },
    (error) => {
      inflight--;
      status = "error";
      notify();
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
  inflight = 0;
  status = "saved";
  lastSavedAt = null;
  notify();
}
