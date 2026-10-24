import { test, expect, type Locator, type Page } from "@playwright/test";
import { mockChurchLogo } from "./helpers/print-logo";

// Issue #1361: in dark mode, printouts keep dark mode's near-white text (faint on white paper),
// report charts print a dark block, and reports / person attendance have no logo letterhead.

const useDarkMode = (page: Page) => page.addInitScript(() => localStorage.setItem("b1admin-theme-mode", "dark"));

// Text that reads on white paper: every channel well below the near-white dark-mode text.
const expectDarkText = async (el: Locator) => {
  const color = await el.evaluate((n) => getComputedStyle(n).color);
  const [r, g, b] = (color.match(/\d+/g) || []).map(Number);
  expect(Math.max(r, g, b), `text color ${color}`).toBeLessThan(110);
};

test("person attendance prints dark text under the church letterhead in dark mode", async ({ page }) => {
  await useDarkMode(page);
  await mockChurchLogo(page);
  await page.goto("/people/PER00000080?view=attendance");
  const sheet = page.locator(".attendance-print");
  await expect(sheet).toBeVisible({ timeout: 15000 });
  await page.emulateMedia({ media: "print" });

  const title = sheet.getByText("Donald Clark — Attendance");
  await expect(title).toBeVisible();
  await expectDarkText(title);
  await expect(sheet.getByTestId("print-church-logo")).toBeVisible();
});

test("attendance trend report prints dark text, a light chart and the letterhead in dark mode", async ({ page }) => {
  await useDarkMode(page);
  await mockChurchLogo(page);
  await page.goto("/reports/attendanceTrend");
  const runBtn = page.locator("button").getByText("Run Report");
  await expect(runBtn).toBeVisible({ timeout: 15000 });
  await runBtn.click();
  const box = page.locator("#reportsBox");
  const cell = box.locator("table td").first();
  await expect(cell).toBeVisible({ timeout: 15000 });
  const chartBg = box.locator(".report-chart-container svg rect").first();
  await expect(chartBg).toBeAttached({ timeout: 15000 });
  await page.emulateMedia({ media: "print" });

  await expectDarkText(cell);
  await expect(box.getByTestId("print-church-logo")).toBeVisible();
  const bg = await chartBg.evaluate((n) => getComputedStyle(n).fill);
  expect(bg, "chart background").not.toBe("rgb(30, 30, 30)");
});
