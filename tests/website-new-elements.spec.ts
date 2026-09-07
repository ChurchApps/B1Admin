import type { Page } from "@playwright/test";
import { siteTest as test, expect } from "./helpers/test-fixtures";
import { login } from "./helpers/auth";
import { navigateToSite } from "./helpers/navigation";
import { STORAGE_STATE_PATH } from "./global-setup";

// Exercises the new website-builder element types + section shape dividers.
// Serial: both tests share one page created in beforeAll.
test.describe.serial("Website new elements", () => {
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

  const PAGE_NAME = "Zacchaeus Icon Page";

  const openEditor = async () => {
    await navigateToSite(page);
    const row = page.locator("tr").filter({ hasText: PAGE_NAME }).first();
    await expect(row).toBeVisible({ timeout: 10000 });
    await row.locator('[data-testid="edit-content-button"]').click();
    const addBtn = page.locator('[data-testid="content-editor-add-button"]');
    await expect(addBtn).toBeVisible({ timeout: 30000 });
  };

  const ensurePanelOpen = async (testId: string) => {
    const addBtn = page.locator('[data-testid="content-editor-add-button"]');
    const visible = await page.locator(`[data-testid="${testId}"]`).isVisible({ timeout: 500 }).catch(() => false);
    if (!visible) await addBtn.click();
  };

  test("adds an Icon Feature element and configures it", async () => {
    const addPageBtn = page.locator('[data-testid="add-page-button"]');
    await addPageBtn.click();
    await page.locator('[name="title"]').fill(PAGE_NAME);
    const pagePost = page.waitForResponse(r => r.url().includes("/content/pages") && r.request().method() === "POST", { timeout: 15000 });
    await page.locator("button").getByText("Save").click();
    await pagePost;
    await expect(page.locator("td").getByText(PAGE_NAME)).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[name="title"]')).toHaveCount(0);

    await openEditor();

    // Drop a blank section to hold the element.
    await ensurePanelOpen("draggable-element-section");
    const section = page.locator('[data-testid="draggable-element-section"]');
    await expect(section).toBeVisible({ timeout: 10000 });
    const dropzone = page.locator('div [data-testid="droppable-area"]').first();
    await section.hover();
    await page.mouse.down();
    await page.mouse.move(-10, -10);
    await dropzone.hover();
    await page.mouse.up();
    const blankTemplate = page.locator('[data-testid="template-blank"]');
    await expect(blankTemplate).toBeVisible({ timeout: 10000 });
    await blankTemplate.click();
    await page.locator("button").getByText("Save").click();

    // Click the Icon Feature catalog card — inserts it and opens its edit form.
    await ensurePanelOpen("draggable-element-iconFeature");
    const card = page.locator('[data-testid="draggable-element-iconFeature"]');
    await expect(card).toBeVisible({ timeout: 10000 });
    await card.click();
    const titleInput = page.locator('[data-testid="icon-feature-title-input"] input');
    await expect(titleInput).toBeVisible({ timeout: 10000 });
    await titleInput.fill("Zacchaeus Icon Title");
    const elementPost = page.waitForResponse(r => r.url().endsWith("/content/elements") && r.request().method() === "POST", { timeout: 15000 });
    await page.locator("button").getByText("Save").click();
    expect((await elementPost).status()).toBe(200);

    await expect(page.locator("h3").getByText("Zacchaeus Icon Title")).toBeVisible({ timeout: 10000 });
  });

  test("sets a bottom wave divider on the section", async () => {
    await openEditor();

    const sectionWrapper = page.locator(".sectionEditWrapper").filter({ hasText: "Zacchaeus Icon Title" }).first();
    await expect(sectionWrapper).toBeVisible({ timeout: 10000 });
    await sectionWrapper.hover();
    const settingsBtn = sectionWrapper.locator('[data-testid="section-toolbar-settings"]');
    await expect(settingsBtn).toBeVisible({ timeout: 10000 });
    await settingsBtn.click();

    await expect(page.locator("#sectionDetailsBox")).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: "Shape Dividers" }).click();

    const shapeSelect = page.locator('[data-testid="dividerBottom-shape-select"]');
    await expect(shapeSelect).toBeVisible({ timeout: 10000 });
    await shapeSelect.click();
    await page.getByRole("option", { name: "Wave", exact: true }).click();

    const sectionPost = page.waitForResponse(r => r.url().endsWith("/content/sections") && r.request().method() === "POST", { timeout: 15000 });
    await page.locator("button").getByText("Save").click();
    expect((await sectionPost).status()).toBe(200);

    await expect(page.locator(".sectionDivider svg").first()).toBeVisible({ timeout: 10000 });
  });
});
