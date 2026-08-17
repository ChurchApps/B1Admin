import { test, expect } from "@playwright/test";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loggedInTest } from "./helpers/test-fixtures";
import { openPrimaryNav } from "./helpers/navigation";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

test.describe("Issue 992: Reports nav wiring", () => {
  test("primary menu includes a /reports entry", () => {
    const src = readFileSync(path.join(root, "src/components/Header.tsx"), "utf8");
    expect(src).toMatch(/menuItems\.push\(\{\s*url:\s*"\/reports"/);
    expect(src).toMatch(/path\.startsWith\("\/reports"\)/);
    expect(src).toMatch(/"\/reports":\s*"nav-item-reports"/);
  });

  test("secondary menu for /reports lists the landing page and each report", () => {
    const src = readFileSync(path.join(root, "src/helpers/SecondaryMenuHelper.ts"), "utf8");
    expect(src).toContain('path.startsWith("/reports")) result = this.getReportsMenu(path)');
    const method = src.slice(src.indexOf("static getReportsMenu"));
    const urls = [...method.matchAll(/url:\s*"([^"]+)"/g)].map((match) => match[1]);
    expect(urls).toEqual([
      "/reports",
      "/reports/birthdays",
      "/reports/attendanceTrend",
      "/reports/groupAttendance",
      "/reports/dailyGroupAttendance",
      "/reports/donationSummary"
    ]);
  });
});

loggedInTest.describe("Issue 992: Reports in primary navigation", () => {
  loggedInTest("shows Reports in the section menu and opens /reports", async ({ page }) => {
    await openPrimaryNav(page);
    const reports = page.locator('[data-testid="nav-item-reports"]');
    await expect(reports).toBeVisible({ timeout: 10000 });
    await reports.click();
    await expect(page).toHaveURL(/\/reports/);
    await page.screenshot({ path: "test-results/issue-992-nav.png" });
  });
});
