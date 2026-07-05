import { test, expect, chromium, type Browser, type Page } from "@playwright/test";
import { login } from "./helpers/auth";
import { STORAGE_STATE_PATH } from "./global-setup";
import { navigateToPeople } from "./helpers/navigation";
import { openPersonRow, SEED_PEOPLE, confirmDelete } from "./helpers/fixtures";

// P-2 Custom fields as first-class schema: define a field, set a value on a
// person (round-trip), then filter by it in Advanced Search. Uses a "Zz"-prefixed
// disposable field name and cleans it up in afterAll (see the FormCard getByRole
// gotcha in workspace memory — Save/Delete are matched by role, not text+force).
const FIELD_NAME = "Zz Playwright Shirt Size";
const FIELD_VALUE = "Large";

test.describe.serial("Custom Fields (P-2)", () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    browser = await chromium.launch();
    const ctx = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await ctx.newPage();
    await login(page);
  });

  test.afterAll(async () => {
    // Best-effort cleanup: delete the disposable field if it still exists.
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

  test("admin can define a custom field", async () => {
    await page.goto("/settings/custom-fields");
    await page.locator('[data-testid="add-custom-field-button"], [data-testid="add-custom-field-button-empty"]').first().click();
    await page.locator('[data-testid="custom-field-name-input"] input').fill(FIELD_NAME);
    // fieldType defaults to "Textbox" — no select interaction needed.
    await page.locator("#customFieldBox").getByRole("button", { name: "Save" }).click();
    await expect(page.locator('[data-testid^="custom-field-row-"]').filter({ hasText: FIELD_NAME }).first()).toBeVisible({ timeout: 10000 });
  });

  test("a value set through the edit form shows in Personal Details", async () => {
    await navigateToPeople(page);
    await openPersonRow(page, SEED_PEOPLE.DONALD);

    await page.getByTestId("edit-person-button").click();
    const form = page.locator("#personDetailsBox");
    await form.locator('[data-testid="person-custom-fields"]').getByLabel(FIELD_NAME).fill(FIELD_VALUE);
    const saved = page.waitForResponse((r) => r.url().includes("/personfieldvalues") && r.request().method() === "POST" && r.status() === 200, { timeout: 10000 }).catch((): null => null);
    await form.getByRole("button", { name: "Save" }).click();
    await saved;

    // Value appears in the read-only Personal Details section...
    await expect(page.getByText(FIELD_VALUE, { exact: true })).toBeVisible({ timeout: 10000 });

    // ...and persists across a reload.
    await page.reload();
    await expect(page.getByText(FIELD_VALUE, { exact: true })).toBeVisible({ timeout: 10000 });
  });

  test("advanced search filters people by the custom field", async () => {
    await navigateToPeople(page);
    await page.locator("text=Advanced").first().click();

    // Expand the Custom Fields accordion so its filter list (incl. the new field) loads.
    await page.getByRole("button", { name: /Custom Fields/ }).click();
    const filterRow = page.locator("div").filter({ hasText: FIELD_NAME }).locator('input[type="checkbox"]').last();
    await filterRow.check();

    const searched = page.waitForResponse((r) => r.url().includes("/people/advancedSearch") && r.status() === 200, { timeout: 10000 }).catch((): null => null);
    // The row's value input sits alongside its operator select; fill by placeholder-agnostic text field.
    await page.getByRole("textbox").filter({ hasNot: page.locator('[name="searchText"]') }).last().fill(FIELD_VALUE);
    await searched;

    await expect(page.locator("table tbody tr").filter({ hasText: SEED_PEOPLE.DONALD })).toBeVisible({ timeout: 10000 });
  });
});
