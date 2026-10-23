import type { Page } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Issue 1337: on a curated calendar, Add Group only listed the admin's own groups, an event
// listed on its own and through its whole group showed twice, and a group with only a
// single-event entry showed under "Groups in Calendar" as if the whole group were connected.
const API_BASE = process.env.API_BASE || "http://localhost:8084";
const CHURCH_ID = "CHU00000001";

async function openCalendar(page: Page, id: string) {
  const entries = page.waitForResponse((r) => r.url().includes(`/curatedEvents/calendar/${id}?withoutEvents=1`));
  await page.goto(`/calendars/${id}`);
  await entries;
  await page.locator('[data-testid="calendar-add-event-button"]').waitFor({ state: "visible", timeout: 15000 });
  await expect(page.locator('[data-testid="groups-loading"]')).toHaveCount(0, { timeout: 15000 });
}

async function openAddGroup(page: Page) {
  await page.locator('[data-testid="calendar-add-event-button"]').click();
  const combo = page.locator('[data-testid="calendar-group-select"]').first();
  await combo.waitFor({ state: "visible", timeout: 10000 });
  await combo.click();
}

test.describe("Issue 1337 - curated calendar groups", () => {
  test("Add Group lists groups the admin is not a member of", async ({ page }) => {
    // Demo User is not in Youth Group.
    await openCalendar(page, "CAL00000004");
    await openAddGroup(page);
    await expect(page.getByRole("option", { name: "Youth Group", exact: true })).toBeVisible({ timeout: 10000 });
  });

  test("a single-event entry does not show its group as connected", async ({ page }) => {
    // Small Groups Calendar only lists one Young Families Group event, not the whole group.
    await openCalendar(page, "CAL00000003");
    await expect(page.getByText("Groups in Calendar")).toBeVisible();
    await expect(page.getByText("No groups added yet")).toBeVisible();
    await expect(page.locator('[data-testid="remove-group-GRP00000014-button"]')).toHaveCount(0);
  });

  test("adding a whole group does not show its already-listed event twice", async ({ page }) => {
    // Main Church Calendar already lists EVT00000001 (Sunday Morning Service) on its own.
    await openCalendar(page, "CAL00000004");
    await openAddGroup(page);
    await page.getByRole("option", { name: "Sunday Morning Service", exact: true }).click();
    const saved = page.waitForResponse((r) => r.url().includes("/curatedEvents") && r.request().method() === "POST");
    await page.locator('[data-testid="calendar-edit-save-button"]').click();
    await saved;
    await expect(page.locator('[data-testid="remove-group-GRP00000001-button"]')).toBeVisible({ timeout: 15000 });

    const res = await page.request.get(`${API_BASE}/content/curatedEvents/public/calendar/${CHURCH_ID}/CAL00000004`);
    const rows: { realEventId: string }[] = await res.json();
    expect(rows.filter((r) => r.realEventId === "EVT00000001")).toHaveLength(1);
  });
});
