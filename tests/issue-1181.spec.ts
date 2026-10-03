import type { Page } from "@playwright/test";
import { settingsTest as test, expect } from "./helpers/test-fixtures";

// #1181: merge-field chips on the email template editor must insert at the cursor, and editing mid-text must not eat the rest.
const openNewTemplate = async (page: Page) => {
  await page.goto("/settings/email-templates");
  await page.getByRole("button", { name: "New Template" }).first().click();
  await expect(page.getByText("Insert merge field into subject:")).toBeVisible();
};

const chipsAfter = (page: Page, caption: string) => page.locator("div", { has: page.getByText(caption, { exact: true }) }).last();

test.describe("Issue #1181 email template editor", () => {
  test("subject chip inserts at the cursor", async ({ page }) => {
    await openNewTemplate(page);
    const subject = page.getByLabel("Subject", { exact: true });
    await subject.fill("Hello  welcome");
    await subject.evaluate((el: HTMLInputElement) => { el.focus(); el.setSelectionRange(6, 6); });
    await chipsAfter(page, "Insert merge field into subject:").getByText("First Name", { exact: true }).click();
    await expect(subject).toHaveValue("Hello {{firstName}} welcome");
  });

  test("body chip inserts at the cursor", async ({ page }) => {
    await openNewTemplate(page);
    const body = page.locator(".editor-input[contenteditable='true']").first();
    await body.click();
    await page.keyboard.type("Hello  welcome");
    for (let i = 0; i < 8; i++) await page.keyboard.press("ArrowLeft");
    await chipsAfter(page, "Insert merge field into body:").getByText("First Name", { exact: true }).click();
    await expect(body).toHaveText("Hello {{firstName}} welcome");
    await page.getByRole("button", { name: "Preview" }).click();
    await expect(page.frameLocator("iframe[title='Email preview']").locator("body")).toContainText("Hello John welcome");
  });

  test("backspace in the middle of the body only removes one character", async ({ page }) => {
    await openNewTemplate(page);
    const body = page.locator(".editor-input[contenteditable='true']").first();
    await body.click();
    await page.keyboard.type("Hello world");
    for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("Backspace");
    await expect(body).toHaveText("Helloworld");
  });
});
