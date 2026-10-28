import type { Page } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Issue #1407: blockout warning in the church's fallback (Eastern) zone instead of the browser's,
// "1 pending approvals", and no way to give a hand-made task a due date.
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

test("one pending approval reads singular on Calendars", async ({ page }) => {
  await page.route(/\/content\/eventBookings\/pending/, (route) => route.fulfill({ json: [{ id: "EB000000003", status: "pending" }] }));
  await page.route(/\/content\/events\/pending/, (route) => route.fulfill({ json: [] }));
  await page.goto("/calendars");
  const link = page.locator('[data-testid="pending-approvals-link"]');
  await expect(link).toBeVisible({ timeout: 15000 });
  await expect(link).toHaveText("1 pending approval");
});

test("a hand-made task can be given a due date", async ({ page }) => {
  await page.goto("/serving/tasks");
  await page.locator('[data-testid="add-task-button"]').click();
  await expect(page.getByLabel("Due date")).toBeVisible({ timeout: 15000 });

  await page.goto("/serving/tasks/TSK00000001");
  const due = page.locator('[data-testid="task-due-input"] input');
  await expect(due).toBeVisible({ timeout: 15000 });
  await due.fill("2030-01-15");
  await due.blur();
  await page.reload();
  await expect(page.locator('[data-testid="task-due-input"] input')).toHaveValue("2030-01-15", { timeout: 15000 });
});
