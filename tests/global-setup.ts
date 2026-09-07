import { chromium, request, type FullConfig } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";
import { verifyEnv } from "./setup/verify-env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_STATE_PATH = path.join(__dirname, ".auth-state.json");

async function globalSetup(config: FullConfig) {
  await verifyEnv({ fullCheck: true });

  const ctx = await request.newContext();
  const loginRes = await ctx.post((process.env.API_BASE || "http://localhost:8084") + "/membership/users/login", { data: { email: "demo@b1.church", password: "password" } });
  if (loginRes.ok()) {
    const loginBody = await loginRes.json();
    const uc = (loginBody.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || loginBody.userChurches?.[0];
    const auth = { headers: { Authorization: "Bearer " + uc?.jwt } };
    const groups = await (await ctx.get((process.env.API_BASE || "http://localhost:8084") + "/membership/groups", auth)).json();
    const stale = (Array.isArray(groups) ? groups : []).filter((g: any) => /^(Bulk All|Zz Bulk) \d+$/.test(g.name || ""));
    for (const g of stale) await ctx.delete(`${process.env.API_BASE || "http://localhost:8084"}/membership/groups/${g.id}`, auth);
  }
  await ctx.dispose();

  const baseURL = config.projects[0].use.baseURL || process.env.BASE_URL || "http://localhost:3101";

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(baseURL + "/");

  const emailInput = page.locator('input[type="email"]');

  await emailInput.waitFor({ state: "visible", timeout: 15000 });

  await page.fill('input[type="email"]', "demo@b1.church");
  await page.fill('input[type="password"]', "password");
  await page.click('button[type="submit"]');

  const churchDialog = page.locator('[role="dialog"]').filter({ hasText: "Select a Church" });
  await Promise.race([
    churchDialog.waitFor({ state: "visible", timeout: 15000 }).catch(() => {}),
    page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 }).catch(() => {})
  ]);

  const dialogVisible = await churchDialog.isVisible().catch(() => false);
  if (dialogVisible) {
    const graceChurch = page
      .locator('[role="dialog"] h3:has-text("Grace Community Church")')
      .first()
      .or(page.locator('[role="dialog"] h3:has-text("Gracious Community Church")').first());
    await graceChurch.click({ timeout: 10000 });
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
  }

  // Prime Vite dev server's module cache before parallel workers hit it.
  await page.goto(baseURL + "/people").catch(() => {});

  await context.storageState({ path: STORAGE_STATE_PATH });
  await browser.close();
}

export default globalSetup;
export { STORAGE_STATE_PATH };
