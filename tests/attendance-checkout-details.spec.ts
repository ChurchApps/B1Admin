import fs from "fs";
import { request, type Page } from "@playwright/test";
import { groupsTest as test, expect } from "./helpers/test-fixtures";
import { openPersonRow, openSeedGroup, SESSION_GROUP } from "./helpers/fixtures";
import { navigateToPeople } from "./helpers/navigation";

// A child is marked present on a Prayer Team session, then checked out through the Api the way the kiosk does,
// and the visit gets the adult who checked them in (the kiosk saves the adult it looked up).
// The session roster, its CSV, and the child's attendance list all show who checked them in and who picked them up.
const SESSION_DATE = "2025-08-17";
const CHILD = "William Anderson";
const PICKED_UP_BY = "Margaret Thompson";
const CHECKED_IN_BY = { id: "PER00000002", name: "Mary Smith" };

async function selectSession(page: Page, date: string) {
  const [y, m, d] = date.split("-");
  await page.getByTestId("session-year-pills").getByRole("button", { name: y, exact: true }).click({ timeout: 10000 });
  const item = page.getByRole("button").filter({ hasText: `${m}/${d}/${y}` }).first();
  await item.click({ timeout: 10000 });
  await expect(item).toContainText("Active", { timeout: 10000 });
  await expect(page.locator('[data-cy="session-present-msg"]')).toBeVisible({ timeout: 10000 });
}

async function checkOut(visitId: string, checkedOutBy: string, checkedInById: string) {
  const apiBase = process.env.API_BASE || "http://localhost:8084";
  const ctx = await request.newContext();
  const loginRes = await (await ctx.post(`${apiBase}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } })).json();
  const jwt = loginRes.userChurches.find((uc: { church: { id: string } }) => uc.church.id === "CHU00000001").jwt;
  const headers = { Authorization: "Bearer " + jwt };
  const visit = await (await ctx.get(`${apiBase}/attendance/visits/${visitId}`, { headers })).json();
  const saved = await ctx.post(`${apiBase}/attendance/visits`, { headers, data: [{ ...visit, checkedInById }] });
  expect(saved.ok()).toBe(true);
  const res = await ctx.post(`${apiBase}/attendance/visits/checkout`, { headers, data: { visitIds: [visitId], checkedOutBy } });
  expect(res.ok()).toBe(true);
  await ctx.dispose();
}

test.describe("Attendance check-out details", () => {
  test.describe.configure({ mode: "serial" });

  test("session roster and CSV show check-in, who checked the child in, check-out and who picked them up", async ({ page }) => {
    await openSeedGroup(page, SESSION_GROUP);
    await page.getByTestId("group-all-sessions").click();
    await page.locator("button").getByText("New").first().click();
    await page.locator('[data-testid="session-date-input"] input').fill(SESSION_DATE);
    const saveBtn = page.getByRole("button", { name: "Save", exact: true });
    await expect(saveBtn).toBeEnabled({ timeout: 10000 });
    await saveBtn.click();
    await selectSession(page, SESSION_DATE);

    await page.getByRole("checkbox", { name: CHILD }).check();
    const reloaded = page.waitForResponse((r) => r.url().includes("/attendance/visitsessions?sessionId=") && r.request().method() === "GET");
    await page.getByTestId("save-attendance-button").click();
    const visitSessions: { visitId: string; visit?: { personId?: string; checkinTime?: string } }[] = await (await reloaded).json();
    expect(visitSessions).toHaveLength(1);
    expect(visitSessions[0].visit?.checkinTime).toBeTruthy();

    // Before check-out only Checked In is shown.
    await expect(page.getByRole("columnheader", { name: "Checked In", exact: true })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Picked Up By" })).toHaveCount(0);
    await expect(page.getByRole("columnheader", { name: "Checked In By" })).toHaveCount(0);

    await checkOut(visitSessions[0].visitId, PICKED_UP_BY, CHECKED_IN_BY.id);
    await page.reload();
    await selectSession(page, SESSION_DATE);

    const row = page.getByTestId("session-roster-row").filter({ hasText: CHILD });
    await expect(page.getByRole("columnheader", { name: "Checked Out" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("columnheader", { name: "Picked Up By" })).toBeVisible();
    await expect(row.getByTestId("session-checkinTime")).toHaveText(/\d{1,2}:\d{2}/);
    await expect(row.getByTestId("session-checkoutTime")).toHaveText(/\d{1,2}:\d{2}/);
    await expect(row.getByTestId("session-checkedOutBy")).toHaveText(PICKED_UP_BY);
    await expect(page.getByRole("columnheader", { name: "Checked In By" })).toBeVisible();
    await expect(row.getByTestId("session-checkedInBy")).toHaveText(CHECKED_IN_BY.name);
    // A member who was not there gets dashes, not someone else's details.
    const absent = page.getByTestId("session-roster-row").filter({ hasText: "George Thompson" });
    await expect(absent.getByTestId("session-checkedOutBy")).toHaveText("—");
    await expect(absent.getByTestId("session-checkedInBy")).toHaveText("—");

    const downloadPromise = page.waitForEvent("download");
    await page.locator("a[download]").filter({ hasText: "Export" }).click();
    const csv = fs.readFileSync(await (await downloadPromise).path(), "utf8").replace(/^\uFEFF/, "");
    const [header, ...lines] = csv.trim().split(/\r?\n/);
    const cols = header.split(",").map((h) => h.replace(/"/g, ""));
    expect(cols).toEqual(expect.arrayContaining(["checkinTime", "checkedInBy", "checkoutTime", "pickedUpBy", "checkinType"]));
    const childLine = lines.find((l) => l.includes(CHILD));
    expect(childLine).toBeTruthy();
    const cells = childLine!.split(",").map((c) => c.replace(/"/g, ""));
    expect(cells[cols.indexOf("pickedUpBy")]).toBe(PICKED_UP_BY);
    expect(cells[cols.indexOf("checkedInBy")]).toBe(CHECKED_IN_BY.name);
    expect(cells[cols.indexOf("checkoutTime")]).toMatch(/\d{1,2}:\d{2}/);
    expect(cells[cols.indexOf("checkinTime")]).toMatch(/\d{1,2}:\d{2}/);
  });

  test("the child's attendance list shows who checked them in, check-out time and who picked them up", async ({ page }) => {
    await navigateToPeople(page);
    await openPersonRow(page, CHILD);
    await page.getByTestId("person-attendance-all").click();
    await expect(page.getByRole("columnheader", { name: "Checked In", exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("columnheader", { name: "Checked Out" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Picked Up By" })).toBeVisible();
    await expect(page.getByTestId("attendance-checkedOutBy").filter({ hasText: PICKED_UP_BY }).first()).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Checked In By" })).toBeVisible();
    await expect(page.getByTestId("attendance-checkedInBy").filter({ hasText: CHECKED_IN_BY.name }).first()).toBeVisible();
  });
});
