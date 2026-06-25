import type { Page, APIRequestContext } from "@playwright/test";
import { request } from "@playwright/test";
import { servingTest as test, expect } from "./helpers/test-fixtures";
import { login } from "./helpers/auth";
import { navigateToServing } from "./helpers/navigation";
import { STORAGE_STATE_PATH } from "./global-setup";

// Reminder config (reminderOffsets CSV + reminderMessage) lives on the plan type.
// Worship ministry (GRP0000000a) is seeded; we add a throwaway plan type under it.
const API_BASE = "http://localhost:8084";
const WORSHIP_MINISTRY_ID = "GRP0000000a";
const PLAN_TYPE_NAME = "ZZ Reminder Test Type";

async function apiAuth(ctx: APIRequestContext) {
  const res = await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  const body = await res.json();
  const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
  return { headers: { Authorization: "Bearer " + (uc?.jwt as string) } };
}

test.describe.serial("Serving Reminders", () => {
  test.describe.configure({ retries: 0 });
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
    await navigateToServing(page);
  });

  test.afterAll(async () => {
    // Remove the throwaway plan type regardless of how the UI was left.
    try {
      const ctx = await request.newContext();
      const auth = await apiAuth(ctx);
      const types = await (await ctx.get(`${API_BASE}/doing/planTypes/ministryId/${WORSHIP_MINISTRY_ID}`, auth)).json();
      const mine = (types || []).find((t: any) => t.name === PLAN_TYPE_NAME);
      if (mine?.id) await ctx.delete(`${API_BASE}/doing/planTypes/${mine.id}`, auth);
      await ctx.dispose();
    } catch { /* best-effort cleanup */ }
    await page?.context().close();
  });

  test("admin sets reminder timing + message on a plan type, and it persists", async () => {
    await page.goto("/serving/plans");
    await page.waitForURL(/\/serving\/plans/, { timeout: 15000 });

    // Plans opens on the seeded Worship ministry (GRP0000000a) directly — no tabs.
    await expect(page.getByRole("heading", { name: "Worship", exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.locator("a").getByText("Sunday Service")).toBeVisible({ timeout: 15000 });

    await page.locator("button").getByText("Add Plan Type").click();
    await page.locator('[name="name"]').fill(PLAN_TYPE_NAME);
    await page.locator('[name="reminderOffsets"]').fill("7,1,0");
    await page.locator('[name="reminderMessage"]').fill("Bring your binder");
    await page.locator('[role="dialog"]').locator("button").getByText("Save").click();

    const row = page.locator("tr", { hasText: PLAN_TYPE_NAME });
    await expect(row).toBeVisible({ timeout: 10000 });

    // Reopen the editor — values must survive the API round-trip.
    await row.locator('button:has(svg[data-testid="EditIcon"])').click();
    await expect(page.locator('[name="reminderOffsets"]')).toHaveValue("7,1,0", { timeout: 10000 });
    await expect(page.locator('[name="reminderMessage"]')).toHaveValue("Bring your binder");
    await page.locator('[role="dialog"]').locator("button").getByText("Cancel").click();
  });

  test("reminder settings are stored server-side", async () => {
    const ctx = await request.newContext();
    const auth = await apiAuth(ctx);
    const types = await (await ctx.get(`${API_BASE}/doing/planTypes/ministryId/${WORSHIP_MINISTRY_ID}`, auth)).json();
    const mine = (types || []).find((t: any) => t.name === PLAN_TYPE_NAME);
    expect(mine).toBeTruthy();
    expect(mine.reminderOffsets).toBe("7,1,0");
    expect(mine.reminderMessage).toBe("Bring your binder");
    await ctx.dispose();
  });

  test("public accept/decline link rejects a forged or missing token", async () => {
    const ctx = await request.newContext();
    const forged = await ctx.get(`${API_BASE}/doing/assignments/public/respond?token=not-a-real-token`);
    expect(forged.status()).toBe(400);
    expect(await forged.text()).toMatch(/no longer valid|expired|invalid/i);

    const missing = await ctx.get(`${API_BASE}/doing/assignments/public/respond`);
    expect(missing.status()).toBe(400);
    await ctx.dispose();
  });
});
