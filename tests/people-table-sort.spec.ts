import { type Page } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Table view sorting: the arrow on a header must match the order of the rows, and columns
// whose cell differs from the raw field (Phone, Campus) must sort by what the cell shows.

async function openTable(page: Page, columns: string[]) {
  await page.addInitScript((cols) => {
    localStorage.setItem("people.view", "table");
    localStorage.setItem("selectedColumns", JSON.stringify(cols));
  }, columns);
  await page.goto("/people");
  await expect(page.locator("#peopleTable tbody tr").first()).toBeVisible({ timeout: 15000 });
}

async function columnValues(page: Page, header: string) {
  const idx = await page.locator("#peopleTable thead th").evaluateAll(
    (els, name) => els.findIndex((el) => (el.textContent || "").trim() === name),
    header
  );
  expect(idx, `${header} column`).toBeGreaterThan(-1);
  const texts = await page.locator(`#peopleTable tbody tr td:nth-child(${idx + 1})`).allInnerTexts();
  return texts.map((t) => t.split("\n")[0].trim()).filter((t) => t !== "");
}

async function sortBy(page: Page, header: string) {
  await page.locator("#peopleTable thead .MuiTableSortLabel-root", { hasText: new RegExp(`^${header}$`) }).click();
}

const isSorted = (values: string[], cmp: (a: string, b: string) => number) => values.every((v, i) => i === 0 || cmp(values[i - 1], v) <= 0);
const byText = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: "base", numeric: true });
const byNumber = (a: string, b: string) => parseInt(a, 10) - parseInt(b, 10);

test.describe("People table sorting", () => {
  test("first click sorts names A-Z and marks the column ascending; second click reverses", async ({ page }) => {
    await openTable(page, ["displayName"]);
    const header = page.locator("#peopleTable thead th", { hasText: /^Name$/ });

    await sortBy(page, "Name");
    await expect(header).toHaveAttribute("aria-sort", "ascending");
    const asc = await columnValues(page, "Name");
    expect(asc.length).toBeGreaterThan(5);
    expect(isSorted(asc, byText), asc.join(" | ")).toBe(true);

    await sortBy(page, "Name");
    await expect(header).toHaveAttribute("aria-sort", "descending");
    const desc = await columnValues(page, "Name");
    expect(isSorted([...desc].reverse(), byText), desc.join(" | ")).toBe(true);
  });

  test("age sorts youngest first, then oldest first", async ({ page }) => {
    await openTable(page, ["displayName", "age"]);
    await sortBy(page, "Age");
    const asc = await columnValues(page, "Age");
    expect(isSorted(asc, byNumber), asc.join(" | ")).toBe(true);
    await sortBy(page, "Age");
    const desc = await columnValues(page, "Age");
    expect(isSorted([...desc].reverse(), byNumber), desc.join(" | ")).toBe(true);
  });

  test("phone sorts by the number shown in the cell", async ({ page }) => {
    await openTable(page, ["displayName", "phone"]);
    await sortBy(page, "Phone");
    const asc = await columnValues(page, "Phone");
    expect(asc.length).toBeGreaterThan(5);
    expect(isSorted(asc, byText), asc.join(" | ")).toBe(true);
  });
});
