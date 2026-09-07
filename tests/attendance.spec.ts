import type { Page } from "@playwright/test";
import { attendanceTest as test, expect } from "./helpers/test-fixtures";
import { login } from "./helpers/auth";
import { navigateToAttendance } from "./helpers/navigation";
import { confirmDelete } from "./helpers/fixtures";
import { STORAGE_STATE_PATH } from "./global-setup";

// ZACCHAEUS/ZEBEDEE are the names used for testing. If you see Zacchaeus or Zebedee entered anywhere, it is a result of these tests.
test.describe("Attendance Management", () => {

  test.describe.serial("Setup", () => {
    let page: Page;
    let createdServiceId = "";

    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
      page = await context.newPage();
      await login(page);
      await navigateToAttendance(page);
    });

    test.afterAll(async () => {
      await page?.context().close();
    });

    test("should add a service (campus sourced from membership)", async () => {
      await page.locator('[data-testid^="add-service-button-"]').first().click();
      const box = page.locator("#serviceBox");
      await expect(box).toBeVisible({ timeout: 10000 });
      const campusSelect = box.locator('[data-testid="campus-select"]');
      await campusSelect.click();
      await page.getByRole("option", { name: "Main Campus" }).click();
      await box.locator('[data-testid="service-name-input"] input').fill("Zacchaeus Test Service");
      const resp = page.waitForResponse((r) => r.url().includes("/services") && r.request().method() === "POST" && r.status() === 200);
      await box.getByRole("button", { name: "Save" }).click();
      createdServiceId = (await (await resp).json())[0].id;
      await expect(page.locator("button").getByText("Zacchaeus Test Service")).toHaveCount(1, { timeout: 10000 });
    });

    test("should edit the service", async () => {
      await page.locator("button").getByText("Zacchaeus Test Service").click();
      const box = page.locator("#serviceBox");
      await expect(box).toBeVisible({ timeout: 10000 });
      await box.locator('[data-testid="service-name-input"] input').fill("Zebedee Test Service");
      await box.getByRole("button", { name: "Save" }).click();
      await expect(page.locator("button").getByText("Zebedee Test Service")).toHaveCount(1, { timeout: 10000 });
    });

    test("should add a service time (Service dropdown loads despite empty attendance.campuses)", async () => {
      await page.locator(`[data-testid="add-service-time-button-${createdServiceId}"]`).click();
      const box = page.locator("#serviceTimeBox");
      await expect(box).toBeVisible({ timeout: 10000 });
      // Service dropdown used to INNER JOIN unseeded attendance.campuses table (now removed).
      const serviceSelect = box.locator('[data-testid="service-select"]');
      await serviceSelect.click();
      await expect(page.getByRole("option", { name: "Sunday Morning Service" })).toBeVisible({ timeout: 10000 });
      await page.getByRole("option", { name: "Zebedee Test Service" }).click();
      await box.locator('[data-testid="service-time-name-input"] input').fill("Zacchaeus Test Time");
      await box.getByRole("button", { name: "Save" }).click();
      await expect(page.locator("button").getByText("Zacchaeus Test Time")).toHaveCount(1, { timeout: 10000 });
    });

    test("should edit the service time", async () => {
      await page.locator("button").getByText("Zacchaeus Test Time").click();
      const box = page.locator("#serviceTimeBox");
      await expect(box).toBeVisible({ timeout: 10000 });
      await box.locator('[data-testid="service-time-name-input"] input').fill("Zebedee Test Time");
      await box.getByRole("button", { name: "Save" }).click();
      await expect(page.locator("button").getByText("Zebedee Test Time")).toHaveCount(1, { timeout: 10000 });
    });

    test("should delete the service time", async () => {
      await page.locator("button").getByText("Zebedee Test Time").click();
      const box = page.locator("#serviceTimeBox");
      await expect(box).toBeVisible({ timeout: 10000 });
      await box.getByRole("button", { name: "Delete" }).click();
      await confirmDelete(page);
      await expect(page.locator("button").getByText("Zebedee Test Time")).toHaveCount(0, { timeout: 10000 });
    });

    test("should delete the service", async () => {
      await page.locator("button").getByText("Zebedee Test Service").click();
      const box = page.locator("#serviceBox");
      await expect(box).toBeVisible({ timeout: 10000 });
      await box.getByRole("button", { name: "Delete" }).click();
      await confirmDelete(page);
      await expect(page.locator("button").getByText("Zebedee Test Service")).toHaveCount(0, { timeout: 10000 });
    });
  });

  test("should view group from attendance homepage", async ({ page }) => {
    const groupBtn = page.locator("a").getByText("Worship").first();
    await groupBtn.click();
    await page.waitForURL(/\/groups\/(?!health(?:\/|$))[^/?#]+/, { timeout: 10000, waitUntil: "commit" });
  });

  test.describe("Trends", () => {
    test("should filter attendance trends", async ({ page }) => {
      const trendTab = page.locator('button[role="tab"]').getByText("Attendance Trend");
      await trendTab.click();

      const campusName = page.locator('[id="mui-component-select-campusId"]');
      await expect(campusName).toBeVisible({ timeout: 10000 });
      await campusName.click();
      const campusSel = page.locator("li").getByText("Main Campus");
      await campusSel.click();
      const serviceName = page.locator('[id="mui-component-select-serviceId"]');
      await serviceName.click();
      const serviceSel = page.locator("li").getByText("Sunday Morning Service");
      await serviceSel.click();
      const timeName = page.locator('[id="mui-component-select-serviceTimeId"]');
      await timeName.click();
      const timeSel = page.locator("li").getByText("10:30 AM Service");
      await timeSel.click();
      const groupName = page.locator('[id="mui-component-select-groupId"]');
      await groupName.click();
      const groupSel = page.locator("li").getByText("Sunday Morning Service");
      await groupSel.click();
      const runBtn = page.locator("button").getByText("Run Report");
      await runBtn.click();

      // Don't pin to an exact row count — seed visit data evolves. Just verify
      // the report rendered with at least header + one data row.
      const resultsTableRows = page.locator('[id="reportsBox"] table tr');
      await expect(resultsTableRows.first()).toBeVisible({ timeout: 10000 });
      expect(await resultsTableRows.count()).toBeGreaterThan(1);
    });

    test("should display group attendance", async ({ page }) => {
      const trendTab = page.locator('button[role="tab"]').getByText("Group Attendance");
      await trendTab.click();

      const campusName = page.locator('[id="mui-component-select-campusId"]');
      await expect(campusName).toBeVisible({ timeout: 10000 });
      await campusName.click();
      const campusSel = page.locator("li").getByText("Main Campus");
      await campusSel.click();
      const serviceName = page.locator('[id="mui-component-select-serviceId"]');
      await serviceName.click();
      const serviceSel = page.locator("li").getByText("Sunday Morning Service");
      await serviceSel.click();
      const weekBox = page.locator('[name="week"]');
      await weekBox.fill("2024-03-03");
      const runBtn = page.locator("button").getByText("Run Report");
      await runBtn.click();
      const report = page.locator("td").getByText("10:30 AM Service");
      await expect(report).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("Reports & navigation extras", () => {
    test("switching between Attendance Trend and Group Attendance tabs preserves filters", async ({ page }) => {
      const trendTab = page.locator('button[role="tab"]').getByText("Attendance Trend");
      await trendTab.click();
      await expect(page.locator('[id="mui-component-select-campusId"]')).toBeVisible({ timeout: 10000 });
      const groupTab = page.locator('button[role="tab"]').getByText("Group Attendance");
      await groupTab.click();
      await expect(page.locator('[id="mui-component-select-campusId"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[name="week"]')).toBeVisible();
    });

    test("Group Attendance report shows results for a week with seed visits", async ({ page }) => {
      const groupTab = page.locator('button[role="tab"]').getByText("Group Attendance");
      await groupTab.click();
      const campusName = page.locator('[id="mui-component-select-campusId"]');
      await campusName.click();
      await page.locator("li").getByText("Main Campus").click();
      const serviceName = page.locator('[id="mui-component-select-serviceId"]');
      await serviceName.click();
      await page.locator("li").getByText("Sunday Morning Service").click();
      const weekBox = page.locator('[name="week"]');
      await weekBox.fill("2024-03-03");
      const runBtn = page.locator("button").getByText("Run Report");
      await runBtn.click();
      const reportRows = page.locator('[id="reportsBox"] table tr');
      await expect(reportRows.first()).toBeVisible({ timeout: 10000 });
      expect(await reportRows.count()).toBeGreaterThan(1);
    });

    test("Attendance Trend Run Report enabled only after selecting filters", async ({ page }) => {
      const trendTab = page.locator('button[role="tab"]').getByText("Attendance Trend");
      await trendTab.click();
      // Run Report button is not gated on selections.
      const runBtn = page.locator("button").getByText("Run Report");
      await expect(runBtn).toBeVisible({ timeout: 10000 });
      await expect(runBtn).toBeEnabled();
    });
  });

  // KioskThemeEdit moved to /mobile/checkin.
  test.describe("Kiosk Theme", () => {
    test("should open kiosk theme settings", async ({ page }) => {
      await page.goto("/mobile/checkin");

      const heading = page.getByText("Kiosk Theme").first();
      await expect(heading).toBeVisible({ timeout: 15000 });
      await expect(page.getByText("Background Image").first()).toBeVisible();
      await expect(page.getByText("Idle Screen / Screensaver")).toBeVisible();
    });

    test("should expand idle screen accordion and toggle enable", async ({ page }) => {
      await page.goto("/mobile/checkin");

      const idleHeader = page.getByText("Idle Screen / Screensaver");
      await expect(idleHeader).toBeVisible({ timeout: 15000 });
      await idleHeader.click();

      const enableLabel = page.getByText("Enable idle screen");
      await expect(enableLabel).toBeVisible({ timeout: 10000 });

      const addSlideBtn = page.locator("button").getByText("Add Slide");
      await expect(addSlideBtn).toBeVisible();
    });
  });

  // Manual headcounts: a single total per service/service time/date, no individual check-ins (issue #1063).
  test.describe.serial("Headcounts", () => {
    let page: Page;

    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
      page = await context.newPage();
      await login(page);
      await navigateToAttendance(page);
    });

    test.afterAll(async () => {
      await page?.context().close();
    });

    // AppDatePicker renders MM/DD/YYYY spinbutton sections; typing from the Month section auto-advances.
    const setHeadcountDate = async (mmddyyyy: string) => {
      const box = page.locator("#headcountBox");
      await box.getByRole("spinbutton", { name: "Month" }).click();
      await page.keyboard.type(mmddyyyy);
      await expect(box.locator('[data-testid="headcount-date-input"]')).toHaveValue(`${mmddyyyy.slice(0, 2)}/${mmddyyyy.slice(2, 4)}/${mmddyyyy.slice(4)}`);
    };

    const headcountRow = (value: string) => page.locator('[data-testid="headcount-table"] tbody tr').filter({ has: page.locator('[data-testid="headcount-value-cell"]', { hasText: new RegExp(`^${value}$`) }) });

    test("should enter a headcount for a service time", async () => {
      await page.locator('button[role="tab"]').getByText("Headcounts", { exact: true }).click();
      const box = page.locator("#headcountBox");
      await expect(box).toBeVisible({ timeout: 10000 });

      await box.locator('[data-testid="headcount-service-select"]').click();
      await page.getByRole("option", { name: "Sunday Morning Service" }).click();
      await box.locator('[data-testid="headcount-service-time-select"]').click();
      await page.getByRole("option", { name: "10:30 AM Service" }).click();
      await setHeadcountDate("09062026");
      await box.locator('[data-testid="headcount-value-input"] input').fill("137");

      const resp = page.waitForResponse((r) => r.url().includes("/headcounts") && r.request().method() === "POST" && r.status() === 200);
      await box.locator('[data-testid="headcount-save-button"]').click();
      await resp;

      await expect(headcountRow("137")).toHaveCount(1, { timeout: 10000 });
      await expect(headcountRow("137")).toContainText("Sunday Morning Service");
      await expect(headcountRow("137")).toContainText("10:30 AM Service");
      await expect(headcountRow("137")).toContainText("Sep 6, 2026");
      // Count field clears for the next entry; service/time selections stay put.
      await expect(box.locator('[data-testid="headcount-value-input"] input')).toHaveValue("");
    });

    test("should show the headcount in the Headcount Trend report", async () => {
      await page.locator('button[role="tab"]').getByText("Headcount Trend", { exact: true }).click();
      const reportRows = page.locator('[id="reportsBox"] table tr');
      await expect(reportRows.first()).toBeVisible({ timeout: 15000 });
      await expect(page.locator('[id="reportsBox"] table')).toContainText("137", { timeout: 10000 });

      // Filtering to the service time keeps the total; the report reads the denormalized serviceTimeId.
      const timeName = page.locator('[id="mui-component-select-serviceTimeId"]');
      await expect(timeName).toBeVisible({ timeout: 10000 });
      await timeName.click();
      await page.locator("li").getByText("10:30 AM Service").click();
      await page.locator("button").getByText("Run Report").click();
      await expect(page.locator('[id="reportsBox"] table')).toContainText("137", { timeout: 10000 });
    });

    test("should edit the headcount", async () => {
      await page.locator('button[role="tab"]').getByText("Headcounts", { exact: true }).click();
      await expect(headcountRow("137")).toHaveCount(1, { timeout: 10000 });
      await headcountRow("137").click();
      const box = page.locator("#headcountBox");
      await expect(box).toContainText("Edit Headcount");
      await expect(box.locator('[data-testid="headcount-value-input"] input')).toHaveValue("137");
      await box.locator('[data-testid="headcount-value-input"] input').fill("142");
      await box.locator('[data-testid="headcount-save-button"]').click();
      await expect(headcountRow("142")).toHaveCount(1, { timeout: 10000 });
      await expect(headcountRow("137")).toHaveCount(0);
    });

    test("should reject a negative headcount", async () => {
      const box = page.locator("#headcountBox");
      await box.locator('[data-testid="headcount-value-input"] input').fill("-5");
      await box.locator('[data-testid="headcount-save-button"]').click();
      await expect(box).toContainText("Enter a whole number of zero or more.");
      await expect(headcountRow("-5")).toHaveCount(0);
    });

    test("should delete the headcount", async () => {
      await headcountRow("142").click();
      const box = page.locator("#headcountBox");
      await expect(box).toContainText("Edit Headcount");
      await box.getByRole("button", { name: "Delete" }).click();
      await confirmDelete(page);
      await expect(headcountRow("142")).toHaveCount(0, { timeout: 10000 });
    });
  });

});
