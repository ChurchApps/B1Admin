import type { Page } from "@playwright/test";
import { peopleTest as test, expect } from "./helpers/test-fixtures";

async function openAdvancedPanel(page: Page) {
  await page.locator("#peopleSearch").getByRole("button", { name: "Advanced", exact: true }).click();
  await expect(page.locator('#peopleSearch input[type="checkbox"]').first()).toBeVisible({ timeout: 10000 });
}

async function setNameFilter(page: Page, index: number, value: string, operator?: string) {
  await page.locator('#peopleSearch input[type="checkbox"]').nth(index).click();
  if (operator) {
    await page.locator('#peopleSearch div[aria-haspopup="listbox"]').nth(index).click();
    await page.locator(`li[data-value="${operator}"]`).click();
  }
  await page.locator('#peopleSearch input[placeholder="Enter value..."]').nth(index).fill(value);
  await page.waitForResponse(
    (response) => response.url().includes("/people/advancedSearch") && response.status() === 200,
    { timeout: 10000 }
  );
}

async function openSaveListDialog(page: Page, name: string) {
  const saveBtn = page.getByRole("button", { name: "Save as List" });
  await expect(saveBtn).toBeVisible({ timeout: 10000 });
  await saveBtn.click();
  const dialog = page.getByRole("dialog").filter({ hasText: "Save as List" });
  await expect(dialog).toBeVisible({ timeout: 10000 });
  await dialog.getByRole("textbox", { name: "List Name" }).fill(name);
  return dialog;
}

async function confirmSaveList(page: Page) {
  const saved = page.waitForResponse(
    (response) => response.url().includes("/lists") && response.request().method() === "POST" && response.status() === 200,
    { timeout: 10000 }
  );
  await page.getByTestId("save-list-confirm").click();
  await saved;
}

function savedListRow(page: Page, name: string) {
  return page.getByTestId("saved-list-row").filter({ hasText: name });
}

test.describe("People Saved Lists", () => {

  test("should save an advanced filter as a list and re-open it", async ({ page }) => {
    const listName = `E2E All ${Date.now()}`;
    await openAdvancedPanel(page);
    await setNameFilter(page, 0, "Donald", "equals");
    await expect(page.locator("table tbody tr").filter({ hasText: "Donald Clark" }).first()).toBeVisible({ timeout: 10000 });

    await openSaveListDialog(page, listName);
    await confirmSaveList(page);
    const row = savedListRow(page, listName);
    await expect(row).toBeVisible({ timeout: 10000 });

    await page.locator("span").getByText("Clear All").click();
    await expect(page.locator("span").getByText("1 active:")).toHaveCount(0);
    const reSearched = page.waitForResponse(
      (response) => response.url().includes("/people/advancedSearch") && response.status() === 200,
      { timeout: 10000 }
    );
    await row.locator("button").first().click();
    await reSearched;
    await expect(page.locator("span").getByText("1 active:")).toHaveCount(1, { timeout: 10000 });
    await expect(page.locator("table tbody tr").filter({ hasText: "Donald Clark" }).first()).toBeVisible({ timeout: 10000 });
  });

  test("should evaluate a match-any list server-side", async ({ page }) => {
    const listName = `E2E Any ${Date.now()}`;
    await openAdvancedPanel(page);
    await setNameFilter(page, 0, "Mar");
    await setNameFilter(page, 1, "Jackson");

    const dialog = await openSaveListDialog(page, listName);
    await dialog.getByTestId("save-list-match").click();
    await page.getByRole("option", { name: "Any filter" }).click();
    await confirmSaveList(page);

    const evaluated = page.waitForResponse(
      (response) => /\/lists\/[^/]+\/people/.test(response.url()) && response.status() === 200,
      { timeout: 10000 }
    );
    await savedListRow(page, listName).locator("button").first().click();
    await evaluated;
    await expect(page.locator("table tbody tr").filter({ hasText: "Nicole Jackson" }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("table tbody tr").filter({ hasText: "Marcus Jackson" }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("table tbody tr").filter({ hasText: "Donald Clark" })).toHaveCount(0, { timeout: 10000 });
  });

  test("should include household children when the list says so", async ({ page }) => {
    const listName = `E2E Household ${Date.now()}`;
    await openAdvancedPanel(page);
    await setNameFilter(page, 0, "Marcus", "equals");
    await expect(page.locator("table tbody tr").filter({ hasText: "Marcus Jackson" }).first()).toBeVisible({ timeout: 10000 });

    const dialog = await openSaveListDialog(page, listName);
    await dialog.getByTestId("save-list-household").click();
    await page.getByRole("option", { name: "Children of matches" }).click();
    await confirmSaveList(page);

    const evaluated = page.waitForResponse(
      (response) => /\/lists\/[^/]+\/people/.test(response.url()) && response.status() === 200,
      { timeout: 10000 }
    );
    await savedListRow(page, listName).locator("button").first().click();
    await evaluated;
    await expect(page.locator("table tbody tr").filter({ hasText: "Marcus Jackson" }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("table tbody tr").filter({ hasText: "Jordan Jackson" }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("table tbody tr").filter({ hasText: "Grace Jackson" }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("table tbody tr").filter({ hasText: "Nicole Jackson" })).toHaveCount(0, { timeout: 10000 });
    await expect(page.locator("table tbody tr").filter({ hasText: "Dorothy Jackson" })).toHaveCount(0, { timeout: 10000 });
  });

  test("should save a private list and edit it via list settings", async ({ page }) => {
    const listName = `E2E Private ${Date.now()}`;
    const renamed = `${listName} Renamed`;
    await openAdvancedPanel(page);
    await setNameFilter(page, 0, "Donald", "equals");

    const dialog = await openSaveListDialog(page, listName);
    await dialog.getByTestId("save-list-sharing").click();
    await page.getByRole("option", { name: "Only me" }).click();
    await confirmSaveList(page);

    const row = savedListRow(page, listName);
    await expect(row).toBeVisible({ timeout: 10000 });
    await expect(row.locator('svg[data-testid="LockIcon"]')).toBeVisible({ timeout: 10000 });

    // Manage icons appear once the list pill is selected.
    await row.locator("button").first().click();
    await row.locator('button[aria-label="List Settings"]').click();
    const settings = page.getByRole("dialog").filter({ hasText: "List Settings" });
    await expect(settings).toBeVisible({ timeout: 10000 });
    await settings.getByRole("textbox", { name: "List Name" }).fill(renamed);
    const saved = page.waitForResponse(
      (response) => response.url().includes("/lists") && response.request().method() === "POST" && response.status() === 200,
      { timeout: 10000 }
    );
    await page.getByTestId("list-settings-save").click();
    await saved;
    await expect(savedListRow(page, renamed)).toBeVisible({ timeout: 10000 });
  });

  test("should delete a saved list", async ({ page }) => {
    const listName = `E2E Delete ${Date.now()}`;
    await openAdvancedPanel(page);
    await setNameFilter(page, 0, "Donald", "equals");

    await openSaveListDialog(page, listName);
    await confirmSaveList(page);
    const row = savedListRow(page, listName);
    await expect(row).toBeVisible({ timeout: 10000 });

    await row.locator("button").first().click();
    await row.locator('button[aria-label="Delete"]').click();
    const confirm = page.getByRole("dialog").filter({ hasText: "Delete List" });
    await expect(confirm).toBeVisible({ timeout: 10000 });
    await confirm.getByRole("button", { name: "Delete" }).click();
    await expect(savedListRow(page, listName)).toHaveCount(0, { timeout: 10000 });
  });
});
