import type { Page } from "@playwright/test";

export async function navigateToPeople(page: Page) {
  await page.click("#primaryNavButton");
  await page.waitForSelector("text=PEOPLE", { state: "visible" });
  await page.click("text=PEOPLE");
  await page.waitForURL(/\/people/, { timeout: 10000 });
  await page.waitForSelector("table", { state: "visible" });
}
