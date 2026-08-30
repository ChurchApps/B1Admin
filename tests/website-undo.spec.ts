import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { login } from "./helpers/auth";
import { confirmDelete } from "./helpers/fixtures";
import { STORAGE_STATE_PATH } from "./global-setup";

// apphelper 1.3.5 collapses #site-header to width 0, so the absolutely positioned
// #site-app-bar (z-index 1201) covers the top ~84px of the content column and swallows
// clicks on PageHeader / EditorToolbar buttons. Drop its pointer events and drive
// navigation by URL instead. Remove once the header layout is fixed upstream.
const DISABLE_APP_BAR_OVERLAY = "#site-app-bar { pointer-events: none !important; }";

async function disableAppBarOverlay(page: Page) {
  await page.addInitScript((css) => {
    const inject = () => {
      if (document.head && !document.getElementById("__test-appbar-overlay__")) {
        const style = document.createElement("style");
        style.id = "__test-appbar-overlay__";
        style.textContent = css;
        document.head.appendChild(style);
      }
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", inject);
    else inject();
  }, DISABLE_APP_BAR_OVERLAY);
}

// ZACCHAEUS is the name used for testing. If you see Zacchaeus entered anywhere, it is a result of these tests.
test.describe.serial("Website undo/redo", () => {
  // Shared page/section chain — a retry would restart mid-way against dirty data.
  test.describe.configure({ retries: 0 });

  let page: Page;
  let pageId: string;

  const sections = () => page.locator('[data-testid="preview-desktop"] .sectionEditWrapper[data-section-id]');
  const undoButton = () => page.getByRole("button", { name: "Undo (Ctrl+Z)" });
  const redoButton = () => page.getByRole("button", { name: "Redo (Ctrl+Shift+Z)" });
  const saveButton = () => page.locator("button").getByText("Save");

  const openContentEditor = async () => {
    await page.goto("/site/pages/" + pageId);
    await expect(page.locator('[data-testid="content-editor-add-button"]')).toBeVisible({ timeout: 15000 });
  };

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await disableAppBarOverlay(page);
    await login(page);
    await page.goto("/site/pages");

    await page.locator('[data-testid="add-page-button"]').click();
    await page.locator('[name="title"]').fill("Zacchaeus Undo Page");
    const pagePost = page.waitForResponse(r => r.url().endsWith("/content/pages") && r.request().method() === "POST", { timeout: 15000 });
    await saveButton().click();
    pageId = (await (await pagePost).json())[0].id;

    // Blank section + one text element gives the chain a section to duplicate and a field to type in.
    await openContentEditor();
    const divider = page.locator('[data-testid="add-section-divider"]').first();
    await divider.hover();
    await divider.locator('[data-testid="add-section-divider-button"]').click();
    await page.locator('[data-testid="template-blank"]').click();
    const sectionPost = page.waitForResponse(r => r.url().endsWith("/content/sections") && r.request().method() === "POST", { timeout: 15000 });
    await saveButton().click();
    await sectionPost;
    await expect(sections()).toHaveCount(1, { timeout: 15000 });

    await page.locator('[data-testid="content-editor-add-button"]').click();
    const textCard = page.locator('[data-testid="draggable-element-text"]');
    await expect(textCard).toBeVisible({ timeout: 10000 });
    await textCard.click();
    const textbox = page.locator('[role="textbox"]');
    await expect(textbox).toBeVisible({ timeout: 10000 });
    await textbox.fill("Zacchaeus Undo Text");
    const elementPost = page.waitForResponse(r => r.url().endsWith("/content/elements") && r.request().method() === "POST", { timeout: 15000 });
    await saveButton().click();
    await elementPost;
    await expect(page.locator("p").getByText("Zacchaeus Undo Text")).toBeVisible({ timeout: 10000 });
  });

  test.afterAll(async () => {
    if (!page) return;
    await page.goto("/site/pages/preview/" + pageId).catch(() => { });
    await page.locator("button").getByText("Page Settings").click({ timeout: 10000 }).catch(() => { });
    await page.locator("button").getByText("Delete").click({ timeout: 10000 }).catch(() => { });
    await confirmDelete(page).catch(() => { });
    await page.context().close();
  });

  test("should undo exactly one mutation", async () => {
    await openContentEditor();
    await expect(sections().first()).toBeVisible({ timeout: 15000 });
    const before = await sections().count();

    // Duplicate writes "Before duplicating section" then "After duplicating section"
    // well inside the 500ms debounce; the fix keeps both, so one Undo lands on "Before".
    const historyPosts = page.waitForResponse(r => r.url().endsWith("/content/pageHistory") && r.request().method() === "POST", { timeout: 15000 })
      .then(() => page.waitForResponse(r => r.url().endsWith("/content/pageHistory") && r.request().method() === "POST", { timeout: 15000 }));
    const duplicatePost = page.waitForResponse(r => r.url().includes("/content/sections/duplicate/") && r.request().method() === "POST", { timeout: 15000 });
    const wrapper = sections().first();
    await wrapper.hover();
    await wrapper.locator('[data-testid="section-toolbar-duplicate"]').click();
    expect((await duplicatePost).status()).toBe(200);
    await expect(sections()).toHaveCount(before + 1, { timeout: 10000 });
    await historyPosts;

    const restore = page.waitForResponse(r => r.url().includes("/content/pageHistory/restore") && r.request().method() === "POST", { timeout: 15000 });
    await expect(undoButton()).toBeEnabled({ timeout: 10000 });
    await undoButton().click();
    expect((await restore).status()).toBe(200);
    await expect(sections()).toHaveCount(before, { timeout: 10000 });
  });

  test("should redo the undone mutation", async () => {
    const before = await sections().count();
    const restore = page.waitForResponse(r => r.url().includes("/content/pageHistory/restore") && r.request().method() === "POST", { timeout: 15000 });
    await expect(redoButton()).toBeEnabled({ timeout: 10000 });
    await redoButton().click();
    expect((await restore).status()).toBe(200);
    await expect(sections()).toHaveCount(before + 1, { timeout: 10000 });

    const undoRestore = page.waitForResponse(r => r.url().includes("/content/pageHistory/restore") && r.request().method() === "POST", { timeout: 15000 });
    await undoButton().click();
    await undoRestore;
    await expect(sections()).toHaveCount(before, { timeout: 10000 });
  });

  test("should still undo with Ctrl+Z when nothing is focused", async () => {
    // Reload so the hook is not still flagged as restoring from the previous test.
    await openContentEditor();
    await expect(sections().first()).toBeVisible({ timeout: 15000 });
    const before = await sections().count();
    const historyPosts = page.waitForResponse(r => r.url().endsWith("/content/pageHistory") && r.request().method() === "POST", { timeout: 15000 })
      .then(() => page.waitForResponse(r => r.url().endsWith("/content/pageHistory") && r.request().method() === "POST", { timeout: 15000 }));
    const duplicatePost = page.waitForResponse(r => r.url().includes("/content/sections/duplicate/") && r.request().method() === "POST", { timeout: 15000 });
    const wrapper = sections().first();
    await wrapper.hover();
    await wrapper.locator('[data-testid="section-toolbar-duplicate"]').click();
    expect((await duplicatePost).status()).toBe(200);
    await expect(sections()).toHaveCount(before + 1, { timeout: 10000 });
    await historyPosts;

    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur?.());
    const restore = page.waitForResponse(r => r.url().includes("/content/pageHistory/restore") && r.request().method() === "POST", { timeout: 15000 });
    await page.keyboard.press("Control+z");
    expect((await restore).status()).toBe(200);
    await expect(sections()).toHaveCount(before, { timeout: 10000 });
  });

  test("should leave Ctrl+Z to the focused text field", async () => {
    await openContentEditor();
    await expect(sections().first()).toBeVisible({ timeout: 15000 });
    const before = await sections().count();
    await page.locator("p").getByText("Zacchaeus Undo Text").first().click();
    const textbox = page.locator('[role="textbox"]');
    await expect(textbox).toBeVisible({ timeout: 10000 });
    await textbox.click();
    await page.keyboard.type(" Typed");
    await expect(textbox).toContainText("Zacchaeus Undo Text Typed");

    let restoreCalls = 0;
    page.on("request", r => { if (r.url().includes("/content/pageHistory/restore")) restoreCalls++; });
    await page.keyboard.press("Control+z");
    await expect(textbox).not.toContainText(" Typed");
    await expect(sections()).toHaveCount(before);
    expect(restoreCalls).toBe(0);

    await page.locator('[data-testid="property-panel-close"]').click();
    const discard = page.locator('[data-testid="discard-element-dialog"]');
    await discard.locator("button").getByText("Discard", { exact: true }).click({ timeout: 10000 }).catch(() => { });
  });
});
