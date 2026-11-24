import type { Page, APIRequestContext } from "@playwright/test";
import { request } from "@playwright/test";
import { servingTest as test, expect } from "./helpers/test-fixtures";
import { login } from "./helpers/auth";
import { navigateToServing } from "./helpers/navigation";
import { STORAGE_STATE_PATH } from "./global-setup";

// Plan type Reminders: the leader gap alert is off by default and saves as its own definition
// (recipientMode "leaderGaps") beside the volunteer reminder.
const API_BASE = process.env.API_BASE || "http://localhost:8084";
const WORSHIP_MINISTRY_ID = "GRP0000000a";
const PLAN_TYPE_NAME = "Gap Alert Plans";

async function apiAuth(ctx: APIRequestContext) {
  const res = await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  const body = await res.json();
  const uc = (body.userChurches || []).find((c: { church?: { id?: string } }) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
  return { headers: { Authorization: "Bearer " + (uc?.jwt as string) } };
}

async function loadDefs(planTypeId: string) {
  const ctx = await request.newContext();
  const defs = await (await ctx.get(`${API_BASE}/messaging/reminders/scope/plan/${planTypeId}`, await apiAuth(ctx))).json();
  await ctx.dispose();
  return defs as { id: string; recipientMode?: string; offsets?: string; channels?: string }[];
}

async function openReminders(page: Page) {
  await page.goto("/serving/plans");
  const row = page.locator("tr", { hasText: PLAN_TYPE_NAME });
  await expect(row).toBeVisible({ timeout: 15000 });
  await row.getByRole("button", { name: "Edit", exact: true }).click();
  await page.locator('[role="dialog"]').waitFor({ state: "visible", timeout: 10000 });
  await page.locator('[role="dialog"]').getByText("Reminders", { exact: true }).first().click();
  await page.getByTestId("plan-type-gap-alert-toggle").waitFor({ state: "visible", timeout: 10000 });
}

async function saveAndClose(page: Page) {
  const saved = page.waitForResponse((r) => /\/messaging\/reminders\//.test(r.url()) && ["POST", "DELETE"].includes(r.request().method()) && r.ok(), { timeout: 15000 });
  await page.getByTestId("plan-type-reminder-save-button").click();
  await saved;
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await page.locator('[role="dialog"]').getByRole("button", { name: "Cancel", exact: true }).click();
  await page.locator('[role="dialog"]').waitFor({ state: "hidden", timeout: 10000 });
}

test.describe.serial("serving leader gap alert", () => {
  test.describe.configure({ retries: 0 });
  let page: Page;
  let planTypeId: string;

  test.beforeAll(async ({ browser }) => {
    const ctx = await request.newContext();
    const res = await ctx.post(`${API_BASE}/doing/planTypes`, { ...(await apiAuth(ctx)), data: [{ ministryId: WORSHIP_MINISTRY_ID, name: PLAN_TYPE_NAME }] });
    const body = await res.json();
    planTypeId = (Array.isArray(body) ? body[0] : body)?.id;
    await ctx.dispose();
    expect(planTypeId).toBeTruthy();

    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
    await navigateToServing(page);
  });

  test.afterAll(async () => {
    try {
      const ctx = await request.newContext();
      const auth = await apiAuth(ctx);
      for (const def of await loadDefs(planTypeId)) await ctx.delete(`${API_BASE}/messaging/reminders/${def.id}`, auth);
      await ctx.delete(`${API_BASE}/doing/planTypes/${planTypeId}`, auth);
      await ctx.dispose();
    } catch { /* ignore */ }
    await page?.context().close();
  });

  test("the gap alert is off by default", async () => {
    await openReminders(page);
    await expect(page.getByTestId("plan-type-gap-alert-toggle").locator("input")).not.toBeChecked();
    await expect(page.getByTestId("plan-type-gap-alert-days")).toHaveCount(0);
    await page.locator('[role="dialog"]').getByRole("button", { name: "Cancel", exact: true }).click();
    expect(await loadDefs(planTypeId)).toEqual([]);
  });

  test("turning it on saves a leader gap definition without turning on volunteer reminders", async () => {
    await openReminders(page);
    await page.getByTestId("plan-type-gap-alert-toggle").click();
    await page.getByTestId("plan-type-gap-alert-days").fill("4");
    await saveAndClose(page);

    const defs = await loadDefs(planTypeId);
    expect(defs).toHaveLength(1);
    expect(defs[0].recipientMode).toBe("leaderGaps");
    expect(defs[0].offsets).toBe("5760");
    expect(defs[0].channels).toBe("push,email");
  });

  test("reopening shows it on, and turning it off removes it", async () => {
    await openReminders(page);
    await expect(page.getByTestId("plan-type-gap-alert-toggle").locator("input")).toBeChecked();
    await expect(page.getByTestId("plan-type-gap-alert-days")).toHaveValue("4");
    await expect(page.getByTestId("plan-type-reminder-enabled-toggle").locator("input")).not.toBeChecked();

    await page.getByTestId("plan-type-gap-alert-toggle").click();
    await saveAndClose(page);
    expect(await loadDefs(planTypeId)).toEqual([]);
  });
});
