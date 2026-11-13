import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Printed giving statements used screen-sized type and spacing with no page-break rules, so a statement
// spilled onto extra sheets and the closing note could land alone on a nearly blank page.
// Demo giving data is 2025: ten donors, five of them (John Smith among them) with 26 split-fund rows.
const countPdfPages = (pdf: Buffer) => (pdf.toString("latin1").match(/\/Type\s*\/Page(?![s\w])/g) || []).length;

test.describe("Giving statement printed page count", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => { window.print = () => {}; });
  });

  // The heading renders before the gift queries and logo settle; a PDF taken then is short a page.
  const waitForStatementData = async (page: import("@playwright/test").Page) => {
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => document.fonts.ready);
  };

  test("a year of split gifts prints on two Letter pages, not three", async ({ page }) => {
    await page.goto("/donations/print/PER00000001?year=2025");
    await expect(page.getByText("2025 Annual Giving Statement")).toBeVisible({ timeout: 15000 });
    await waitForStatementData(page);
    const pdf = await page.pdf({ format: "Letter", preferCSSPageSize: true, printBackground: true });
    expect(countPdfPages(pdf)).toBe(2);
  });

  test("Print All gives the five long statements two sheets and every other donor one", async ({ page }) => {
    await page.goto("/donations/print-all?year=2025");
    await expect(page.getByText("2025 Annual Giving Statement")).toHaveCount(10, { timeout: 15000 });
    await waitForStatementData(page);
    const pdf = await page.pdf({ format: "Letter", preferCSSPageSize: true, printBackground: true });
    expect(countPdfPages(pdf)).toBe(15);
  });
});
