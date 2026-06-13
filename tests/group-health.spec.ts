import type { Page } from "@playwright/test";
import { groupsTest as test, expect } from "./helpers/test-fixtures";
import { login } from "./helpers/auth";
import { navigateToGroups } from "./helpers/navigation";
import { STORAGE_STATE_PATH } from "./global-setup";

// Roadmap 3.6: group health analytics, bulk event creation with holiday skip,
// and the attendance-reminder setting. Serial — bulk-add creates an event the
// later tests read, and the reminder toggle mutates the first group.
test.describe.serial("Group Health & Calendar", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
    await navigateToGroups(page);
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  test.beforeEach(async () => {
    if (!/\/groups$|\/groups\?/.test(page.url())) await navigateToGroups(page);
  });

  const openFirstGroup = async () => {
    await page.locator("table tbody tr a").first().click();
    await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
  };

  test("groups page links to the health comparison view", async () => {
    await page.locator("[data-testid=\"group-health-link\"]").click();
    await page.waitForURL(/\/groups\/health/, { timeout: 10000 });
    const table = page.locator("[data-testid=\"groups-health-table\"]");
    await expect(table).toBeVisible();
    await expect(table.locator("tbody tr").first()).toBeVisible();
    await expect(table.locator("thead")).toContainText("Churn");
  });

  test("group health tab shows stats and demographics", async () => {
    await openFirstGroup();
    await page.getByRole("tab", { name: "Health" }).click();
    const tab = page.locator("[data-testid=\"group-health-tab\"]");
    await expect(tab).toBeVisible();
    await expect(tab).toContainText("Members");
    await expect(tab).toContainText("Joined (90d)");
    await expect(tab).toContainText("Left (90d)");
    await expect(tab).toContainText("Churn (90d)");
    await expect(tab).toContainText("Membership Changes");
  });

  test("bulk-adds weekly events and skips a holiday", async () => {
    await openFirstGroup();
    await page.getByRole("tab", { name: "Calendar" }).click();
    await expect(page.locator("[data-testid=\"group-calendar-tab\"]")).toBeVisible();

    await page.locator("[data-testid=\"bulk-add-events-button\"]").click();
    await page.locator("[data-testid=\"bulk-events-title-input\"] input").fill("Weekly Gathering");
    // Fridays 2026-06-19 .. 2026-07-31: seven dates, the first is Juneteenth.
    await page.locator("[data-testid=\"bulk-events-first-date\"] input").fill("2026-06-19");
    await page.locator("[data-testid=\"bulk-events-last-date\"] input").fill("2026-07-31");

    const dateList = page.locator("[data-testid=\"bulk-events-date-list\"]");
    await expect(dateList.locator("li")).toHaveCount(7);
    await expect(dateList).toContainText("Juneteenth");
    // Skip-holidays defaults on, so the Juneteenth row arrives unchecked.
    await expect(dateList.locator("li").first().locator("input[type=\"checkbox\"]")).not.toBeChecked();

    const saveButton = page.locator("[data-testid=\"bulk-events-save-button\"]");
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
    await expect(saveButton).toBeHidden({ timeout: 10000 });

    const row = page.locator("[data-testid=\"group-calendar-tab\"] tbody tr", { hasText: "Weekly Gathering" });
    await expect(row).toBeVisible();
    await expect(row).toContainText("Weekly");
    await expect(row.locator("td").nth(3)).toHaveText("1"); // one skipped date
  });

  test("deletes the bulk-created event", async () => {
    await openFirstGroup();
    await page.getByRole("tab", { name: "Calendar" }).click();
    const row = page.locator("[data-testid=\"group-calendar-tab\"] tbody tr", { hasText: "Weekly Gathering" });
    await expect(row).toBeVisible();
    page.once("dialog", (dialog) => dialog.accept());
    await row.locator("[data-testid^=\"delete-event-\"]").click();
    await expect(row).toBeHidden({ timeout: 10000 });
  });

  test("saves the attendance-reminder setting", async () => {
    await openFirstGroup();
    await page.locator("[data-testid=\"edit-group-button\"]").click();
    const select = page.locator("[data-testid=\"attendance-reminders-select\"]");
    await expect(select).toBeVisible();
    await select.click();
    await page.getByRole("option", { name: "Yes" }).click();
    await page.getByRole("button", { name: /save/i }).click();

    // Re-enter edit mode and confirm it persisted.
    await page.locator("[data-testid=\"edit-group-button\"]").click();
    await expect(page.locator("[data-testid=\"attendance-reminders-select\"]")).toContainText("Yes");
  });
});
