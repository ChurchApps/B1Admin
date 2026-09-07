import type { Page } from "@playwright/test";
import { settingsTest as test, expect } from "./helpers/test-fixtures";
import { confirmDelete } from "./helpers/fixtures";
import { login } from "./helpers/auth";
import { STORAGE_STATE_PATH } from "./global-setup";

// Issue #1067: archiving a form used to erase the submissions people had already
// made against it — the person's Forms tab (and the person export) lost the whole
// section. Archiving must only stop new submissions, never hide history.
const FORM_ID = "FRM00000001";
const FORM_NAME = "Visitor Information Card";
const PERSON_ID = "PER00000060"; // Jessica Taylor, submitted the visitor card

async function setArchived(page: Page, archived: boolean) {
  await page.goto("/forms");
  if (archived) {
    await page.locator(`[data-testid="archive-form-button-${FORM_ID}"]`).click();
  } else {
    await page.getByRole("tab", { name: /Archived Forms/i }).click();
    await page.locator(`[data-testid="restore-form-button-${FORM_ID}"]`).click();
  }
  await confirmDelete(page);
  const target = archived
    ? page.locator(`[data-testid="archive-form-button-${FORM_ID}"]`)
    : page.locator(`[data-testid="restore-form-button-${FORM_ID}"]`);
  await expect(target).toHaveCount(0, { timeout: 15000 });
}

test.describe.serial("Issue 1067 - archived forms keep submission history", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
  });

  test.afterAll(async () => {
    if (page) await setArchived(page, false).catch(() => { });
    await page?.context().close();
  });

  test("a person's submitted answers stay visible after the form is archived", async () => {
    await setArchived(page, true);

    await page.goto(`/people/${PERSON_ID}`);
    const formsTab = page.getByRole("tab", { name: /^Forms$/ });
    await expect(formsTab).toBeVisible({ timeout: 15000 });
    await formsTab.click();

    await expect(page.getByText(FORM_NAME).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("jessica.taylor@email.com").first()).toBeVisible({ timeout: 15000 });
  });
});
