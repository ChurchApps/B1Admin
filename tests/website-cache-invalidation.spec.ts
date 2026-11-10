import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Issue #948: deleting a section/element in the website builder left the public
// b1.church page stale because nothing invalidated B1App's cache for that site.
const srcDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src");
const read = (rel: string) => fs.readFileSync(path.join(srcDir, rel), "utf8");

const editor = () => read("site/admin/ContentEditor.tsx");

const handlerBody = (source: string, name: string) => {
  const start = source.indexOf(`const ${name} = `);
  expect(start, `${name} not found in ContentEditor.tsx`).toBeGreaterThan(-1);
  const end = source.indexOf("\n  const ", start + 1);
  return source.slice(start, end === -1 ? source.length : end);
};

const PERSISTING_HANDLERS = [
  "confirmSectionDelete",
  "confirmElementDelete",
  "handleSectionMove",
  "handleElementMove",
  "handleSectionDuplicate",
  "handleElementDuplicate",
  "handleDrop",
  "handleTemplateSelect",
  "handleSwitchLayout",
  "handlePublish",
  "confirmDiscardChanges",
  "confirmUnpublish"
];

test.describe("issue-948 website builder cache invalidation", () => {
  test("every persisting ContentEditor mutation routes through trackSave", () => {
    const source = editor();
    for (const name of PERSISTING_HANDLERS) {
      expect(handlerBody(source, name), `${name} must wrap its save in trackSave()`).toContain("trackSave(");
    }
  });

  test("no ContentEditor content write escapes trackSave", () => {
    const source = editor().replace(/\s+/g, " ");
    const writes = [...source.matchAll(/ApiHelper\.(post|delete)\(\s*[`"](\/(sections|elements|pages)[^`"]*)/g)];
    expect(writes.length).toBeGreaterThan(5);
    for (const match of writes) {
      const before = source.slice(Math.max(0, match.index! - 120), match.index!);
      expect(before, `unwrapped write to ${match[2]}`).toContain("trackSave(");
    }
  });

  test("a settled save clears the public site cache", () => {
    const tracker = read("site/admin/saveStatusTracker.ts");
    expect(tracker).toContain('import { clearSiteCache } from "../siteCache"');
    const settled = tracker.slice(tracker.indexOf("if (inflight === 0)"), tracker.indexOf("return result;"));
    expect(settled).toContain("clearSiteCache()");
  });

  test("clearSiteCache prefers the active site over the church subdomain", () => {
    const cache = read("site/siteCache.ts");
    expect(cache).toContain("export const setActiveSiteSubDomain");
    expect(cache).toContain("subDomain || activeSubDomain || UserHelper.currentUserChurch?.church?.subDomain");
    expect(cache).toContain('fetch(b1Url + "/api/revalidate/" + sd, { method: "POST" })');
  });

  test("ContentEditor registers the edited page's site subdomain", () => {
    const source = editor();
    expect(source).toContain("setActiveSiteSubDomain");
    expect(source).toContain('ApiHelper.get("/sites", "MembershipApi")');
  });
});
