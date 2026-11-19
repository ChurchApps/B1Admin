import { request, type Page } from "@playwright/test";
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

const API_BASE = process.env.API_BASE || "http://localhost:8084";

// The demo seed has no donor numbers, so give three people from the first page of the list one through the Api and clear them afterwards.
const DONORS = [
  { last: "Clark", first: "Donald", donorNumber: "1042" },
  { last: "Clark", first: "Carol", donorNumber: "205" },
  { last: "Brown", first: "Daniel", donorNumber: "37" }
];

async function setDonorNumbers(clear: boolean) {
  const ctx = await request.newContext();
  const login = await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  const jwt = (await login.json()).userChurches?.find((uc: any) => uc.church?.id === "CHU00000001")?.jwt as string;
  const headers = { Authorization: "Bearer " + jwt };
  for (const d of DONORS) {
    const found = await (await ctx.get(`${API_BASE}/membership/people/search?term=${encodeURIComponent(d.first + " " + d.last)}`, { headers })).json();
    const match = found.find((p: any) => p.name?.first === d.first && p.name?.last === d.last);
    if (!match) throw new Error(`demo person ${d.first} ${d.last} not found`);
    const person = await (await ctx.get(`${API_BASE}/membership/people/${match.id}`, { headers })).json();
    person.donorNumber = clear ? null : d.donorNumber;
    await ctx.post(`${API_BASE}/membership/people`, { headers, data: [person] });
  }
  await ctx.dispose();
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

  test("a Z-A name sort is kept after a page refresh", async ({ page }) => {
    await openTable(page, ["displayName"]);
    const header = page.locator("#peopleTable thead th", { hasText: /^Name$/ });
    await sortBy(page, "Name");
    await sortBy(page, "Name");
    await expect(header).toHaveAttribute("aria-sort", "descending");

    await page.reload();
    await expect(page.locator("#peopleTable tbody tr").first()).toBeVisible({ timeout: 15000 });
    await expect(header).toHaveAttribute("aria-sort", "descending");
    const desc = await columnValues(page, "Name");
    expect(desc.length).toBeGreaterThan(5);
    expect(isSorted([...desc].reverse(), byText), desc.join(" | ")).toBe(true);
  });

  test("a phone sort is kept after a page refresh", async ({ page }) => {
    await openTable(page, ["displayName", "phone"]);
    await sortBy(page, "Phone");
    const header = page.locator("#peopleTable thead th", { hasText: /^Phone$/ });
    await expect(header).toHaveAttribute("aria-sort", "ascending");

    await page.reload();
    await expect(page.locator("#peopleTable tbody tr").first()).toBeVisible({ timeout: 15000 });
    await expect(header).toHaveAttribute("aria-sort", "ascending");
    const asc = await columnValues(page, "Phone");
    expect(asc.length).toBeGreaterThan(5);
    expect(isSorted(asc, byText), asc.join(" | ")).toBe(true);
  });

  test.describe("donor number column", () => {
    test.beforeAll(async () => { await setDonorNumbers(false); });
    test.afterAll(async () => { await setDonorNumbers(true); });

    test("Donor Number can be picked in Select Columns, shows each number and sorts by it", async ({ page }) => {
      await openTable(page, ["displayName"]);
      await page.getByTestId("columns-button").click();
      await page.getByTestId("column-checkbox-donorNumber").click();
      await page.locator("#fieldsMenu").getByRole("button", { name: "Close" }).click();

      const header = page.locator("#peopleTable thead th", { hasText: /^Donor Number$/ });
      await expect(header).toBeVisible();
      await sortBy(page, "Donor Number");
      await expect(header).toHaveAttribute("aria-sort", "ascending");
      const asc = await columnValues(page, "Donor Number");
      expect(asc.slice(0, 3)).toEqual(["37", "205", "1042"]);
    });
  });
});
