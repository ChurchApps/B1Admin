import type { Page } from "@playwright/test";
import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";
import { STORAGE_STATE_PATH } from "./global-setup";

// Editable scheduling matrix (Services/Music parity #5). Drives the demo Sunday
// Service plan type (PLT00000001 / ministry GRP0000000a): plan PLA00000001 is the
// upcoming Sunday in the default range, with POS1-9 filled and Hospitality
// Greeter/Usher as unfilled (red) gap cells to fill, auto-schedule, and email.
// Each test reloads the page so DB state carries forward but UI toggles don't.
test.describe.serial("Serving — Editable Scheduling Matrix", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  const OVERVIEW_URL = "/serving/overview?planTypeId=PLT00000001&ministryId=GRP0000000a";

  const openOverview = async () => {
    await page.goto(OVERVIEW_URL);
    await expect(page.getByRole("row").filter({ hasText: "Usher" }).first()).toBeVisible({ timeout: 20000 });
  };

  const usherRow = () => page.getByRole("row").filter({ hasText: "Usher" }).first();
  const usherCell = () => usherRow().locator('td[data-testid^="matrix-cell-"]');

  test("renders the positions × dates grid with a gap cell", async () => {
    await openOverview();
    await expect(page.getByRole("row").filter({ hasText: "Worship Leader" })).toBeVisible();
    await expect(usherCell()).toHaveText("—"); // unfilled
  });

  test("'Unfilled only' hides fully-staffed rows", async () => {
    await openOverview();
    await page.getByTestId("gaps-only-toggle").click();
    // Worship Leader is filled -> hidden; Usher is a gap -> still visible.
    await expect(page.getByRole("row").filter({ hasText: "Worship Leader" })).toHaveCount(0, { timeout: 10000 });
    await expect(usherRow()).toBeVisible();
  });

  test("person highlight control selects an assigned volunteer", async () => {
    await openOverview();
    await page.getByTestId("highlight-person-select").click();
    const option = page.getByRole("option").nth(1); // [0] is "Everyone"
    await expect(option).toBeVisible({ timeout: 10000 });
    const name = (await option.innerText()).trim();
    await option.click();
    await expect(page.getByTestId("highlight-person-select")).toContainText(name);
  });

  test("clicking a gap cell assigns a volunteer via AssignmentEdit", async () => {
    await openOverview();
    await expect(usherCell()).toHaveText("—");
    await usherCell().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Member name buttons live in the embedded AssignmentEdit's table.
    const memberBtn = dialog.locator("table button").first();
    await expect(memberBtn).toBeVisible({ timeout: 10000 });
    const firstName = (await memberBtn.innerText()).trim().split(" ")[0];

    const post = page.waitForResponse((r) => r.url().includes("/assignments") && r.request().method() === "POST", { timeout: 15000 });
    await memberBtn.click();
    await post;

    // Count-1 position -> AssignmentEdit signals done -> dialog closes.
    await expect(dialog).toHaveCount(0, { timeout: 10000 });
    await expect(usherRow()).toContainText(firstName);
  });

  test("removing the assignment from the cell reopens the gap", async () => {
    await openOverview();
    await expect(usherCell()).not.toHaveText("—"); // filled by previous test
    await usherCell().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 10000 });
    const removeBtn = dialog.locator('[data-testid^="matrix-remove-"]').first();
    await expect(removeBtn).toBeVisible({ timeout: 10000 });

    const del = page.waitForResponse((r) => r.url().includes("/assignments/") && r.request().method() === "DELETE", { timeout: 15000 });
    await removeBtn.click();
    await del;

    await page.getByTestId("matrix-cell-close").click();
    await expect(usherCell()).toHaveText("—", { timeout: 10000 });
  });

  test("cross-plan auto-schedule fills gaps and reports a count", async () => {
    await openOverview();
    const autofill = page.waitForResponse((r) => r.url().includes("/plans/autofill/") && r.request().method() === "POST", { timeout: 20000 });
    await page.getByTestId("matrix-auto-schedule").click();
    await autofill;
    // Snackbar reports at least one plan filled (Usher/Greeter gaps existed).
    await expect(page.getByText(/Auto-scheduled [1-9]/)).toBeVisible({ timeout: 10000 });
  });

  test("'Email Volunteers' posts the consolidated notifyRange request", async () => {
    await openOverview();
    const notify = page.waitForResponse((r) => r.url().includes("/plans/notifyRange") && r.request().method() === "POST", { timeout: 20000 });
    await page.getByTestId("matrix-email-all").click();
    const res = await notify;
    expect(res.status()).toBe(200);
    await expect(page.getByText(/Emailed|No assigned/)).toBeVisible({ timeout: 10000 });
  });
});
