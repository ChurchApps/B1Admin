import { test, expect } from "@playwright/test";
import { register } from "node:module";

// siteCache.ts pulls in @churchapps/apphelper, which node cannot resolve outside the
// bundler, so stub it with an ESM loader hook before importing the tracker.
const hook = `
  export async function resolve(spec, ctx, next) {
    if (spec.includes("siteCache")) return { url: "stub:siteCache", shortCircuit: true };
    return next(spec, ctx);
  }
  export async function load(url, ctx, next) {
    if (url === "stub:siteCache") return {
      format: "module",
      shortCircuit: true,
      source: "export const clearSiteCache = () => { globalThis.__clearSiteCacheCalls++; };"
    };
    return next(url, ctx);
  }
`;
register("data:text/javascript," + encodeURIComponent(hook));

const { trackSave, getSaveStatus, getLastSavedAt, resetSaveStatus } = await import("../src/site/admin/saveStatusTracker");

const deferred = <T>() => {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

const cacheClears = () => (globalThis as any).__clearSiteCacheCalls;

test.beforeEach(() => {
  (globalThis as any).__clearSiteCacheCalls = 0;
  resetSaveStatus();
});

test.describe("saveStatusTracker", () => {
  test("a save settling after a page switch is ignored and later saves still work", async () => {
    const stale = deferred<string>();
    const staleTracked = trackSave(stale.promise);

    resetSaveStatus();
    stale.resolve("stale");
    expect(await staleTracked).toBe("stale");
    expect(getSaveStatus()).toBe("saved");
    expect(getLastSavedAt()).toBeNull();
    expect(cacheClears()).toBe(0);

    const next = deferred<string>();
    const nextTracked = trackSave(next.promise);
    expect(getSaveStatus()).toBe("saving");

    next.resolve("next");
    expect(await nextTracked).toBe("next");
    expect(getSaveStatus()).toBe("saved");
    expect(getLastSavedAt()).not.toBeNull();
    expect(cacheClears()).toBe(1);
  });

  test("a failed save stays visible until the editor resets", async () => {
    const failed = deferred<string>();
    const failedTracked = trackSave(failed.promise);
    failed.reject(new Error("boom"));

    await expect(failedTracked).rejects.toThrow("boom");
    expect(getSaveStatus()).toBe("error");

    const ok = deferred<string>();
    const okTracked = trackSave(ok.promise);
    expect(getSaveStatus()).toBe("error");

    ok.resolve("ok");
    await okTracked;
    expect(getSaveStatus()).toBe("error");
    expect(getLastSavedAt()).not.toBeNull();

    resetSaveStatus();
    expect(getSaveStatus()).toBe("saved");
  });
});
