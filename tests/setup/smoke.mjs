// Loads a deployed page in headless Chromium and fails on any page error or an empty render.
// usage: node tests/setup/smoke.mjs <url> [--expect dist/index.html] [--timeout seconds]
// --expect: keep retrying until the served entry script matches the local build (CDN invalidation lag).
import fs from "node:fs";
import { chromium } from "@playwright/test";

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith("--"));
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
if (!url) { console.error("usage: smoke.mjs <url> [--expect dist/index.html] [--timeout seconds]"); process.exit(2); }

const entryOf = (html) => html.match(/src="([^"]*\/index-[^"/]+\.js)"/)?.[1] ?? null;
const wanted = opt("--expect") ? entryOf(fs.readFileSync(opt("--expect"), "utf8")) : null;
const deadline = Date.now() + Number(opt("--timeout", 300)) * 1000;
const browser = await chromium.launch();
let last = "";

const attempt = async () => {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.goto(url + (url.includes("?") ? "&" : "?") + "smoke=" + Date.now(), { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(2000);
    const served = entryOf(await page.content());
    const rendered = await page.evaluate(() => {
      const root = document.getElementById("root") || document.getElementById("__next");
      return root ? root.children.length > 0 : document.body.innerText.trim().length > 0;
    });
    if (wanted && served !== wanted) return { retry: `served ${served} but built ${wanted}` };
    if (errors.length) return { fail: "page errors: " + errors.join(" | ") };
    if (!rendered) return { retry: "nothing rendered" };
    return { ok: served || "" };
  } catch (e) {
    return { retry: e.message.split("\n")[0] };
  } finally {
    await page.close();
  }
};

while (Date.now() < deadline) {
  const r = await attempt();
  if (r.ok !== undefined) { console.log(`smoke ok: ${url} ${r.ok}`.trim()); await browser.close(); process.exit(0); }
  if (r.fail) { console.error(`smoke FAILED: ${url}\n${r.fail}`); await browser.close(); process.exit(1); }
  last = r.retry;
  console.log("retrying: " + last);
  await new Promise((res) => setTimeout(res, 15000));
}
console.error(`smoke FAILED: ${url}\ntimed out; last: ${last}`);
await browser.close();
process.exit(1);
