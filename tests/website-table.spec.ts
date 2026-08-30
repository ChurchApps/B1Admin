import type { Page } from "@playwright/test";
import { siteTest as test, expect } from "./helpers/test-fixtures";
import { login } from "./helpers/auth";
import { navigateToSite } from "./helpers/navigation";
import { STORAGE_STATE_PATH } from "./global-setup";

// Rows/Columns must only resize the grid once the typed value is committed —
// typing "12" used to truncate the table to 1 row on the intermediate keystroke.
// The table element is never saved, so the demo Home page is left untouched.
test.describe("Website table element", () => {
  test.describe.configure({ retries: 0 });

  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
    await navigateToSite(page);
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  const cellInputs = () => page.locator('[data-testid^="table-cell-"] input');
  const rowsInput = () => page.locator('[data-testid="table-rows-input"] input');
  const colsInput = () => page.locator('[data-testid="table-columns-input"] input');

  test("commits row/column counts on blur or Enter, not per keystroke", async () => {
    // Scope to the Pages table — the Main Navigation sidebar is also a table with a "Home" row.
    const homeRow = page.locator("tr").filter({ has: page.locator('[data-testid="edit-page-button"]') }).filter({ hasText: "Home" }).first();
    await expect(homeRow).toBeVisible({ timeout: 15000 });
    await homeRow.locator('[data-testid="edit-page-button"]').click();
    await page.locator("button").getByText("Edit Content").click();
    const addBtn = page.locator('[data-testid="content-editor-add-button"]');
    await expect(addBtn).toBeVisible({ timeout: 30000 });

    const card = page.locator('[data-testid="draggable-element-table"]');
    // The apphelper site header renders ~20px taller than its layout spacer, so it
    // overlays the top of the editor toolbar and swallows the click.
    await page.addStyleTag({ content: "#site-app-bar { pointer-events: none; }" });
    if (!await card.isVisible().catch(() => false)) await addBtn.click();
    await expect(card).toBeVisible({ timeout: 10000 });
    await card.click();

    // A new table defaults to 4 rows x 2 columns.
    await expect(rowsInput()).toHaveValue("4", { timeout: 10000 });
    await expect(cellInputs()).toHaveCount(8);
    await page.locator('[data-testid="table-cell-3-0-input"] input').fill("keep");

    // Invalid input commits nothing and the field snaps back to the real count.
    await rowsInput().fill("abc");
    await rowsInput().press("Tab");
    await expect(rowsInput()).toHaveValue("4");
    await expect(cellInputs()).toHaveCount(8);
    await rowsInput().fill("");
    await rowsInput().press("Tab");
    await expect(rowsInput()).toHaveValue("4");
    await expect(cellInputs()).toHaveCount(8);

    // Typed a keystroke at a time: the intermediate "1" must not truncate the grid.
    await rowsInput().press("ControlOrMeta+a");
    await rowsInput().pressSequentially("12");
    await rowsInput().press("Tab");
    await expect(cellInputs()).toHaveCount(24);
    await expect(page.locator('[data-testid="table-cell-3-0-input"] input')).toHaveValue("keep");
    await expect(page.locator('[data-testid="table-cell-11-1-input"]')).toHaveCount(1);

    // Enter commits too, and shrinking still truncates once committed.
    await rowsInput().fill("2");
    await rowsInput().press("Enter");
    await expect(cellInputs()).toHaveCount(4);

    // Same rules for columns — the intermediate "1" must not drop column 1.
    await page.locator('[data-testid="table-cell-0-1-input"] input').fill("keep2");
    await colsInput().press("ControlOrMeta+a");
    await colsInput().pressSequentially("12");
    await colsInput().press("Tab");
    await expect(cellInputs()).toHaveCount(24);
    await expect(page.locator('[data-testid="table-cell-0-1-input"] input')).toHaveValue("keep2");
    await expect(page.locator('[data-testid="table-cell-0-11-input"]')).toHaveCount(1);
    await colsInput().fill("abc");
    await colsInput().press("Tab");
    await expect(colsInput()).toHaveValue("12");
    await expect(cellInputs()).toHaveCount(24);
    await colsInput().fill("3");
    await colsInput().press("Enter");
    await expect(cellInputs()).toHaveCount(6);
  });
});
