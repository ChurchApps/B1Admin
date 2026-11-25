import fs from "fs";
import type { Page, Response } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";
import { parseCsv } from "../src/helpers/parseCsv";

// The People CSV export adds one column per custom field, formatted the way the People list shows it.
// Field definitions and values are stubbed so every field type is covered without creating real fields.
const FIELDS = [
  { id: "zzExpText", name: "Zz Export Shirt Size", fieldType: "Textbox" },
  { id: "zzExpWhole", name: "Zz Export Years", fieldType: "Whole Number" },
  { id: "zzExpDecimal", name: "Zz Export Miles", fieldType: "Decimal" },
  { id: "zzExpDate", name: "Zz Export Joined", fieldType: "Date" },
  { id: "zzExpYesNo", name: "Zz Export Baptized", fieldType: "Yes/No" },
  { id: "zzExpChoice", name: "Zz Export Service", fieldType: "Multiple Choice", choices: JSON.stringify([{ value: "am", text: "Morning" }, { value: "pm", text: "Evening" }]) },
  { id: "zzExpEmpty", name: "Zz Export Nobody", fieldType: "Textbox" },
  // Named like a built-in column, so it must be exported beside it rather than over it.
  { id: "zzExpClash", name: "First Name", fieldType: "Textbox" }
];
// Stored values, as the person edit form saves them.
const STORED: Record<string, string> = { zzExpText: "Large, \"tall\"", zzExpWhole: "12", zzExpDecimal: "3.5", zzExpDate: "2024-05-01", zzExpYesNo: "True", zzExpChoice: "pm", zzExpClash: "Zz Alias" };
const EXPORTED: Record<string, string> = {
  "Zz Export Shirt Size": "Large, \"tall\"",
  "Zz Export Years": "12",
  "Zz Export Miles": "3.5",
  "Zz Export Joined": "5/1/2024",
  "Zz Export Baptized": "Yes",
  "Zz Export Service": "Evening",
  "Zz Export Nobody": "",
  "First Name (custom)": "Zz Alias"
};

const isPeopleList = (r: Response, firstPage: boolean) => /\/membership\/people\/list$/.test(new URL(r.url()).pathname) && r.request().method() === "GET" && r.url().includes("pageSize") === firstPage;

const stubFields = (page: Page, fields: unknown[]) => page.route("**/membership/personfields", (route) => (route.request().method() === "GET" ? route.fulfill({ json: fields }) : route.continue()));

const readExport = (file: string) => {
  const [header, ...rows] = parseCsv(fs.readFileSync(file, "utf8"));
  return { header, records: rows.map((cells) => Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ""])) as Record<string, string>) };
};

const clickExport = async (page: Page) => {
  const download = page.waitForEvent("download", { timeout: 20000 });
  await page.getByTestId("people-export").getByRole("button", { name: /Export/ }).click();
  return readExport(await (await download).path());
};

test.describe("People export custom fields", () => {
  test("adds a column per custom field with the value formatted like the People list", async ({ page }) => {
    let targetId = "";
    let valueRequests = 0;
    let total = 0;
    page.on("response", async (r) => {
      if (!isPeopleList(r, false)) return;
      const body = await r.json().catch((): unknown[] => []);
      if (Array.isArray(body)) total = body.length;
    });
    await stubFields(page, FIELDS);
    await page.route("**/membership/personfieldvalues/field/**", async (route) => {
      valueRequests++;
      const fieldId = new URL(route.request().url()).pathname.split("/").pop() || "";
      await route.fulfill({ json: STORED[fieldId] ? [{ id: "v" + fieldId, personId: targetId, fieldId, value: STORED[fieldId] }] : [] });
    });

    const firstPage = page.waitForResponse((r) => isPeopleList(r, true), { timeout: 20000 });
    await page.goto("/people");
    const [target, other] = await (await firstPage).json();
    targetId = target.id;
    await expect(page.getByTestId("household-row").first()).toBeVisible({ timeout: 15000 });
    // Values are only fetched for an export, never while the page loads.
    expect(valueRequests).toBe(0);

    const { header, records } = await clickExport(page);
    expect(valueRequests).toBe(FIELDS.length);
    expect(total).toBeGreaterThan(0);
    expect(records.length).toBe(total);
    for (const column of Object.keys(EXPORTED)) expect(header).toContain(column);

    const targetRow = records.find((r) => r.Id === targetId);
    expect(targetRow).toBeTruthy();
    for (const [column, value] of Object.entries(EXPORTED)) expect(targetRow?.[column], column).toBe(value);
    expect(targetRow?.["First Name"]).toBe(target.name?.first || "");

    const otherRow = records.find((r) => r.Id === other.id);
    expect(otherRow).toBeTruthy();
    for (const column of Object.keys(EXPORTED)) expect(otherRow?.[column], column).toBe("");
  });

  test("exports search results with custom columns without loading the whole directory", async ({ page }) => {
    let fullDirectoryLoaded = false;
    page.on("response", (r) => { if (isPeopleList(r, false)) fullDirectoryLoaded = true; });
    await stubFields(page, FIELDS.slice(0, 1));
    await page.route("**/membership/personfieldvalues/field/**", (route) => route.fulfill({ json: [] }));

    await page.goto("/people");
    await expect(page.getByTestId("household-row").first()).toBeVisible({ timeout: 15000 });
    const searched = page.waitForResponse((r) => r.url().includes("/people/advancedSearch") && r.status() === 200, { timeout: 20000 });
    await page.locator('input[name="searchText"]').fill("Clark");
    const found = await (await searched).json();
    expect(found.length).toBeGreaterThan(0);
    await expect(page.getByTestId("people-results-bar")).toContainText(new RegExp(`\\b${found.length} (people|person)\\b`), { timeout: 15000 });

    const { header, records } = await clickExport(page);
    expect(header).toContain("Zz Export Shirt Size");
    expect(records.length).toBe(found.length);
    expect(fullDirectoryLoaded).toBe(false);
  });

  test("still exports the built-in columns when the custom field values cannot be loaded", async ({ page }) => {
    let total = 0;
    page.on("response", async (r) => {
      if (!isPeopleList(r, false)) return;
      const body = await r.json().catch((): unknown[] => []);
      if (Array.isArray(body)) total = body.length;
    });
    await stubFields(page, FIELDS);
    await page.route("**/membership/personfieldvalues/field/**", (route) => route.fulfill({ status: 500, json: { message: "Zz values unavailable" } }));

    await page.goto("/people");
    await expect(page.getByTestId("household-row").first()).toBeVisible({ timeout: 15000 });

    // The notice closes itself after a few seconds, so look for it before waiting on the file.
    const download = page.waitForEvent("download", { timeout: 20000 });
    await page.getByTestId("people-export").getByRole("button", { name: /Export/ }).click();
    await expect(page.getByText("Some custom fields could not be loaded and were left out of the export.")).toBeVisible({ timeout: 10000 });
    const { header, records } = readExport(await (await download).path());
    expect(header).toContain("First Name");
    expect(header.filter((h) => h.startsWith("Zz Export") || h.includes("(custom)"))).toEqual([]);
    expect(total).toBeGreaterThan(0);
    expect(records.length).toBe(total);
  });

  test("a church with no custom fields keeps the plain download link and requests no values", async ({ page }) => {
    let valueRequests = 0;
    await stubFields(page, []);
    await page.route("**/membership/personfieldvalues/field/**", (route) => { valueRequests++; return route.fulfill({ json: [] }); });

    await page.goto("/people");
    await expect(page.getByTestId("household-row").first()).toBeVisible({ timeout: 15000 });
    const loaded = page.waitForResponse((r) => isPeopleList(r, false), { timeout: 20000 });
    await page.getByRole("button", { name: "Show All Members" }).click();
    const total = (await (await loaded).json()).length;
    await expect(page.getByTestId("people-results-bar")).toContainText(`${total} people`, { timeout: 15000 });
    await expect(page.getByTestId("people-export").locator("a[download]")).toBeVisible({ timeout: 15000 });

    const { header, records } = await clickExport(page);
    expect(header).toContain("First Name");
    expect(records.length).toBe(total);
    expect(valueRequests).toBe(0);
  });
});
