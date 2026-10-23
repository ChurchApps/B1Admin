import { type Page, type Route } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// ChurchAppsSupport#1336: session attendance save, phone width, and Setup counts.
// Demo: SES00000001 is the Sunday Morning Service group's 9:00 AM session, with people already marked present.
const SESSION_URL = "/groups/GRP00000001?view=sessions&sessionId=SES00000001";

async function openSession(page: Page) {
  await page.goto(SESSION_URL);
  await expect(page.locator('[data-cy="session-present-msg"]')).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId("session-attendance-status-button")).toBeVisible({ timeout: 10000 });
}

test("warns before the tab closes while attendance is still saving", async ({ page }) => {
  await openSession(page);
  await expect(page.locator('input[type="checkbox"]:checked').first()).toBeVisible({ timeout: 10000 });

  // Hold every save request so the page stays on "Saving…".
  const held: Route[] = [];
  await page.route(/\/attendance\/visitsessions(\/log|\?sessionId=)/, (route) => {
    if (route.request().method() === "GET") return route.continue();
    held.push(route);
  });

  await page.getByTestId("attendance-select-none").click();
  await page.getByTestId("save-attendance-button").click();
  await expect(page.getByTestId("save-attendance-button")).toHaveText("Saving...", { timeout: 10000 });
  // The whole roster goes out at once rather than one person after another.
  await expect.poll(() => held.length, { timeout: 5000 }).toBeGreaterThan(1);

  const warned = await page.evaluate(() => {
    const e = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(e);
    return e.defaultPrevented;
  });
  expect(warned).toBe(true);

  // Abort the held requests so the seeded attendance stays as it was.
  await Promise.all(held.map((r) => r.abort()));
});

test.describe("phone width", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("session card with a service time fits a 390px screen", async ({ page }) => {
    await openSession(page);
    await expect(page.getByTestId("session-print-all-rosters-button")).toBeVisible();
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(390);
  });
});

test("Setup service time count updates right after adding a service time", async ({ page }) => {
  await page.goto("/attendance?view=setup");
  const count = page.locator("span:has(> span:text-is('Service times')) > strong");
  await expect(count).toHaveText("4", { timeout: 10000 });

  await page.locator('[data-testid="add-service-time-button-SER00000003"]').click();
  const box = page.locator("#serviceTimeBox");
  await expect(box).toBeVisible({ timeout: 10000 });
  await box.locator('[data-testid="service-time-name-input"] input').fill("Zacchaeus 1336 Time");
  await box.getByRole("button", { name: "Save" }).click();
  await expect(page.locator("button").getByText("Zacchaeus 1336 Time")).toHaveCount(1, { timeout: 10000 });

  await expect(count).toHaveText("5", { timeout: 10000 });
});
