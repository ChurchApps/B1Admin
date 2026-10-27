import type { Page } from "@playwright/test";
import { openPrimaryNav } from "./helpers/navigation";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// "Abide With Me" #7 is the marker hymn for this spec. Archive keeps the row, so
// a reset-demo clears anything left behind.
const TITLE = "Abide With Me";

const hymnRow = (page: Page) => page.locator("tbody tr").filter({ has: page.getByRole("cell", { name: TITLE, exact: true }) });

const openHymns = async (page: Page) => {
  await page.goto("/hymns");
  await expect(page.locator("#page-header-title")).toHaveText("Hymns", { timeout: 15000 });
};

test.describe.serial("Hymns", () => {
  test.describe.configure({ retries: 0 });

  test("header jump menu has a Hymns link to /hymns", async ({ page }) => {
    await openPrimaryNav(page);
    const palette = page.getByTestId("command-palette");
    await palette.getByRole("textbox").fill("Hymns");
    const item = palette.getByRole("button", { name: "Hymns", exact: true }).first();
    await item.waitFor({ state: "visible", timeout: 10000 });
    await item.click();
    await page.waitForURL((url) => url.pathname === "/hymns", { timeout: 15000 });
  });

  test("page shows the heading and Add hymn button", async ({ page }) => {
    await openHymns(page);
    await expect(page.getByRole("button", { name: "Add hymn" })).toBeVisible();
  });

  test("saving with an empty title shows an error and does not post", async ({ page }) => {
    await openHymns(page);
    let posted = false;
    page.on("request", (r) => { if (r.method() === "POST" && /\/hymns\/?$/.test(new URL(r.url()).pathname)) posted = true; });
    await page.getByRole("button", { name: "Add hymn" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox", { name: /^Verse text/ }).fill("Test verse line");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog.getByText("Enter a hymn title.")).toBeVisible();
    await page.waitForTimeout(500);
    expect(posted).toBe(false);
    await dialog.getByRole("button", { name: "Cancel" }).click();
  });

  test("add hymn posts the fields and shows a Draft row", async ({ page }) => {
    await openHymns(page);
    await page.getByRole("button", { name: "Add hymn" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("spinbutton", { name: /^Hymn number/ }).fill("7");
    await dialog.getByRole("textbox", { name: /^Title/ }).fill(TITLE);
    await dialog.getByRole("combobox", { name: "Language" }).click();
    await page.getByRole("option", { name: "Yoruba" }).click();
    await dialog.getByRole("textbox", { name: /^Verse text/ }).fill("Test verse line");

    const postReq = page.waitForRequest((r) => r.method() === "POST" && /\/hymns\/?$/.test(new URL(r.url()).pathname), { timeout: 15000 });
    await dialog.getByRole("button", { name: "Save" }).click();
    const body = (await postReq).postDataJSON();
    const hymn = Array.isArray(body) ? body[0] : body;
    expect(hymn.number).toBe(7);
    expect(hymn.title).toBe(TITLE);
    expect(hymn.language).toBe("Yoruba");
    expect(hymn.verses[0].text).toBe("Test verse line");

    const row = hymnRow(page);
    await expect(row).toHaveCount(1, { timeout: 10000 });
    await expect(row.getByRole("cell").nth(0)).toHaveText("7");
    await expect(row.getByRole("cell", { name: "Yoruba", exact: true })).toBeVisible();
    await expect(row.getByRole("cell", { name: "Draft", exact: true })).toBeVisible();
  });

  test("publish posts /hymns/<id>/publish and marks the row Published", async ({ page }) => {
    await openHymns(page);
    const row = hymnRow(page);
    const publishReq = page.waitForRequest((r) => r.method() === "POST" && /\/hymns\/[^/]+\/publish$/.test(new URL(r.url()).pathname), { timeout: 15000 });
    await row.getByRole("button", { name: "Publish hymn" }).click();
    await publishReq;
    await expect(row.getByRole("cell", { name: "Published", exact: true })).toBeVisible({ timeout: 10000 });
  });

  test("archive sends DELETE /hymns/<id> and marks the row Archived", async ({ page }) => {
    await openHymns(page);
    const row = hymnRow(page);
    const deleteReq = page.waitForRequest((r) => r.method() === "DELETE" && /\/hymns\/[^/]+$/.test(new URL(r.url()).pathname), { timeout: 15000 });
    await row.getByRole("button", { name: "Archive hymn" }).click();
    await deleteReq;
    await expect(row.getByRole("cell", { name: "Archived", exact: true })).toBeVisible({ timeout: 10000 });
  });

  test("search keeps matching rows and shows an empty state", async ({ page }) => {
    await openHymns(page);
    const search = page.getByRole("textbox", { name: "Search hymns" });
    await search.fill("Abide");
    await expect(hymnRow(page)).toHaveCount(1);
    await search.fill("zzzz-no-hymn");
    await expect(hymnRow(page)).toHaveCount(0);
    await expect(page.getByText("No hymns found.")).toBeVisible();
  });
});
