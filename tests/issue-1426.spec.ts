import { donationsTest as test, expect } from "./helpers/test-fixtures";
import { siblingNav } from "./helpers/navigation";

// ChurchAppsSupport#1426: a fund's Giving Link dialog needs a QR code as well as the URL.
test("Giving Link dialog offers a downloadable QR code of the link", async ({ page }) => {
  await (await siblingNav(page)).getByText("Funds").first().click();
  await page.waitForURL(/\/donations\/funds/, { timeout: 10000 });

  await page.getByRole("row", { name: /General Fund/ }).getByRole("button", { name: "Giving Link" }).click();
  const qr = page.getByTestId("giving-link-qr");
  await expect(qr).toBeVisible({ timeout: 10000 });

  const before = await qr.evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await page.getByTestId("giving-link-amount").fill("50");
  await expect.poll(() => qr.evaluate((c: HTMLCanvasElement) => c.toDataURL())).not.toBe(before);

  const download = page.waitForEvent("download");
  await page.getByTestId("giving-link-download").click();
  expect((await download).suggestedFilename()).toBe("giving-qr-general-fund.png");
});
