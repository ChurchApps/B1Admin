import fs from "fs";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// The People page only shows the first page of the directory until "Show All Members" is clicked.
// Export from the unfiltered directory must still download everyone, not just that first page.
test.describe("People export", () => {
  test("Export with no search downloads the whole directory", async ({ page }) => {
    let total = 0;
    page.on("response", async (r) => {
      if (/\/membership\/people\/list$/.test(new URL(r.url()).pathname) && r.request().method() === "GET" && !r.url().includes("pageSize")) {
        const body = await r.json().catch((): unknown[] => []);
        if (Array.isArray(body)) total = body.length;
      }
    });
    await page.goto("/people");
    await expect(page.getByTestId("household-row").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: "Show All Members" })).toBeVisible();

    const download = page.waitForEvent("download", { timeout: 20000 });
    await page.getByTestId("people-export").getByRole("button", { name: /Export/ }).click();
    const file = await (await download).path();
    // react-csv quotes every field, so each record is one line.
    const [header, ...rows] = fs.readFileSync(file, "utf8").split(/\r?\n/).filter((l) => l.trim() !== "");

    expect(header).toContain("First Name");
    expect(total).toBeGreaterThan(0);
    expect(rows.length).toBe(total);
    await expect(page.getByTestId("people-results-bar")).toContainText(`${total} people`);
  });

  test("Export from the table with a remembered Z-A sort downloads the whole directory", async ({ page }) => {
    let total = 0;
    page.on("response", async (r) => {
      if (/\/membership\/people\/list$/.test(new URL(r.url()).pathname) && r.request().method() === "GET" && !r.url().includes("pageSize")) {
        const body = await r.json().catch((): unknown[] => []);
        if (Array.isArray(body)) total = body.length;
      }
    });
    await page.addInitScript(() => {
      localStorage.setItem("people.view", "table");
      localStorage.setItem("selectedColumns", JSON.stringify(["displayName"]));
    });
    await page.goto("/people");
    await expect(page.locator("#peopleTable tbody tr").first()).toBeVisible({ timeout: 15000 });
    const nameSort = page.locator("#peopleTable thead .MuiTableSortLabel-root", { hasText: /^Name$/ });
    await nameSort.click();
    await nameSort.click();
    await expect(page.locator("#peopleTable thead th", { hasText: /^Name$/ })).toHaveAttribute("aria-sort", "descending");

    await page.reload();
    await expect(page.locator("#peopleTable tbody tr").first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator("#peopleTable thead th", { hasText: /^Name$/ })).toHaveAttribute("aria-sort", "descending");
    await expect(page.getByRole("button", { name: "Show All Members" })).toBeVisible();

    const download = page.waitForEvent("download", { timeout: 20000 });
    await page.getByTestId("people-export").getByRole("button", { name: /Export/ }).click();
    const file = await (await download).path();
    const [header, ...rows] = fs.readFileSync(file, "utf8").split(/\r?\n/).filter((l) => l.trim() !== "");

    expect(header).toContain("First Name");
    expect(total).toBeGreaterThan(0);
    expect(rows.length).toBe(total);
  });
});
