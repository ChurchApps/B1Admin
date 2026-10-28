import type { Page } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Calendar conflict warnings and the pending approvals link. Runs in a browser zone other than
// the church's fallback (Eastern) zone so a warning worded in the wrong zone shows a different time.
test.use({ timezoneId: "America/Chicago" });

async function selectRoom(page: Page, name: string) {
  await page.locator('[data-testid="new-event-rooms-select"] [role="combobox"]').first().click();
  await page.getByRole("option", { name }).first().click();
  await page.keyboard.press("Escape");
}

test("blockout warning on a new event uses the same time as the Blockouts tab", async ({ page }) => {
  await page.goto("/calendars/rooms");
  await page.locator('[data-testid="tab-blockouts"]').click();
  const row = page.locator('[data-testid="blockouts-table"] tbody tr').filter({ hasText: "Floor refinishing" });
  await expect(row).toBeVisible({ timeout: 15000 });
  const startText = (await row.locator("td").nth(1).innerText()).trim();

  const { start, end } = await page.evaluate((s) => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    const toInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const d = new Date(s);
    return { start: toInput(new Date(d.getTime() + 60 * 60000)), end: toInput(new Date(d.getTime() + 120 * 60000)) };
  }, startText);

  await page.goto("/calendars/CAL00000004");
  await page.locator('[data-testid="new-event-button"]').click();
  await page.locator('[data-testid="new-event-start-input"] input').fill(start);
  await page.locator('[data-testid="new-event-end-input"] input').fill(end);
  await selectRoom(page, "Sanctuary");
  const warnings = page.locator('[data-testid="new-event-conflict-warnings"]');
  await expect(warnings).toBeVisible({ timeout: 15000 });
  await expect(warnings).toContainText(`from ${startText}`);
});

for (const path of ["/calendars", "/calendars/CAL00000004"]) {
  test(`one pending approval reads singular on ${path}`, async ({ page }) => {
    await page.route(/\/content\/eventBookings\/pending/, (route) => route.fulfill({ json: [{ id: "EB000000003", status: "pending" }] }));
    await page.route(/\/content\/events\/pending/, (route) => route.fulfill({ json: [] }));
    await page.goto(path);
    const link = page.locator('[data-testid="pending-approvals-link"]');
    await expect(link).toBeVisible({ timeout: 15000 });
    await expect(link).toHaveText("1 pending approval");
  });
}
