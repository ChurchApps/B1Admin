import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const out = path.join(process.env.TEMP || ".", "omarchy-qa");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(20000);

const problems = [];

const measure = async (label) => {
  const header = page.locator("header.om-chrome");
  const box = await header.boundingBox();
  const viewport = page.viewportSize();
  const info = {
    label,
    url: page.url(),
    header: box,
    viewport
  };
  console.log(JSON.stringify(info));
  if (!box) {
    problems.push(`${label}: header not found`);
    return info;
  }
  if (box.height > 64) problems.push(`${label}: header height ${box.height} > 64`);
  if (box.width < (viewport?.width || 1440) - 40) problems.push(`${label}: header width ${box.width} (expected ~${viewport?.width})`);
  if (box.y > 4) problems.push(`${label}: header y ${box.y} not at top`);
  return info;
};

const shot = async (name) => {
  await page.screenshot({ path: path.join(out, name + ".png"), fullPage: false });
};

await page.goto("http://localhost:3102/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(800);

const email = page.locator('input[type="email"]');
const header = page.locator("header.om-chrome");
const loggedIn = await header.isVisible().catch(() => false);
if (!loggedIn && await email.isVisible().catch(() => false)) {
  await email.fill("demo@b1.church");
  await page.fill('input[type="password"]', "password");
  await page.click('button[type="submit"]');
  const churchDialog = page.locator('[role="dialog"]').filter({ hasText: "Select a Church" });
  await Promise.race([
    churchDialog.waitFor({ state: "visible", timeout: 15000 }).catch(() => undefined),
    page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 }).catch(() => undefined)
  ]);
  if (await churchDialog.isVisible().catch(() => false)) {
    const grace = page.locator('[role="dialog"] h3').filter({ hasText: /Grace/i }).first();
    await grace.click({ timeout: 10000 });
  }
  await header.waitFor({ state: "visible", timeout: 30000 });
}

await page.waitForTimeout(600);
await measure("sunday");
await shot("sunday");

const routes = [
  ["/people", "people"],
  ["/groups", "groups"],
  ["/donations", "donations"],
  ["/serving/plans", "serving"],
  ["/settings", "settings"],
  ["/attendance", "attendance"],
  ["/site/pages", "site"]
];

for (const [url, name] of routes) {
  await page.goto("http://localhost:3102" + url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  await measure(name);
  await shot(name);
}

await page.goto("http://localhost:3102/people", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(600);
const harbor = page.locator(".om-themes button", { hasText: "Harbor" });
if (await harbor.isVisible()) {
  await harbor.click();
  await page.waitForTimeout(400);
  await measure("people-harbor");
  await shot("people-harbor");
  await page.locator(".om-themes button", { hasText: "B1" }).click();
  await page.waitForTimeout(400);
  await measure("people-b1");
  await shot("people-b1");
}

const person = page.locator(".omarchy-people a, .hh, a[href^='/people/']").first();
if (await person.isVisible().catch(() => false)) {
  await person.click();
  await page.waitForTimeout(900);
  await measure("person");
  await shot("person");
}

await page.setViewportSize({ width: 390, height: 844 });
await page.goto("http://localhost:3102/people", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(700);
await measure("people-m");
await shot("people-m");

await browser.close();

console.log("problems", problems.length ? problems : "none");
if (problems.length) process.exit(1);
console.log("done", out);
