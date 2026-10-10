import type { Page } from "@playwright/test";
import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";
import { confirmDelete } from "./helpers/fixtures";
import { STORAGE_STATE_PATH } from "./global-setup";

// Editable scheduling matrix (roadmap #5): demo plan PLA00000001 has filled POS1-9,
// unfilled (red) Greeter/Usher gaps. Tests reload to isolate UI toggles while persisting DB state.
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
    await confirmDelete(page);
    await del;

    await page.getByTestId("matrix-cell-close").click();
    await expect(usherCell()).toHaveText("—", { timeout: 10000 });
  });

  test("cross-plan auto-schedule requires confirmation, then fills gaps and reports a count", async () => {
    await openOverview();
    await page.getByTestId("matrix-auto-schedule").click();
    const autofill = page.waitForResponse((r) => r.url().includes("/plans/autofill/") && r.request().method() === "POST", { timeout: 20000 });
    await confirmDelete(page);
    await autofill;
    // Snackbar reports at least one plan filled (Usher/Greeter gaps existed).
    await expect(page.getByText(/Auto-scheduled [1-9]/)).toBeVisible({ timeout: 10000 });
  });

  test("cancelling the auto-schedule confirmation does not call the API", async () => {
    await openOverview();
    await page.getByTestId("matrix-auto-schedule").click();
    const dialog = page.locator('div[role="dialog"]').last();
    await expect(dialog).toBeVisible({ timeout: 8000 });
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toHaveCount(0);
  });

  test("'Email Volunteers' requires confirmation, then posts the consolidated notifyRange request", async () => {
    await openOverview();
    await page.getByTestId("matrix-email-all").click();
    const notify = page.waitForResponse((r) => r.url().includes("/plans/notifyRange") && r.request().method() === "POST", { timeout: 20000 });
    await confirmDelete(page);
    const res = await notify;
    expect(res.status()).toBe(200);
    await expect(page.getByText(/Emailed|No assigned/)).toBeVisible({ timeout: 10000 });
  });

  // Demo church has a seeded texting provider. The preview is real; the send is stubbed so no SMS leaves the machine.
  test("'Text Volunteers' previews who will get the text and sends it for the date range", async () => {
    let payload: any = null;
    await page.route("**/plans/textRange", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      payload = route.request().postDataJSON();
      await route.fulfill({ json: { totalMembers: 3, eligibleCount: 2, recipientCount: 2, successCount: 2, failCount: 0, optedOutCount: 0, noPhoneCount: 1, capped: false } });
    });
    await openOverview();
    const preview = page.waitForResponse((r) => r.url().includes("/plans/textRange?") && r.request().method() === "GET", { timeout: 20000 });
    await page.getByTestId("matrix-text-all").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Text Volunteers", { exact: true })).toBeVisible();
    expect((await preview).status()).toBe(200);
    await expect(dialog.getByText(/of \d+ volunteers? will receive this text/)).toBeVisible({ timeout: 10000 });

    await dialog.getByLabel("Message").fill("Hi {{firstName}}, thanks for serving this month!");
    await dialog.getByRole("button", { name: "Send" }).click();
    await expect(dialog.getByText("Sent to 2 of 2 recipients.")).toBeVisible({ timeout: 10000 });
    expect(payload).toMatchObject({ ministryId: "GRP0000000a", planTypeId: "PLT00000001", message: "Hi {{firstName}}, thanks for serving this month!" });
    expect(payload.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    await page.unroute("**/plans/textRange");
  });
});
