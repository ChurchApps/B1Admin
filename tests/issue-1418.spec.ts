import type { Page } from "@playwright/test";
import { siteTest as test, expect } from "./helpers/test-fixtures";
import { navigateToSite, siblingNav } from "./helpers/navigation";

// Issue #1418: website template and editor fixes.

const openNewPageEditor = async (page: Page, title: string) => {
  const addPageButton = page.locator('[data-testid="add-page-button"]');
  await expect(addPageButton).toBeVisible({ timeout: 30000 });
  await addPageButton.click();
  await page.locator('[name="title"]').fill(title);
  const pagePost = page.waitForResponse(r => r.url().includes("/content/pages") && r.request().method() === "POST", { timeout: 15000 });
  await page.locator("button").getByText("Save").click();
  await pagePost;
  const newPageDialog = page.locator('div[role="dialog"]:has-text("New Page")');
  if (await newPageDialog.isVisible()) await newPageDialog.locator("button").getByText("Cancel").click();
  await expect(newPageDialog).toHaveCount(0, { timeout: 10000 });
  const row = page.locator("tr").filter({ hasText: title }).first();
  await expect(row).toBeVisible({ timeout: 10000 });
  await row.locator('[data-testid="edit-content-button"]').click();
  await expect(page.locator('[data-testid="publish-button"]')).toBeVisible({ timeout: 15000 });
};

const addTemplateSection = async (page: Page, key: string) => {
  const section = page.locator('[data-testid="draggable-element-section"]');
  const sectionVisible = await section.isVisible({ timeout: 500 }).catch(() => false);
  if (!sectionVisible) await page.locator('[data-testid="content-editor-add-button"]').click();
  await expect(section).toBeVisible({ timeout: 10000 });
  await section.hover();
  await page.mouse.down();
  await page.mouse.move(-10, -10);
  await page.locator('div [data-testid="droppable-area"]').first().hover();
  await page.mouse.up();
  const treePost = page.waitForResponse(r => r.url().includes("/content/sections/tree") && r.request().method() === "POST", { timeout: 15000 });
  await page.locator(`[data-testid="template-${key}"]`).click();
  expect((await treePost).status()).toBe(200);
};

test.describe("Issue 1418 - website templates and editor", () => {
  test("three-column template sections stack on phones", async ({ page }) => {
    await openNewPageEditor(page, "Zebedee Stack Page");
    await addTemplateSection(page, "serviceTimes");
    await expect(page.getByText("Wednesday 6:30 PM").first()).toBeVisible({ timeout: 10000 });
    // The public site (B1App) is what visitors see on their phones.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto((process.env.B1APP_URL || "http://grace.localtest.me:3301") + "/zebedee-stack-page");
    await expect(page.getByText("Wednesday 6:30 PM").first()).toBeVisible({ timeout: 60000 });
    const column = page.locator(".rowColumn-0").first();
    const rowWidth = await column.locator("xpath=..").evaluate((el) => el.getBoundingClientRect().width);
    const colWidth = await column.evaluate((el) => el.getBoundingClientRect().width);
    expect(colWidth).toBeGreaterThan(rowWidth * 0.8);
  });

  test("template preview only lists nav links it will add", async ({ page }) => {
    await page.locator('[data-testid="start-from-template-button"]').click();
    await page.locator('[data-testid="site-template-classic"]').click();
    await expect(page.getByText("Already exists", { exact: true }).first()).toBeVisible({ timeout: 10000 });
    // Demo data already has Sermons and Give links, so nothing is listed as added.
    await expect(page.getByText(/These links will be added to your navigation menu/)).toHaveCount(0);
  });

  test("Add Link dialog has no Delete button", async ({ page }) => {
    await page.locator('[data-testid="add-navigation-link"]').click();
    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog.getByText("Add Link").first()).toBeVisible({ timeout: 10000 });
    await expect(dialog.getByRole("button", { name: "Delete" })).toHaveCount(0);
  });

  test("suggested palettes text says Save Palette applies it", async ({ page }) => {
    await (await siblingNav(page)).getByText("Appearance", { exact: true }).first().click();
    await page.getByText("Color Palette", { exact: true }).click();
    await expect(page.getByText("Click a palette to load its colors, then click Save Palette to apply it")).toBeVisible({ timeout: 10000 });
  });

  test("button element shows a readable name", async ({ page }) => {
    await openNewPageEditor(page, "Zebedee Button Page");
    await addTemplateSection(page, "findUs");
    await expect(page.getByText("Get Directions").first()).toBeVisible({ timeout: 10000 });
    // The canvas hover label, panel title and breadcrumb all use the same element name.
    const wrapper = page.locator(".elementWrapper[data-el-label]").filter({ hasText: "Get Directions" }).last();
    await expect(wrapper).toHaveAttribute("data-el-label", "Button Link", { timeout: 10000 });
  });

  test("opening the editor again does not add another Initial state", async ({ page }) => {
    await openNewPageEditor(page, "Zebedee History Page");
    await navigateToSite(page);
    await page.locator("tr").filter({ hasText: "Zebedee History Page" }).first().locator('[data-testid="edit-content-button"]').click();
    await expect(page.locator('[data-testid="publish-button"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[data-testid="content-editor-overflow-button"]').click();
    await page.getByText("View history").click();
    await expect(page.getByText("Initial state", { exact: true }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Initial state", { exact: true })).toHaveCount(1);
  });

  test("Discard is not offered right after Publish", async ({ page }) => {
    await openNewPageEditor(page, "Zebedee Publish Page");
    const publishPost = page.waitForResponse(r => /\/content\/pages\/[^/]+\/publish/.test(r.url()) && r.request().method() === "POST", { timeout: 15000 });
    await page.locator('[data-testid="publish-button"]').click();
    expect((await publishPost).status()).toBe(200);
    await expect(page.locator('[data-testid="publish-status-pill"]')).toHaveAttribute("data-status", "published");
    await page.locator('[data-testid="content-editor-overflow-button"]').click();
    await expect(page.getByText("View history")).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="discard-changes-menu-item"]')).toHaveCount(0);
  });
});
