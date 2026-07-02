import type { Page, APIRequestContext } from "@playwright/test";
import { request } from "@playwright/test";
import { servingTest as test, expect } from "./helpers/test-fixtures";
import { login } from "./helpers/auth";
import { navigateToServing } from "./helpers/navigation";
import { STORAGE_STATE_PATH } from "./global-setup";

// Reminder config for a plan type now lives on a scope-level reminder definition
// (MessagingApi: GET/POST /messaging/reminders/scope/plan/{planTypeId}, DELETE
// /messaging/reminders/{defId}) rather than raw reminderOffsets/reminderMessage
// columns on the plan type itself. We edit the seeded "Sunday Service" plan type
// (Worship ministry, GRP0000000a) rather than creating a throwaway one, since the
// reminder editor only renders once a plan type has an id.
const API_BASE = "http://localhost:8084";
const WORSHIP_MINISTRY_ID = "GRP0000000a";
// Own plan type: the seeded "Sunday Service" carries a seeded reminder definition
// (RMD00000001) and is edited by other specs — sharing it makes offsets assertions racy.
const PLAN_TYPE_NAME = "Zephaniah Reminder Plans";

async function apiAuth(ctx: APIRequestContext) {
  const res = await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  const body = await res.json();
  const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
  return { headers: { Authorization: "Bearer " + (uc?.jwt as string) } };
}

async function createPlanType(ctx: APIRequestContext, auth: { headers: { Authorization: string } }) {
  const res = await ctx.post(`${API_BASE}/doing/planTypes`, { ...auth, data: [{ ministryId: WORSHIP_MINISTRY_ID, name: PLAN_TYPE_NAME }] });
  const body = await res.json();
  return (Array.isArray(body) ? body[0] : body)?.id as string | undefined;
}

// The reminders editor lives inside a collapsed MUI Accordion. Expand it by
// clicking the "Reminders" summary unless the enable toggle is already showing.
async function expandReminders(page: Page) {
  const toggle = page.locator('[data-testid="plan-type-reminder-enabled-toggle"]');
  if (await toggle.isVisible({ timeout: 500 }).catch(() => false)) return;
  await page.locator('[role="dialog"]').getByText("Reminders", { exact: true }).first().click();
  await toggle.waitFor({ state: "visible", timeout: 10000 });
}

async function setEnabled(page: Page, on: boolean) {
  const toggle = page.locator('[data-testid="plan-type-reminder-enabled-toggle"]');
  const checked = await toggle.isChecked();
  if (checked !== on) await toggle.click();
}

async function openPlanTypeEditor(page: Page) {
  const row = page.locator("tr", { hasText: PLAN_TYPE_NAME });
  await expect(row).toBeVisible({ timeout: 10000 });
  await row.locator('button:has(svg[data-testid="EditIcon"])').click();
  await page.locator('[role="dialog"]').waitFor({ state: "visible", timeout: 10000 });
}

async function closePlanTypeEditor(page: Page) {
  await page.locator('[role="dialog"]').getByRole("button", { name: "Cancel", exact: true }).click();
  await page.locator('[role="dialog"]').waitFor({ state: "hidden", timeout: 10000 });
}

test.describe.serial("Serving Reminders", () => {
  test.describe.configure({ retries: 0 });
  let page: Page;
  let planTypeId: string;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
    await navigateToServing(page);

    const ctx = await request.newContext();
    const auth = await apiAuth(ctx);
    planTypeId = (await createPlanType(ctx, auth)) as string;
    await ctx.dispose();
    expect(planTypeId, "created reminder-spec plan type id").toBeTruthy();
    await page.reload();
    await navigateToServing(page);
  });

  test.afterAll(async () => {
    // Delete the definition and the spec-owned plan type so demo data is left clean.
    try {
      const ctx = await request.newContext();
      const auth = await apiAuth(ctx);
      const defs = await (await ctx.get(`${API_BASE}/messaging/reminders/scope/plan/${planTypeId}`, auth)).json();
      const defId = defs?.[0]?.id;
      if (defId) await ctx.delete(`${API_BASE}/messaging/reminders/${defId}`, auth);
      await ctx.delete(`${API_BASE}/doing/planTypes/${planTypeId}`, auth);
      await ctx.dispose();
    } catch { /* best-effort cleanup */ }
    await page?.context().close();
  });

  test("admin enables a reminder on a plan type, picks a timing chip, and saves", async () => {
    await page.goto("/serving/plans");
    await page.waitForURL(/\/serving\/plans/, { timeout: 15000 });
    await expect(page.getByRole("heading", { name: "Worship", exact: true })).toBeVisible({ timeout: 15000 });

    await openPlanTypeEditor(page);
    await expandReminders(page);
    await setEnabled(page, true);

    // Default preset (1 day before) is pre-selected; add "7 days before" so the
    // saved offsets are unambiguous.
    await page.locator('[data-testid="plan-type-reminder-offset-10080"]').click();
    await page.locator('[data-testid="plan-type-reminder-time-input"] input').fill("08:15");
    await page.locator('[data-testid="plan-type-reminder-message-input"] textarea').first().fill("Come prepared and warmed up!");
    await expect(page.locator('[data-testid="plan-type-reminder-channel-push"] input')).toBeChecked();
    await expect(page.locator('[data-testid="plan-type-reminder-channel-email"] input')).toBeChecked();

    const upsert = page.waitForResponse((r) => /\/messaging\/reminders\/scope\/plan\//.test(r.url()) && r.request().method() === "POST" && r.ok(), { timeout: 15000 });
    await page.locator('[data-testid="plan-type-reminder-save-button"]').click();
    await upsert;

    await closePlanTypeEditor(page);
  });

  test("reopening the editor reflects the persisted reminder", async () => {
    await page.goto("/serving/plans");
    await page.waitForURL(/\/serving\/plans/, { timeout: 15000 });

    await openPlanTypeEditor(page);
    await expandReminders(page);

    await expect(page.locator('[data-testid="plan-type-reminder-enabled-toggle"]')).toBeChecked();
    await expect(page.locator('[data-testid="plan-type-reminder-time-input"] input')).toHaveValue("08:15");
    await expect(page.locator('[data-testid="plan-type-reminder-message-input"] textarea').first()).toHaveValue("Come prepared and warmed up!");
    await expect(page.locator('[data-testid="plan-type-reminder-channel-push"] input')).toBeChecked();
    await expect(page.locator('[data-testid="plan-type-reminder-channel-email"] input')).toBeChecked();

    await closePlanTypeEditor(page);
  });

  test("reminder definition is stored server-side against the plan type scope", async () => {
    const ctx = await request.newContext();
    const auth = await apiAuth(ctx);
    const defs = await (await ctx.get(`${API_BASE}/messaging/reminders/scope/plan/${planTypeId}`, auth)).json();
    const def = defs?.[0];
    expect(def).toBeTruthy();
    expect(def.entityType).toBe("plan");
    expect(def.scopeId).toBe(planTypeId);
    expect(def.offsets).toBe("1440,10080");
    expect(def.sendLocalTime?.slice(0, 5)).toBe("08:15");
    expect(def.message).toBe("Come prepared and warmed up!");
    expect(def.channels).toBe("push,email");
    expect(def.recipientMode).toBe("assignments");
    expect(Boolean(def.enabled)).toBe(true); // MySQL returns 1
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
