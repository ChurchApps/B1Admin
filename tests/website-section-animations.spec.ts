import type { Locator, Page } from "@playwright/test";
import { expect, loggedInTest as test } from "./helpers/test-fixtures";
import { navigateToSite } from "./helpers/navigation";
import { STORAGE_STATE_PATH } from "./global-setup";
import { login } from "./helpers/auth";

// Covers the save/cancel contract for section animations. Note the canvases do not
// play section animations yet — this only verifies the saved JSON.
test.describe.serial("Section animations", () => {
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

  const openAnimations = async (): Promise<Locator> => {
    await navigateToSite(page);
    await page.locator('[data-testid="edit-page-button"]').first().click();
    await page.locator("button").getByText("Edit Content").click();
    const sectionWrapper = page.locator(".sectionEditWrapper").first();
    await expect(sectionWrapper).toBeVisible({ timeout: 15000 });
    await sectionWrapper.hover();
    await sectionWrapper.locator('[data-testid="section-toolbar-settings"]').click();
    const card = page.locator('[data-testid="edit-section-inputbox"]');
    await expect(card).toBeVisible({ timeout: 10000 });
    await card.getByText("Effect for when element is shown.").click();
    const details = card.locator(".MuiAccordion-root").filter({ hasText: "Effect for when element is shown." }).locator(".MuiAccordionDetails-root");
    await expect(select(details, "onShow")).toBeVisible({ timeout: 10000 });
    return details;
  };

  // The MUI Selects have no accessible name (InputLabel is not linked), so go via the hidden input.
  const select = (details: Locator, name: string) => details.locator(`.MuiInputBase-root:has(input[name="${name}"])`).getByRole("combobox");

  const pickOnShow = async (details: Locator, label: string) => {
    await select(details, "onShow").click();
    await page.getByRole("option", { name: label, exact: true }).click();
  };

  const saveSection = async () => {
    const post = page.waitForResponse(r => r.url().endsWith("/content/sections") && r.request().method() === "POST", { timeout: 15000 });
    await page.locator('[data-testid="edit-section-inputbox"]').getByRole("button", { name: "Save", exact: true }).click();
    const response = await post;
    expect(response.status()).toBe(200);
    return response.request().postDataJSON()[0];
  };

  test("saves the chosen animation with the section", async () => {
    const details = await openAnimations();
    await pickOnShow(details, "Fade In");
    await details.getByRole("button", { name: "Update", exact: true }).click();
    const saved = await saveSection();
    expect(JSON.parse(saved.animationsJSON)).toEqual({ onShow: "fadeIn", onShowSpeed: "normal" });
  });

  test("shows the saved animation when the section is reopened", async () => {
    const details = await openAnimations();
    await expect(select(details, "onShow")).toHaveText("Fade In");
    await expect(select(details, "onShowSpeed")).toHaveText("Normal");
  });

  test("cancel leaves the saved animation untouched", async () => {
    const details = await openAnimations();
    await pickOnShow(details, "Slide Up");
    await details.getByRole("button", { name: "Cancel", exact: true }).click();
    const saved = await saveSection();
    expect(JSON.parse(saved.animationsJSON)).toEqual({ onShow: "fadeIn", onShowSpeed: "normal" });
  });

  test("choosing None clears the saved animation", async () => {
    const details = await openAnimations();
    await pickOnShow(details, "None");
    await details.getByRole("button", { name: "Update", exact: true }).click();
    const saved = await saveSection();
    expect(saved.animationsJSON).toBeUndefined();
  });
});
