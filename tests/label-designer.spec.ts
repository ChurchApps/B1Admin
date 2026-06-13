import type { Page } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";
import { login } from "./helpers/auth";
import { STORAGE_STATE_PATH } from "./global-setup";

// Check-in label designer (roadmap 3.3): starter template creation, block
// palette/properties editing on the canvas, save via POST array, set-default
// and delete from the template list.

const TEMPLATE = "Zacchaeus Nametag";

const labelTemplatesPost = (page: Page) => page.waitForResponse((r) => r.url().includes("/labeltemplates") && r.request().method() === "POST" && r.status() === 200);

test.describe.serial("Check-in label designer", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  test("reaches the designer from the Attendance Labels tab", async () => {
    await page.goto("/attendance");
    await page.getByRole("tab", { name: "Labels" }).click();
    await page.waitForURL(/\/attendance\/labels/, { timeout: 15000 });
    await expect(page.locator('[data-testid="add-label"]')).toBeVisible({ timeout: 15000 });
  });

  test("creates a starter nametag template and opens the editor", async () => {
    await page.goto("/attendance/labels");
    await page.locator('[data-testid="add-label"]').click();
    await page.locator('[data-testid="add-nametag-starter"]').click();
    await expect(page.locator('[data-testid="label-canvas"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid^="block-"]')).toHaveCount(4);
  });

  test("adds a text block via the palette and edits its properties", async () => {
    await page.locator('[data-testid="palette-text"]').click();
    await expect(page.locator('[data-testid^="block-"]')).toHaveCount(5);
    await page.locator('[data-testid="prop-text"] input').fill("Zacchaeus Block");
    await expect(page.locator('[data-testid^="block-"]').filter({ hasText: "Zacchaeus Block" })).toBeVisible();
    await page.locator('[data-testid="prop-x"] input').fill("40");
    await expect(page.locator('[data-testid="prop-x"] input')).toHaveValue("40");
  });

  test("saves the template and shows it in the list", async () => {
    await page.locator('[data-testid="template-name-input"] input').fill(TEMPLATE);
    const post = labelTemplatesPost(page);
    await page.getByRole("button", { name: "Save" }).click();
    await post;
    const row = page.locator('[data-testid="labels-table"] tbody tr').filter({ hasText: TEMPLATE });
    await expect(row).toBeVisible({ timeout: 15000 });
    await expect(row).toContainText("Nametag");
    await expect(row).toContainText("3.5");
  });

  test("sets the template as the default for its type", async () => {
    const row = page.locator('[data-testid="labels-table"] tbody tr').filter({ hasText: TEMPLATE });
    const post = labelTemplatesPost(page);
    await row.locator('[data-testid^="default-label-"]').click();
    await post;
    await expect(row).toContainText("Default", { timeout: 15000 });
  });

  test("deletes the template", async () => {
    const row = page.locator('[data-testid="labels-table"] tbody tr').filter({ hasText: TEMPLATE });
    page.once("dialog", async (d) => { await d.accept(); });
    await row.locator('[data-testid^="delete-label-"]').click();
    await expect(page.locator('[data-testid="labels-table"] tbody tr').filter({ hasText: TEMPLATE })).toHaveCount(0, { timeout: 15000 });
  });
});
