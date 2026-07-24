export function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

export function createProgressLogger({ quiet = false } = {}) {
  return function withProgress(label, fn, details = "") {
    const startedAt = Date.now();
    if (!quiet) {
      console.log(`\n[START] ${label}${details ? `: ${details}` : ""}`);
    }

    try {
      const result = fn();
      if (result && typeof result.then === "function") {
        return result.then((value) => {
          if (!quiet) {
            console.log(`[DONE] ${label} (${formatDuration(Date.now() - startedAt)})`);
          }
          return value;
        }).catch((error) => {
          if (!quiet) {
            console.error(`[FAIL] ${label} after ${formatDuration(Date.now() - startedAt)}`);
          }
          throw error;
        });
      }

      if (!quiet) {
        console.log(`[DONE] ${label} (${formatDuration(Date.now() - startedAt)})`);
      }
      return result;
    } catch (error) {
      if (!quiet) {
        console.error(`[FAIL] ${label} after ${formatDuration(Date.now() - startedAt)}`);
      }
      throw error;
    }
  };
}
