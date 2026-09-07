import type { Page } from "@playwright/test";
import { settingsTest as test, expect } from "./helpers/test-fixtures";
import { navigateToForms, navigateToPeople } from "./helpers/navigation";
import { openPersonRow, SEED_PEOPLE, confirmDelete } from "./helpers/fixtures";
import { login } from "./helpers/auth";
import { STORAGE_STATE_PATH } from "./global-setup";

const DISPOSABLE_PERSON_FORM = "Zacchaeus Test Person Form";
const DISPOSABLE_STANDALONE_FORM = "Zacchaeus Test Standalone Form";
const DISPOSABLE_STANDALONE_DESCRIPTION = "Sign up here and a Zacchaeus volunteer will call you back.";

async function selectMuiOption(page: import("@playwright/test").Page, openLocator: ReturnType<import("@playwright/test").Page["locator"]>, optionText: string) {
  await openLocator.click();
  const option = page.locator('li[role="option"]', { hasText: optionText }).first();
  await option.waitFor({ state: "visible", timeout: 10000 });
  await option.click();
  await page.locator('[role="listbox"]').waitFor({ state: "hidden", timeout: 10000 }).catch(() => { });
}

async function openFormsPage(page: import("@playwright/test").Page) {
  await navigateToForms(page);
  await expect(page).toHaveURL(/\/forms/, { timeout: 15000 });
  await page.locator('[data-testid="add-form-button"]').waitFor({ state: "visible", timeout: 15000 });
}

async function clickAddForm(page: import("@playwright/test").Page) {
  await page.locator('[data-testid="add-form-button"]').click();
  await page.locator('[data-testid="form-name-input"] input').waitFor({ state: "visible", timeout: 10000 });
}

async function saveFormDrawer(page: import("@playwright/test").Page) {
  await page.locator("#formBox button", { hasText: /^Save$/ }).click();
  await page.locator("#formBox").waitFor({ state: "hidden", timeout: 15000 });
}

test.describe("Forms page", () => {
  test("should render Forms list with Add Form button", async ({ page }) => {
    await openFormsPage(page);
    await expect(page.locator('[data-testid="add-form-button"]')).toBeVisible();
    // Forms card header text comes from forms.formsPage.forms locale
    await expect(page.getByRole("heading", { name: /^Forms$/ }).first()).toBeVisible();
  });

  test("should require a name when creating a form", async ({ page }) => {
    await openFormsPage(page);
    await clickAddForm(page);
    await page.locator("#formBox button", { hasText: /^Save$/ }).click();
    await expect(page.locator("#formBox")).toBeVisible();
    await expect(page.locator("#formBox").getByRole("alert").first()).toBeVisible({ timeout: 5000 });
    await page.locator("#formBox button", { hasText: /^Cancel$/ }).click();
    await page.locator("#formBox").waitFor({ state: "hidden", timeout: 10000 });
  });

  test("Add Form title, and switching content type back to People clears the stand-alone fields", async ({ page }) => {
    await openFormsPage(page);
    await clickAddForm(page);
    await expect(page.locator("#formBox").getByText("Add Form", { exact: true })).toBeVisible();

    await selectMuiOption(page, page.locator('[data-testid="content-type-select"]'), "Stand Alone");
    await expect(page.locator('[data-testid="form-description-input"]')).toBeVisible({ timeout: 10000 });

    await selectMuiOption(page, page.locator('[data-testid="content-type-select"]'), "People");
    await expect(page.locator('[data-testid="form-description-input"]')).toHaveCount(0, { timeout: 10000 });

    await page.locator("#formBox button", { hasText: /^Cancel$/ }).click();
    await page.locator("#formBox").waitFor({ state: "hidden", timeout: 10000 });
  });

  test("shows a not-found state for a missing form id", async ({ page }) => {
    await page.goto("/forms/zzz-does-not-exist");
    await expect(page.getByText("Form not found")).toBeVisible({ timeout: 15000 });
    await page.getByRole("link", { name: "Back to Forms" }).click();
    await expect(page).toHaveURL(/\/forms$/, { timeout: 10000 });
  });
});

test.describe.serial("People-associated form lifecycle", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  test("creates a People-associated form", async () => {
    await openFormsPage(page);
    await clickAddForm(page);
    await page.locator('[data-testid="form-name-input"] input').fill(DISPOSABLE_PERSON_FORM);
    await selectMuiOption(page, page.locator('[data-testid="content-type-select"]'), "People");
    await saveFormDrawer(page);
    const row = page.locator("table tbody tr").filter({ hasText: DISPOSABLE_PERSON_FORM }).first();
    await expect(row).toBeVisible({ timeout: 10000 });
    const urlCell = row.locator("td").nth(1);
    await expect(urlCell).toHaveText("Person profile form");
  });

  test("opens the form and shows the Add Question button", async () => {
    await openFormsPage(page);
    await page.locator("table tbody tr").filter({ hasText: DISPOSABLE_PERSON_FORM }).first()
      .locator("a", { hasText: DISPOSABLE_PERSON_FORM }).click();
    await page.waitForURL(/\/forms\/[\w-]+/, { timeout: 10000 });
    await expect(page.locator('button[aria-label="addQuestion"]')).toBeVisible({ timeout: 10000 });
  });

  test("adds a required Email question", async () => {
    await openFormsPage(page);
    await page.locator("table tbody tr").filter({ hasText: DISPOSABLE_PERSON_FORM }).first()
      .locator("a", { hasText: DISPOSABLE_PERSON_FORM }).click();
    await page.waitForURL(/\/forms\/[\w-]+/, { timeout: 10000 });
    await page.locator('button[aria-label="addQuestion"]').click();
    await page.locator('[data-testid="question-title-input"] input').waitFor({ state: "visible", timeout: 10000 });

    const providerSelect = page.locator("#questionBox").getByLabel("Field Type");
    await selectMuiOption(page, providerSelect, "Email");

    await page.locator('[data-testid="question-title-input"] input').fill("Email Address");
    await page.locator('[data-testid="question-required-checkbox"]').check();

    await page.locator("#questionBox button", { hasText: /^Save$/ }).click();
    await page.locator("#questionBox").waitFor({ state: "hidden", timeout: 15000 });

    const qRow = page.locator("table tbody tr").filter({ hasText: "Email Address" }).first();
    await expect(qRow).toBeVisible({ timeout: 10000 });
    await expect(qRow).toContainText("Email");
    await expect(qRow).toContainText(/Yes/);
  });

  test("archives, restores, and deletes the form", async () => {
    await openFormsPage(page);
    const row = page.locator("table tbody tr").filter({ hasText: DISPOSABLE_PERSON_FORM }).first();
    await expect(row.locator('[data-testid^="archive-form-button-"] svg[data-testid="ArchiveIcon"]')).toBeVisible({ timeout: 10000 });
    await expect(row.locator('[data-testid^="archive-form-button-"] svg[data-testid="DeleteIcon"]')).toHaveCount(0);
    await row.locator('[data-testid^="archive-form-button-"]').click();
    await confirmDelete(page);

    const archivedTab = page.locator('button[role="tab"]', { hasText: "Archived Forms" }).first();
    await archivedTab.waitFor({ state: "visible", timeout: 10000 });
    await archivedTab.click();
    const archivedRow = page.locator("table tbody tr").filter({ hasText: DISPOSABLE_PERSON_FORM }).first();
    await expect(archivedRow).toBeVisible({ timeout: 10000 });

    const restoreBtn = archivedRow.locator('[data-testid^="restore-form-button-"]');
    await restoreBtn.waitFor({ state: "visible", timeout: 10000 });
    await restoreBtn.click();
    await confirmDelete(page);

    await openFormsPage(page);
    const activeRow = page.locator("table tbody tr").filter({ hasText: DISPOSABLE_PERSON_FORM }).first();
    await expect(activeRow).toBeVisible({ timeout: 10000 });

    await activeRow.locator('[data-testid^="edit-form-button-"]').first().click();
    await page.locator("#formBox").waitFor({ state: "visible", timeout: 10000 });
    await expect(page.locator("#formBox").getByText("Edit Form", { exact: true })).toBeVisible();
    await page.locator("#formBox button", { hasText: /^Delete$/ }).click();
    await confirmDelete(page);
    await page.locator("#formBox").waitFor({ state: "hidden", timeout: 15000 });
    await openFormsPage(page);
    await expect(page.locator("table tbody tr").filter({ hasText: DISPOSABLE_PERSON_FORM }))
      .toHaveCount(0, { timeout: 10000 });
  });
});

test.describe.serial("Stand Alone form lifecycle", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  test("creates a Stand Alone form with availability dates", async () => {
    await openFormsPage(page);
    await clickAddForm(page);
    await page.locator('[data-testid="form-name-input"] input').fill(DISPOSABLE_STANDALONE_FORM);
    await selectMuiOption(page, page.locator('[data-testid="content-type-select"]'), "Stand Alone");
    await selectMuiOption(page, page.locator('[data-testid="access-level-select"]'), "Public");
    await page.locator('[data-testid="form-description-input"] textarea').first().fill(DISPOSABLE_STANDALONE_DESCRIPTION);
    const availabilityFormControl = page.locator("#formBox div.MuiFormControl-root", { hasText: "Set Form Availability Timeframe" });
    await selectMuiOption(page, availabilityFormControl.locator('[role="combobox"]'), "Yes");

    const startPicker = page.getByRole("group", { name: "Availability Start Date" });
    const endPicker = page.getByRole("group", { name: "Availability End Date" });
    await startPicker.click();
    await page.keyboard.type("01012026");
    await endPicker.click();
    await page.keyboard.type("12312026");

    await saveFormDrawer(page);
    const row = page.locator("table tbody tr").filter({ hasText: DISPOSABLE_STANDALONE_FORM }).first();
    await expect(row).toBeVisible({ timeout: 10000 });
    await expect(row.locator("td a").filter({ hasText: /\/forms\// }).first()).toBeVisible();
  });

  test("duplicating a form confirms first and shows a duplicated snackbar", async () => {
    await openFormsPage(page);
    const row = page.locator("table tbody tr").filter({ hasText: DISPOSABLE_STANDALONE_FORM }).first();
    await expect(row).toBeVisible({ timeout: 10000 });
    await row.locator('[data-testid^="duplicate-form-button-"]').click();
    await confirmDelete(page);
    await expect(page.getByText("Form duplicated")).toBeVisible({ timeout: 10000 });

    const copyRow = page.locator("table tbody tr").filter({ hasText: `${DISPOSABLE_STANDALONE_FORM} (Copy)` }).first();
    await expect(copyRow).toBeVisible({ timeout: 10000 });
    await copyRow.locator('[data-testid^="edit-form-button-"]').first().click();
    await page.locator("#formBox").waitFor({ state: "visible", timeout: 10000 });
    await page.locator("#formBox button", { hasText: /^Delete$/ }).click();
    await confirmDelete(page);
    await page.locator("#formBox").waitFor({ state: "hidden", timeout: 15000 });
  });

  test("reopens the stand alone form with its description intact", async () => {
    await openFormsPage(page);
    const row = page.locator("table tbody tr").filter({ hasText: DISPOSABLE_STANDALONE_FORM }).first();
    await row.locator('[data-testid^="edit-form-button-"]').first().click();
    await page.locator("#formBox").waitFor({ state: "visible", timeout: 10000 });
    await expect(page.locator('[data-testid="form-description-input"] textarea').first()).toHaveValue(DISPOSABLE_STANDALONE_DESCRIPTION, { timeout: 10000 });
    await page.locator("#formBox button", { hasText: /^Cancel$/ }).click();
    await page.locator("#formBox").waitFor({ state: "hidden", timeout: 10000 });
  });

  test("deletes the stand alone form", async () => {
    await openFormsPage(page);
    const row = page.locator("table tbody tr").filter({ hasText: DISPOSABLE_STANDALONE_FORM }).first();
    await row.locator('[data-testid^="edit-form-button-"]').first().click();
    await page.locator("#formBox").waitFor({ state: "visible", timeout: 10000 });
    await page.locator("#formBox button", { hasText: /^Delete$/ }).click();
    await confirmDelete(page);
    await page.locator("#formBox").waitFor({ state: "hidden", timeout: 15000 });
    await openFormsPage(page);
    await expect(page.locator("table tbody tr").filter({ hasText: DISPOSABLE_STANDALONE_FORM }))
      .toHaveCount(0, { timeout: 10000 });
  });
});

test.describe("Person form submissions (profile rail)", () => {
  test("a seeded submission renders its stored answers", async ({ page }) => {
    await navigateToPeople(page);
    await openPersonRow(page, "Brian Harris");
    await page.getByRole("tab", { name: "Forms" }).click();
    const railItem = page.getByText("Visitor Information Card", { exact: true }).first();
    await expect(railItem).toBeVisible({ timeout: 10000 });
    await railItem.click();
    const pane = page.locator('[data-testid="display-box-content"]');
    await expect(pane.getByText("brian.harris@email.com")).toBeVisible({ timeout: 10000 });
    await expect(pane.getByText("Friend or Family", { exact: true })).toBeVisible();
  });

  test("submitting a person form stores and re-renders the answers", async ({ page }) => {
    await navigateToPeople(page);
    await openPersonRow(page, SEED_PEOPLE.DONALD);
    await page.getByRole("tab", { name: "Forms" }).click();
    const railItem = page.getByText("Visitor Information Card", { exact: true }).first();
    await expect(railItem).toBeVisible({ timeout: 10000 });
    await railItem.click();
    const editBtn = page.locator('button[aria-label="editButton"]').first();
    await expect(editBtn).toBeVisible({ timeout: 10000 });
    await editBtn.click();
    await expect(page.locator("#formSubmissionBox")).toBeVisible({ timeout: 10000 });
    await page.getByLabel("First Name", { exact: true }).fill("Donald");
    await page.getByLabel("Last Name", { exact: true }).fill("Clark");
    await page.getByLabel("Email Address", { exact: true }).fill("donald.card@example.com");
    const post = page.waitForResponse(r => r.url().includes("/formsubmissions") && r.request().method() === "POST" && r.status() === 200, { timeout: 15000 });
    await page.locator("#formSubmissionBox button", { hasText: /^Submit$/ }).click();
    await post;
    await expect(page.locator("#formSubmissionBox")).toHaveCount(0, { timeout: 10000 });
    await expect(page.getByText("donald.card@example.com").first()).toBeVisible({ timeout: 10000 });
  });
});

// Issue #1067: archiving a form used to erase the submissions people had already
// made against it - the person's Forms tab lost the whole section. Archiving must
// only stop new submissions, never hide history.
//
// Uses its own disposable form rather than archiving the seed "Visitor Information
// Card": that card is asserted on by people.spec.ts, issue-1014.spec.ts and
// serving-event-triggers.spec.ts, which run in parallel workers (workers: 4), so
// archiving it mid-suite would intermittently break those files.
test.describe.serial("Archived forms keep submission history", () => {
  const ARCHIVE_FORM = "Zacchaeus Archived History Form";
  const ANSWER_EMAIL = "zacchaeus.archived@example.com";
  let page: Page;

  function formRow() {
    return page.locator("table tbody tr").filter({ hasText: ARCHIVE_FORM }).first();
  }

  async function openArchivedTab() {
    await page.locator('button[role="tab"]', { hasText: "Archived Forms" }).first().click();
  }

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
  });

  test.afterAll(async () => {
    // Restore (if still archived) and delete the disposable form even on failure.
    try {
      await openFormsPage(page);
      if (await formRow().count() === 0) {
        await openArchivedTab();
        await formRow().locator('[data-testid^="restore-form-button-"]').click();
        await confirmDelete(page);
        await openFormsPage(page);
      }
      await formRow().locator('[data-testid^="edit-form-button-"]').first().click();
      await page.locator("#formBox").waitFor({ state: "visible", timeout: 10000 });
      await page.locator("#formBox button", { hasText: /^Delete$/ }).click();
      await confirmDelete(page);
      await page.locator("#formBox").waitFor({ state: "hidden", timeout: 15000 });
    } catch { /* cleanup is best effort */ }
    await page?.context().close();
  });

  test("creates a person form with a question", async () => {
    await openFormsPage(page);
    await clickAddForm(page);
    await page.locator('[data-testid="form-name-input"] input').fill(ARCHIVE_FORM);
    await selectMuiOption(page, page.locator('[data-testid="content-type-select"]'), "People");
    await saveFormDrawer(page);
    await expect(formRow()).toBeVisible({ timeout: 10000 });

    await formRow().locator("a", { hasText: ARCHIVE_FORM }).click();
    await page.waitForURL(/\/forms\/[\w-]+/, { timeout: 10000 });
    await page.locator('button[aria-label="addQuestion"]').click();
    await page.locator('[data-testid="question-title-input"] input').waitFor({ state: "visible", timeout: 10000 });
    await selectMuiOption(page, page.locator("#questionBox").getByLabel("Field Type"), "Email");
    await page.locator('[data-testid="question-title-input"] input').fill("Email Address");
    await page.locator("#questionBox button", { hasText: /^Save$/ }).click();
    await page.locator("#questionBox").waitFor({ state: "hidden", timeout: 15000 });
    await expect(page.locator("table tbody tr").filter({ hasText: "Email Address" }).first()).toBeVisible({ timeout: 10000 });
  });

  test("records a submission for a person", async () => {
    await navigateToPeople(page);
    await openPersonRow(page, "Jessica Taylor");
    await page.getByRole("tab", { name: /^Forms$/ }).click();
    const railItem = page.getByText(ARCHIVE_FORM, { exact: true }).first();
    await expect(railItem).toBeVisible({ timeout: 10000 });
    await railItem.click();
    await page.locator('button[aria-label="editButton"]').first().click();
    await expect(page.locator("#formSubmissionBox")).toBeVisible({ timeout: 10000 });
    await page.getByLabel("Email Address", { exact: true }).fill(ANSWER_EMAIL);
    const post = page.waitForResponse(r => r.url().includes("/formsubmissions") && r.request().method() === "POST" && r.status() === 200, { timeout: 15000 });
    await page.locator("#formSubmissionBox button", { hasText: /^Submit$/ }).click();
    await post;
    await expect(page.locator("#formSubmissionBox")).toHaveCount(0, { timeout: 10000 });
    await expect(page.getByText(ANSWER_EMAIL).first()).toBeVisible({ timeout: 10000 });
  });

  test("keeps the submitted answers visible after the form is archived", async () => {
    await openFormsPage(page);
    await formRow().locator('[data-testid^="archive-form-button-"]').click();
    await confirmDelete(page);
    await expect(formRow()).toHaveCount(0, { timeout: 15000 });

    await navigateToPeople(page);
    await openPersonRow(page, "Jessica Taylor");
    const formsTab = page.getByRole("tab", { name: /^Forms$/ });
    await expect(formsTab).toBeVisible({ timeout: 15000 });
    await formsTab.click();

    const railItem = page.getByText(ARCHIVE_FORM, { exact: true }).first();
    await expect(railItem).toBeVisible({ timeout: 15000 });
    await railItem.click();
    await expect(page.locator('[data-testid="display-box-content"]').getByText(ANSWER_EMAIL)).toBeVisible({ timeout: 15000 });
  });
});
