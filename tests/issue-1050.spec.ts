import type { Page } from "@playwright/test";
import { siteTest as test, expect } from "./helpers/test-fixtures";
import { login } from "./helpers/auth";
import { navigateToSite } from "./helpers/navigation";
import { STORAGE_STATE_PATH } from "./global-setup";

// Issue 1050: a section's Link Color is stored and turned into a linksX class on the
// section, but B1Admin's editor never shipped the .linksX a rules that B1App has, so
// links keep the app-wide blue.
test.describe.serial("Issue 1050 - section link color", () => {
  test.describe.configure({ retries: 0 });

  const PAGE_NAME = "Zacchaeus Link Color Page";
  const LINK_TEXT = "Zacchaeus Sample Link";

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

  test("applies the chosen section link color to links in the editor", async () => {
    await page.locator('[data-testid="add-page-button"]').click();
    await page.locator('[name="title"]').fill(PAGE_NAME);
    const pagePost = page.waitForResponse(r => r.url().includes("/content/pages") && r.request().method() === "POST", { timeout: 15000 });
    await page.locator("button").getByText("Save").click();
    await pagePost;
    await expect(page.locator("td").getByText(PAGE_NAME)).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[name="title"]')).toHaveCount(0);

    const row = page.locator("tr").filter({ hasText: PAGE_NAME }).first();
    await row.locator('[data-testid="edit-page-button"]').click();
    await page.locator("button").getByText("Edit Content").click();
    const addBtn = page.locator('[data-testid="content-editor-add-button"]');
    await expect(addBtn).toBeVisible({ timeout: 30000 });

    // Blank section to hold the link.
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

    // Raw HTML element carrying a plain anchor.
    const htmlCard = page.locator('[data-testid="draggable-element-rawHTML"]');
    if (!(await htmlCard.isVisible({ timeout: 500 }).catch(() => false))) await addBtn.click();
    await expect(htmlCard).toBeVisible({ timeout: 10000 });
    await htmlCard.click();
    const htmlInput = page.locator('textarea[name="rawHTML"]').first();
    await expect(htmlInput).toBeVisible({ timeout: 10000 });
    await htmlInput.fill(`<p><a href="https://example.org">${LINK_TEXT}</a></p>`);
    const elementPost = page.waitForResponse(r => r.url().endsWith("/content/elements") && r.request().method() === "POST", { timeout: 15000 });
    await page.locator("button").getByText("Save").click();
    expect((await elementPost).status()).toBe(200);

    const link = page.locator(`a:has-text("${LINK_TEXT}")`).first();
    await expect(link).toBeVisible({ timeout: 10000 });

    // Section settings -> Custom -> Link Color -> darkAccent (4th palette swatch).
    const sectionWrapper = page.locator(".sectionEditWrapper").filter({ hasText: LINK_TEXT }).first();
    await sectionWrapper.hover();
    const settingsBtn = sectionWrapper.locator('[data-testid="section-toolbar-settings"]');
    await expect(settingsBtn).toBeVisible({ timeout: 10000 });
    await settingsBtn.click();
    const detailsBox = page.locator("#sectionDetailsBox");
    await expect(detailsBox).toBeVisible({ timeout: 10000 });
    await detailsBox.getByRole("tab", { name: "Custom" }).click();
    const linkLabel = detailsBox.locator("label").filter({ hasText: "Link Color" }).first();
    await expect(linkLabel).toBeVisible({ timeout: 10000 });
    await linkLabel.locator("xpath=../following-sibling::table[1]//a").nth(3).click();
    const sectionPost = page.waitForResponse(r => r.url().endsWith("/content/sections") && r.request().method() === "POST", { timeout: 15000 });
    await detailsBox.locator("button").getByText("Save").click();
    expect((await sectionPost).status()).toBe(200);

    const linkAfter = page.locator(`a:has-text("${LINK_TEXT}")`).first();
    await expect(linkAfter).toBeVisible({ timeout: 10000 });
    await expect(page.locator(".section.linksDarkAccent").first()).toBeVisible({ timeout: 10000 });

    const expected = await page.evaluate(() => {
      const probe = document.createElement("span");
      probe.style.color = "var(--darkAccent)";
      document.body.appendChild(probe);
      const value = getComputedStyle(probe).color;
      probe.remove();
      return value;
    });
    await expect(linkAfter).toHaveCSS("color", expected);
  });
});
