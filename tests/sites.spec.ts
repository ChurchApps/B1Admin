import type { Page } from "@playwright/test";
import { request } from "@playwright/test";
import { siteTest as test, expect } from "./helpers/test-fixtures";
import { login } from "./helpers/auth";
import { navigateToSite } from "./helpers/navigation";
import { STORAGE_STATE_PATH } from "./global-setup";
import { confirmDelete } from "./helpers/fixtures";

const MEMBERSHIP = "http://localhost:8084/membership";
const SITE_NAME = "Youth";
const SITE_SUBDOMAIN = "youthtest";

// Best-effort API cleanup so a partial failure never leaves a stray test site
// (and its pages) behind. Mirrors the JWT bootstrap in global-setup.ts.
async function deleteTestSite() {
  try {
    const ctx = await request.newContext();
    const loginRes = await ctx.post(`${MEMBERSHIP}/users/login`, { data: { email: "demo@b1.church", password: "password" } });
    if (loginRes.ok()) {
      const loginBody = await loginRes.json();
      const uc = (loginBody.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || loginBody.userChurches?.[0];
      const auth = { headers: { Authorization: "Bearer " + uc?.jwt } };
      const sites = await (await ctx.get(`${MEMBERSHIP}/sites`, auth)).json();
      const stale = (Array.isArray(sites) ? sites : []).filter((s: any) => s.subDomain === SITE_SUBDOMAIN || s.name === SITE_NAME);
      for (const s of stale) await ctx.delete(`${MEMBERSHIP}/sites/${s.id}`, auth);
    }
    await ctx.dispose();
  } catch {
    // best-effort — the backend may not expose /sites in older environments
  }
}

test.describe.serial("Multiple Websites", () => {
  // Tests build on shared server state (the created Youth site) — never retry.
  test.describe.configure({ retries: 0 });

  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
    await navigateToSite(page);
  });

  test.afterAll(async () => {
    await deleteTestSite();
    await page?.context().close();
  });

  test("shows the site switcher defaulting to Main Website", async () => {
    const switcher = page.locator('[data-testid="site-switcher"]');
    await expect(switcher).toBeVisible({ timeout: 10000 });
    await expect(switcher).toContainText("Main Website");
  });

  test("adds a new website via the manage dialog", async () => {
    await page.locator('[data-testid="site-switcher"]').click();
    await page.locator('[data-testid="manage-sites"]').click();
    await expect(page.locator('[data-testid="close-sites-dialog"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="site-name-input"] input').fill(SITE_NAME);
    await page.locator('[data-testid="site-subdomain-input"] input').fill(SITE_SUBDOMAIN);
    const sitePost = page.waitForResponse(r => r.url().includes("/membership/sites") && r.request().method() === "POST", { timeout: 15000 });
    await page.locator('[data-testid="add-site-button"]').click();
    await sitePost;
    // The site appears in the dialog list once the switcher's site list has reloaded.
    await expect(page.locator(`[data-testid="delete-site-${SITE_SUBDOMAIN}"]`)).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="close-sites-dialog"]').click();
    await expect(page.locator('[data-testid="close-sites-dialog"]')).toBeHidden({ timeout: 10000 });
  });

  test("adds a page scoped to the Youth site", async () => {
    await page.locator('[data-testid="site-switcher"]').click();
    await page.getByRole("option", { name: SITE_NAME }).click();
    await expect(page).toHaveURL(/[?&]site=/, { timeout: 10000 });

    await page.locator('[data-testid="add-page-button"]').click();
    await page.locator('[name="title"]').fill("Youth Home");
    const pagePost = page.waitForResponse(r => r.url().includes("/content/pages") && r.request().method() === "POST", { timeout: 15000 });
    await page.locator("button").getByText("Save").click();
    await pagePost;
    await expect(page.locator("td").getByText("Youth Home")).toHaveCount(1, { timeout: 10000 });
  });

  test("hides the Youth page under Main Website", async () => {
    await page.locator('[data-testid="site-switcher"]').click();
    await page.getByRole("option", { name: "Main Website" }).click();
    await expect(page).not.toHaveURL(/[?&]site=/, { timeout: 10000 });
    await expect(page.locator('[data-testid="site-switcher"]')).toContainText("Main Website");
    await expect(page.locator("td").getByText("Youth Home")).toHaveCount(0, { timeout: 10000 });
  });

  test("deletes the Youth site and returns to Main Website", async () => {
    await page.locator('[data-testid="site-switcher"]').click();
    await page.locator('[data-testid="manage-sites"]').click();
    // Let the dialog's open transition settle before clicking inside it,
    // otherwise the click can land on the backdrop and silently close it.
    await expect(page.locator('[data-testid="close-sites-dialog"]')).toBeVisible({ timeout: 10000 });
    const deleteButton = page.locator(`[data-testid="delete-site-${SITE_SUBDOMAIN}"]`);
    await expect(deleteButton).toBeVisible({ timeout: 10000 });
    // Generous timeout: the server's best-effort Caddy sync can add up to ~10s when the admin API is unreachable.
    const siteDelete = page.waitForResponse(r => /\/membership\/sites\/[^/]+$/.test(r.url()) && r.request().method() === "DELETE", { timeout: 30000 });
    await deleteButton.click();
    await confirmDelete(page);
    expect((await siteDelete).status()).toBe(200);
    await expect(page.locator(`[data-testid="delete-site-${SITE_SUBDOMAIN}"]`)).toHaveCount(0, { timeout: 10000 });
    await page.locator('[data-testid="close-sites-dialog"]').click();
    await expect(page.locator('[data-testid="close-sites-dialog"]')).toBeHidden({ timeout: 10000 });
    await expect(page.locator('[data-testid="site-switcher"]')).toContainText("Main Website");
  });
});
