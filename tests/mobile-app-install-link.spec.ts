import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// B1 Mobile settings show the member app's install link with Copy and a downloadable QR code.
test.describe("Mobile app install link", () => {
  test("shows the install link, copies it, and offers a QR code download", async ({ page }) => {
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/mobile/b1-mobile");
    const card = page.getByTestId("app-install-link");
    await expect(card).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("app-install-url")).toHaveText(/^https?:\/\/grace\..+\/mobile\/install$/);

    await page.getByTestId("app-install-copy").click();
    await expect(page.getByTestId("app-install-copy")).toHaveText("Copied");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/\/mobile\/install$/);

    await page.getByTestId("app-install-qr-button").click();
    await expect(page.getByTestId("app-install-qr-dialog")).toBeVisible();
    await expect(page.getByTestId("app-install-qr-canvas")).toBeVisible();
    const download = page.waitForEvent("download");
    await page.getByTestId("app-install-qr-download").click();
    expect((await download).suggestedFilename()).toBe("app-install-qr.png");
  });
});
