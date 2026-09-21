import type { Page } from "@playwright/test";
import { siteTest as test, expect } from "./helpers/test-fixtures";
import { login } from "./helpers/auth";
import { navigateToSite } from "./helpers/navigation";
import { STORAGE_STATE_PATH } from "./global-setup";

// Issue #1110: the website editor's Add Content panel rendered raw translation
// keys ("site.elementAdd.descRow") instead of English text, because the labels
// were pruned out of public/locales/en.json.
test.describe.serial("Issue 1110 - Add Content panel shows English, not locale keys", () => {
  test.describe.configure({ retries: 0 });

  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  const PAGE_NAME = "Zacchaeus Locale Page";

  test("element cards render translated text", async () => {
    await navigateToSite(page);
    await page.locator('[data-testid="add-page-button"]').click();
    await page.locator('[name="title"]').fill(PAGE_NAME);
    const pagePost = page.waitForResponse(r => r.url().includes("/content/pages") && r.request().method() === "POST", { timeout: 15000 });
    await page.locator("button").getByText("Save").click();
    await pagePost;
    const row = page.locator("tr").filter({ hasText: PAGE_NAME }).first();
    await expect(row).toBeVisible({ timeout: 15000 });
    await row.locator('[data-testid="edit-content-button"]').click();

    const addBtn = page.locator('[data-testid="content-editor-add-button"]');
    await expect(addBtn).toBeVisible({ timeout: 30000 });

    const rowElement = page.locator('[data-testid="draggable-element-row"]');
    if (!(await rowElement.isVisible({ timeout: 1000 }).catch(() => false))) await addBtn.click();
    await expect(rowElement).toBeVisible({ timeout: 15000 });

    // The Row card's tooltip/hover description must be English copy, not the dot-path key.
    await expect(rowElement).toHaveAttribute("title", /^(?!site\.).+/);
    await rowElement.hover();
    await expect(rowElement).not.toContainText("site.elementAdd.");

    // No card in the panel may leak a raw locale key through its tooltip or label.
    const cards = page.locator('[data-testid^="draggable-element-"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(10);
    const leaked: string[] = [];
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const title = (await card.getAttribute("title")) || "";
      const text = await card.innerText();
      for (const m of `${title}\n${text}`.matchAll(/\b(?:site|common)\.[A-Za-z0-9_.]+/g)) leaked.push(m[0]);
    }
    expect([...new Set(leaked)].sort(), "raw locale keys visible in the Add Content panel").toEqual([]);
  });
});
