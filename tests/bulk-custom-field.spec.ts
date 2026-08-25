import { test, expect, chromium, type Browser, type Page } from "@playwright/test";
import { login } from "./helpers/auth";
import { STORAGE_STATE_PATH } from "./global-setup";
import { navigateToPeople } from "./helpers/navigation";
import { confirmDelete } from "./helpers/fixtures";

// Issue #1015: select people in the People list, then Actions > Set Custom Field
// to set a Yes/No custom field on all of them at once.
const FIELD_NAME = "Zz Playwright Newsletter";
const SUFFIX = Date.now().toString();
const LAST_NAME = `BulkCustom${SUFFIX}`;
const PEOPLE = [
  { first: "Priscilla", last: LAST_NAME, email: `bulk-custom-a-${SUFFIX}@example.com` },
  { first: "Aquila", last: LAST_NAME, email: `bulk-custom-b-${SUFFIX}@example.com` }
];

test.describe.serial("Bulk custom field (#1015)", () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    browser = await chromium.launch();
    const ctx = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await ctx.newPage();
    await login(page);
  });

  test.afterAll(async () => {
    await page.goto("/settings/custom-fields").catch(() => { });
    const row = page.locator('[data-testid^="custom-field-row-"]').filter({ hasText: FIELD_NAME }).first();
    if (await row.isVisible({ timeout: 3000 }).catch(() => false)) {
      await row.click();
      await page.locator("#customFieldBox").getByRole("button", { name: "Delete" }).click().catch(() => { });
      await confirmDelete(page).catch(() => { });
      await page.locator("#customFieldBox").waitFor({ state: "hidden", timeout: 10000 }).catch(() => { });
    }
    await browser.close();
  });

  test("setup: a Yes/No custom field and two people", async () => {
    test.slow();
    await page.goto("/settings/custom-fields");
    await page.locator('[data-testid="add-custom-field-button"], [data-testid="add-custom-field-button-empty"]').first().click();
    await page.locator('[data-testid="custom-field-name-input"] input').fill(FIELD_NAME);
    await page.locator('[data-testid="custom-field-type-select"]').click();
    await page.getByRole("option", { name: "Yes/No" }).click();
    await page.locator("#customFieldBox").getByRole("button", { name: "Save" }).click();
    await expect(page.locator('[data-testid^="custom-field-row-"]').filter({ hasText: FIELD_NAME }).first()).toBeVisible({ timeout: 10000 });

    for (const person of PEOPLE) {
      await navigateToPeople(page);
      await page.locator('[name="first"]').fill(person.first);
      await page.locator('[name="last"]').fill(person.last);
      await page.locator('[name="email"]').fill(person.email);
      await page.locator('[type="submit"]').click();
      await page.waitForURL(/\/people\/[^/]+/, { timeout: 20000 });
    }
  });

  test("sets the field on every selected person", async () => {
    test.slow();
    await navigateToPeople(page);
    await page.locator('input[name="searchText"]').fill(LAST_NAME);
    await page.waitForResponse((r) => r.url().includes("/people/advancedSearch") && r.status() === 200, { timeout: 20000 });

    const rows = page.locator("table tbody tr").filter({ hasText: LAST_NAME });
    await expect(rows).toHaveCount(2, { timeout: 20000 });
    for (const person of PEOPLE) {
      await page.locator("table tbody tr").filter({ hasText: `${person.first} ${LAST_NAME}` }).first().getByRole("checkbox").check();
    }

    await page.getByTestId("bulk-actions-button").click();
    await page.getByTestId("bulk-action-custom-field").click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await dialog.getByTestId("bulk-custom-field-select").click();
    await page.getByRole("option", { name: FIELD_NAME }).click();
    await dialog.getByTestId("bulk-custom-value-select").click();
    await page.getByRole("option", { name: "Yes", exact: true }).click();

    const saved = page.waitForResponse((r) => r.url().includes("/personfieldvalues") && r.request().method() === "POST" && r.status() === 200, { timeout: 20000 });
    await dialog.getByTestId("bulk-custom-field-apply").click();
    await saved;
    await expect(dialog).toHaveCount(0, { timeout: 10000 });

    for (const person of PEOPLE) {
      await navigateToPeople(page);
      await page.locator('input[name="searchText"]').fill(LAST_NAME);
      await page.waitForResponse((r) => r.url().includes("/people/advancedSearch") && r.status() === 200, { timeout: 20000 });
      await page.locator("table tbody tr").filter({ hasText: `${person.first} ${LAST_NAME}` }).first().getByRole("link").first().click();
      await page.waitForURL(/\/people\/[^/]+/, { timeout: 20000 });
      await expect(page.getByText(FIELD_NAME, { exact: true })).toBeVisible({ timeout: 20000 });
      await expect(page.getByText(FIELD_NAME, { exact: true }).locator("xpath=following-sibling::b[1]")).toHaveText("Yes", { timeout: 20000 });
    }
  });
});
