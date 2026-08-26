import type { Page } from "@playwright/test";
import { settingsTest as test, expect } from "./helpers/test-fixtures";
import { login } from "./helpers/auth";
import { navigateToSettings } from "./helpers/navigation";
import { STORAGE_STATE_PATH } from "./global-setup";

// Read-only: previews the Paystack option in Grace's giving settings and cancels, so the Stripe gateway is untouched.
test.describe.serial("Paystack giving settings", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
    await navigateToSettings(page);
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  test("Paystack is selectable and shows key fields, African currencies, GHS fee defaults and the webhook URL", async () => {
    await page.locator('[data-testid="settings-section-giving"]').click();
    const section = page.locator('[data-testid="settings-giving"]');
    await expect(section).toBeVisible({ timeout: 15000 });
    await page.locator('[data-testid="small-button-edit"]').first().dispatchEvent("click");
    const provider = section.getByRole("combobox").first();
    await expect(provider).toBeVisible({ timeout: 10000 });
    await provider.click();
    await page.getByRole("option", { name: "Paystack" }).click();

    await expect(section.getByText(/Copy your Public and Secret keys/i).first()).toBeVisible();
    await expect(section.getByText(/\/donate\/webhook\/paystack\?churchId=/)).toBeVisible();
    await expect(section.getByLabel("Webhook Key")).toHaveCount(0);
    await expect(section.getByLabel("Public Key")).toBeVisible();
    await expect(section.getByLabel("Secret Key")).toBeVisible();

    const currency = section.getByRole("combobox").nth(1);
    await currency.click();
    for (const c of ["NGN", "GHS", "ZAR", "KES"]) await expect(page.getByRole("option", { name: c })).toBeVisible();
    await page.getByRole("option", { name: "GHS" }).click();
    await expect(section.getByLabel(/Flat Rate \[ Credit Card \]/)).toHaveValue("0");
    await expect(section.getByLabel(/Transaction Fee \[ Credit Card \]/)).toHaveValue("1.95");
    await expect(section.getByText("GH₵").first()).toBeVisible();

    await section.locator("button").getByText("Cancel").click();
    await expect(provider).toHaveCount(0, { timeout: 10000 });
    await expect(section.getByText("Stripe").first()).toBeVisible({ timeout: 10000 });
  });
});
