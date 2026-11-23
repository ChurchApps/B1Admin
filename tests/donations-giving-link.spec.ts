import { type Page } from "@playwright/test";
import { donationsTest as test, expect } from "./helpers/test-fixtures";
import { siblingNav } from "./helpers/navigation";

// Giving-page link (no fund) and the Recurring option on giving links, from the Funds page.

async function openFunds(page: Page) {
  await (await siblingNav(page)).getByText("Funds").first().click();
  await page.waitForURL(/\/donations\/funds/, { timeout: 10000 });
}

test.describe("Donations — giving links", () => {
  test("Giving Page Link gives the plain /donate link and its QR, with no fund or amount", async ({ page }) => {
    await openFunds(page);
    await page.getByTestId("giving-page-link-button").click();

    const urlField = page.getByTestId("giving-link-url");
    await expect(urlField).toBeVisible({ timeout: 10000 });
    await expect(urlField).toHaveValue(/\/donate$/);
    await expect(page.getByTestId("giving-link-amount")).toHaveCount(0);
    await expect(page.getByTestId("giving-link-qr")).toBeVisible();

    const download = page.waitForEvent("download");
    await page.getByTestId("giving-link-download").click();
    expect((await download).suggestedFilename()).toBe("giving-qr-donate.png");

    await page.getByTestId("close-giving-link").click();
    await expect(urlField).toHaveCount(0);
  });

  test("Recurring adds ?recurring=1 to the giving-page link and redraws the QR", async ({ page }) => {
    await openFunds(page);
    await page.getByTestId("giving-page-link-button").click();

    const urlField = page.getByTestId("giving-link-url");
    const qr = page.getByTestId("giving-link-qr");
    await expect(urlField).toHaveValue(/\/donate$/, { timeout: 10000 });
    const qrBefore = await qr.evaluate((c: HTMLCanvasElement) => c.toDataURL());

    const recurring = page.getByTestId("giving-link-recurring").locator("input");
    await recurring.check();
    await expect(urlField).toHaveValue(/\/donate\?recurring=1$/);
    await expect.poll(() => qr.evaluate((c: HTMLCanvasElement) => c.toDataURL())).not.toBe(qrBefore);

    await recurring.uncheck();
    await expect(urlField).toHaveValue(/\/donate$/);
  });

  test("Recurring is added after the fund and amount on a fund's giving link", async ({ page }) => {
    await openFunds(page);
    await page.getByRole("row", { name: /General Fund/ }).getByRole("button", { name: "Giving Link" }).click();

    const urlField = page.getByTestId("giving-link-url");
    await expect(urlField).toHaveValue(/\/donate\?fundId=FUN00000001$/, { timeout: 10000 });
    await page.getByTestId("giving-link-amount").fill("50");
    await page.getByTestId("giving-link-recurring").locator("input").check();
    await expect(urlField).toHaveValue(/\/donate\?fundId=FUN00000001&amount=50&recurring=1$/);
  });
});
