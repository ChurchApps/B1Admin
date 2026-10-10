import type { Page } from "@playwright/test";
import { siteTest as test, expect } from "./helpers/test-fixtures";
import { login } from "./helpers/auth";
import { navigateToSite } from "./helpers/navigation";
import { STORAGE_STATE_PATH } from "./global-setup";

// Issue 1228: an image URL pasted into the HTML element's JavaScript box runs as a do-nothing
// script, and the editor gave no hint that it belongs in HTML Content or an Image element.
test.describe.serial("Issue 1228 - URL in the HTML element JavaScript box", () => {
  test.describe.configure({ retries: 0 });

  const PAGE_NAME = "Zacchaeus Verse Image Page";

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

  test("warns that a web address is not JavaScript", async () => {
    await page.locator('[data-testid="add-page-button"]').click();
    await page.locator('[name="title"]').fill(PAGE_NAME);
    const pagePost = page.waitForResponse(r => r.url().includes("/content/pages") && r.request().method() === "POST", { timeout: 15000 });
    await page.locator("button").getByText("Save").click();
    await pagePost;
    await expect(page.locator("td").getByText(PAGE_NAME)).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[name="title"]')).toHaveCount(0);

    const row = page.locator("tr").filter({ hasText: PAGE_NAME }).first();
    await row.locator('[data-testid="edit-content-button"]').click();
    const addBtn = page.locator('[data-testid="content-editor-add-button"]');
    await expect(addBtn).toBeVisible({ timeout: 30000 });

    const sectionCard = page.locator('[data-testid="draggable-element-section"]');
    if (!(await sectionCard.isVisible({ timeout: 500 }).catch(() => false))) await addBtn.click();
    await expect(sectionCard).toBeVisible({ timeout: 10000 });
    const dropzone = page.locator('div [data-testid="droppable-area"]').first();
    await sectionCard.hover();
    await page.mouse.down();
    await page.mouse.move(-10, -10);
    await dropzone.hover();
    await page.mouse.up();
    const blankTemplate = page.locator('[data-testid="template-blank"]');
    await expect(blankTemplate).toBeVisible({ timeout: 10000 });
    await blankTemplate.click();
    await page.locator("button").getByText("Save").click();

    const htmlCard = page.locator('[data-testid="draggable-element-rawHTML"]');
    if (!(await htmlCard.isVisible({ timeout: 500 }).catch(() => false))) await addBtn.click();
    await expect(htmlCard).toBeVisible({ timeout: 10000 });
    await htmlCard.click();
    const jsInput = page.locator('textarea[name="javascript"]').first();
    await expect(jsInput).toBeVisible({ timeout: 10000 });
    await jsInput.fill("https://votd.org/v1/280/16x9.jpg");

    await expect(page.getByText(/This is a web address, not JavaScript/)).toBeVisible({ timeout: 10000 });
  });
});
