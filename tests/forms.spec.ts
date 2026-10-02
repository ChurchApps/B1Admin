import { request as pwRequest, type APIRequestContext, type Page } from "@playwright/test";
import { settingsTest as test, loggedInTest, expect } from "./helpers/test-fixtures";
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

// Issue #1066: forms could be edited, duplicated and archived but never printed.
// The list now offers a paper copy of any form (blank answer spaces), and a person's
// submitted form can be printed from their Forms section.
test.describe("Printing forms", () => {
  test("prints a blank copy of a form from the Forms list", async ({ page }) => {
    await openFormsPage(page);
    const row = page.locator("table tbody tr").filter({ hasText: "Visitor Information Card" }).first();
    await expect(row).toBeVisible({ timeout: 10000 });
    await row.locator('[data-testid^="print-form-button-"]').click();

    const dialog = page.locator('[data-testid="form-print-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(dialog.getByRole("heading", { name: "Visitor Information Card" })).toBeVisible({ timeout: 10000 });
    // Required questions carry a marker; the legend explains it.
    await expect(dialog.getByText("First Name *", { exact: true })).toBeVisible();
    await expect(dialog.getByText("* Required", { exact: true })).toBeVisible();
    // Optional questions do not.
    await expect(dialog.getByText("Phone Number", { exact: true })).toBeVisible();
    // Multiple choice prints every option so it can be ticked on paper.
    await expect(dialog.getByText("How did you hear about us?", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Friend or Family", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Community Event", { exact: true })).toBeVisible();
    await expect(dialog.locator('[data-testid="form-print-confirm"]')).toBeEnabled();
    await page.screenshot({ path: ".pr-screenshots/after.png", fullPage: true });

    await dialog.locator('[data-testid="form-print-close"]').click();
    await expect(dialog).toHaveCount(0, { timeout: 10000 });
  });

  test("a person's submitted form prints with a title, name and submission date", async ({ page }) => {
    await navigateToPeople(page);
    await openPersonRow(page, "Brian Harris");
    await page.getByTestId("person-forms-all").click();
    const railItem = page.getByText("Visitor Information Card", { exact: true }).first();
    await expect(railItem).toBeVisible({ timeout: 10000 });
    await railItem.click();
    const pane = page.locator('[data-testid="display-box-content"]');
    await expect(pane.getByText("brian.harris@email.com")).toBeVisible({ timeout: 10000 });

    const printBtn = page.locator('[data-testid="print-form-submission-button"]');
    await expect(printBtn).toBeVisible({ timeout: 10000 });
    // The edit button keeps its accessible name next to the new print button.
    await expect(page.locator('button[aria-label="editButton"]').first()).toBeVisible();

    // On screen the paper header stays hidden; under print media it appears and the
    // buttons disappear, which is exactly what react-to-print sends to the printer.
    const printHeader = pane.getByText("Submitted For: Brian Harris");
    await expect(printHeader).toBeHidden();
    await page.emulateMedia({ media: "print" });
    await expect(printHeader).toBeVisible({ timeout: 10000 });
    await expect(pane.getByRole("heading", { name: "Visitor Information Card" })).toBeVisible();
    await expect(pane.getByText(/Submission Date: /)).toBeVisible();
    await expect(printBtn).toBeHidden();
    await page.screenshot({ path: ".pr-screenshots/submission-after.png", fullPage: true });
    await page.emulateMedia({ media: "screen" });
    await expect(printBtn).toBeVisible();
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
    await expect(row.locator('[data-testid^="archive-form-button-"]')).toHaveText("Archive", { timeout: 10000 });
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

    const startPicker = page.getByLabel("Availability Start Date");
    const endPicker = page.getByLabel("Availability End Date");
    await startPicker.fill("2026-01-01");
    await endPicker.fill("2026-12-31");

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
  async function clearDonaldSubmissions() {
    const API = process.env.API_BASE || "http://localhost:8084";
    const ctx = await pwRequest.newContext();
    try {
      const login = await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
      const uc = ((await login.json()).userChurches || []).find((c: any) => c.church?.id === "CHU00000001");
      const auth = { headers: { Authorization: "Bearer " + uc.jwt } };
      const found = await (await ctx.get(`${API}/membership/people/search?term=${encodeURIComponent(SEED_PEOPLE.DONALD)}`, auth)).json();
      const donald = (found as any[]).find((p) => p.name?.display === SEED_PEOPLE.DONALD);
      const person = await (await ctx.get(`${API}/membership/people/${donald.id}`, auth)).json();
      for (const fs of person.formSubmissions || []) await ctx.delete(`${API}/membership/formsubmissions/${fs.id}`, auth);
    } finally {
      await ctx.dispose();
    }
  }

  test.beforeAll(clearDonaldSubmissions);
  test.afterAll(clearDonaldSubmissions);

  test("a seeded submission renders its stored answers", async ({ page }) => {
    await navigateToPeople(page);
    await openPersonRow(page, "Brian Harris");
    await page.getByTestId("person-forms-all").click();
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
    await page.getByTestId("person-forms-all").click();
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

// Issue #1108: a person who filled the same form out more than once only ever had one
// of those submissions rendered on their Forms section. The Api returns every submission -
// PersonForms collapsed them into a map keyed by formId, so each one overwrote the last.
//
// The extra submission is deliberately dated *before* the seeded card. The chromium
// project runs fullyParallel, so "Printing forms" and "Person form submissions (profile
// rail)" can be open on Brian Harris's pane while this describe's row exists, and both
// assert on brian.harris@email.com. Backdating keeps the seeded card the newest, so the
// pane those tests see is unchanged; a dedicated request context is not enough on its
// own because the extra row is shared server state, not client state.
test.describe.serial("Repeated submissions of the same form stay reachable", () => {
  const API = process.env.API_BASE || "http://localhost:8084";
  const BRIAN_HARRIS = "PER00000079"; // demo seed person with one Visitor Information Card submission
  const VISITOR_FORM = "FRM00000001";
  const FIRST_NAME_QUESTION = "QST00000001";
  const EMAIL_QUESTION = "QST00000003";
  const SEEDED_EMAIL = "brian.harris@email.com"; // FSB00000001, submitted 2025-09-15
  const EARLIER_EMAIL = "brian.harris.second@example.com"; // the extra submission this describe adds

  let ctx: APIRequestContext;
  let auth: { headers: { Authorization: string } };
  let extraSubmissionId = "";

  test.beforeAll(async () => {
    ctx = await pwRequest.newContext();
    const loginRes = await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
    expect(loginRes.ok()).toBeTruthy();
    const body = await loginRes.json();
    const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
    expect(uc?.jwt).toBeTruthy();
    auth = { headers: { Authorization: "Bearer " + uc.jwt } };

    // Brian filled the visitor card out once before the seeded one.
    const res = await ctx.post(`${API}/membership/formsubmissions`, {
      ...auth,
      data: [
        {
          formId: VISITOR_FORM,
          contentType: "person",
          contentId: BRIAN_HARRIS,
          submissionDate: "2024-03-05T10:30:00.000Z",
          submittedBy: BRIAN_HARRIS,
          answers: [
            { questionId: FIRST_NAME_QUESTION, value: "Brian" },
            { questionId: EMAIL_QUESTION, value: EARLIER_EMAIL }
          ]
        }
      ]
    });
    expect(res.ok()).toBeTruthy();
    const saved = await res.json();
    extraSubmissionId = saved?.[0]?.id;
    expect(extraSubmissionId).toBeTruthy();
  });

  test.afterAll(async () => {
    if (extraSubmissionId) await ctx.delete(`${API}/membership/formsubmissions/${extraSubmissionId}`, auth);
    await ctx?.dispose();
  });

  test("both Visitor Information Card submissions are reachable from the person's Forms section", async ({ page }) => {
    await navigateToPeople(page);
    await openPersonRow(page, "Brian Harris");
    await page.getByTestId("person-forms-all").click();

    const railItem = page.getByText("Visitor Information Card", { exact: true }).first();
    await expect(railItem).toBeVisible({ timeout: 10000 });
    await railItem.click();

    const pane = page.locator('[data-testid="display-box-content"]');

    // The newest submission opens by default.
    await expect(pane.getByText(SEEDED_EMAIL)).toBeVisible({ timeout: 10000 });

    // The other one is still reachable instead of being overwritten.
    const options = page.locator('[data-testid="submission-picker"] [data-testid^="submission-option-"]');
    await expect(options).toHaveCount(2, { timeout: 10000 });
    await options.nth(1).click();
    await expect(pane.getByText(EARLIER_EMAIL)).toBeVisible({ timeout: 10000 });
  });
});

// Issue #1067: archiving a form used to erase the submissions people had already
// made against it - the person's Forms section lost the whole section. Archiving must
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
    await page.getByTestId("person-forms-all").click();
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
    const formsTab = page.getByTestId("person-forms-all");
    await expect(formsTab).toBeVisible({ timeout: 15000 });
    await formsTab.click();

    const railItem = page.getByText(ARCHIVE_FORM, { exact: true }).first();
    await expect(railItem).toBeVisible({ timeout: 15000 });
    await railItem.click();
    await expect(page.locator('[data-testid="display-box-content"]').getByText(ANSWER_EMAIL)).toBeVisible({ timeout: 15000 });
  });
});

// Anonymous submissions can only be read (or printed) from the
// Forms > Submissions table, which has one column per question. The table sat inside
// an overflow-hidden Card with no scroll container, so on a form with many questions
// the right-hand columns were cut off and there was no way to reach them.
const WIDE_API = process.env.API_BASE || "http://localhost:8084";
const WIDE_FORM_NAME = "Zacchaeus Long Anonymous Form";
const WIDE_QUESTION_COUNT = 11;
const wideTitleFor = (i: number) => `Question ${String(i).padStart(2, "0")}`;

loggedInTest.describe.serial("Form submissions table with many questions", () => {
  let ctx: APIRequestContext;
  let auth: { headers: { Authorization: string } };
  let formId = "";

  loggedInTest.beforeAll(async () => {
    ctx = await pwRequest.newContext();
    const loginRes = await ctx.post(`${WIDE_API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
    expect(loginRes.ok()).toBeTruthy();
    const body = await loginRes.json();
    const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
    auth = { headers: { Authorization: "Bearer " + uc.jwt } };

    const formRes = await ctx.post(`${WIDE_API}/membership/forms`, { ...auth, data: [{ name: WIDE_FORM_NAME, contentType: "form" }] });
    expect(formRes.ok()).toBeTruthy();
    formId = (await formRes.json())?.[0]?.id;
    expect(formId).toBeTruthy();

    const questions = Array.from({ length: WIDE_QUESTION_COUNT }, (_, i) => ({ formId, title: wideTitleFor(i + 1), fieldType: "Textbox", sort: i + 1 }));
    const qRes = await ctx.post(`${WIDE_API}/membership/questions`, { ...auth, data: questions });
    expect(qRes.ok()).toBeTruthy();
    const saved: any[] = await qRes.json();

    const answers = saved.map((q: any) => ({ questionId: q.id, value: "Answer for " + q.title }));
    const subRes = await ctx.post(`${WIDE_API}/membership/formsubmissions`, {
      ...auth,
      data: [{ formId, contentType: "form", contentId: formId, submittedBy: "", submissionDate: new Date().toISOString(), answers }]
    });
    expect(subRes.ok()).toBeTruthy();
  });

  loggedInTest.afterAll(async () => {
    if (formId) await ctx.delete(`${WIDE_API}/membership/forms/${formId}`, auth);
    await ctx?.dispose();
  });

  loggedInTest("every question column of an anonymous submission can be reached", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/forms/${formId}`);
    await page.getByText("Form Submissions", { exact: true }).first().click();

    const card = page.locator(".MuiCard-root").filter({ hasText: "Form Submission Results" });
    await expect(card).toBeVisible({ timeout: 15000 });
    const lastHeader = card.getByRole("columnheader", { name: wideTitleFor(WIDE_QUESTION_COUNT) });
    await expect(lastHeader).toBeAttached();
    const cardBox = await card.boundingBox();
    const headerBox = await lastHeader.boundingBox();
    expect(cardBox && headerBox && headerBox.x + headerBox.width > cardBox.x + cardBox.width + 1).toBeTruthy();

    // Scroll the table sideways the way a user would, then check the last column is on screen inside the card.
    await card.getByRole("table").hover();
    await page.mouse.wheel(4000, 0);
    await expect.poll(async () => {
      const c = await card.boundingBox();
      const h = await lastHeader.boundingBox();
      return !!c && !!h && h.x >= c.x && h.x + h.width <= c.x + c.width + 1;
    }, { timeout: 5000 }).toBe(true);
    await expect(card.getByRole("cell", { name: "Answer for " + wideTitleFor(WIDE_QUESTION_COUNT) })).toBeVisible();
  });
});

// A submission can land on the wrong person (two people sharing an email) or on nobody
// (the person was deleted). Staff can relink it from the form's Submissions table, or
// from the person's Forms tab, or unlink it back to Anonymous.
loggedInTest.describe.serial("Relinking a form submission to another person", () => {
  const RELINK_FORM_NAME = "Zacchaeus Relink Form";
  let ctx: APIRequestContext;
  let auth: { headers: { Authorization: string } };
  let formId = "";
  let submissionId = "";

  loggedInTest.beforeAll(async () => {
    ctx = await pwRequest.newContext();
    const loginRes = await ctx.post(`${WIDE_API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
    expect(loginRes.ok()).toBeTruthy();
    const body = await loginRes.json();
    const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
    auth = { headers: { Authorization: "Bearer " + uc.jwt } };

    const formRes = await ctx.post(`${WIDE_API}/membership/forms`, { ...auth, data: [{ name: RELINK_FORM_NAME, contentType: "person" }] });
    expect(formRes.ok()).toBeTruthy();
    formId = (await formRes.json())?.[0]?.id;
    const qRes = await ctx.post(`${WIDE_API}/membership/questions`, { ...auth, data: [{ formId, title: "Relink Note", fieldType: "Textbox", sort: 1 }] });
    const questionId = (await qRes.json())?.[0]?.id;
    const donaldRes = await ctx.get(`${WIDE_API}/membership/people/search?term=${encodeURIComponent(SEED_PEOPLE.DONALD)}`, auth);
    const donald = ((await donaldRes.json()) as any[]).find((p) => p.name?.display === SEED_PEOPLE.DONALD);
    expect(donald?.id).toBeTruthy();
    const subRes = await ctx.post(`${WIDE_API}/membership/formsubmissions`, {
      ...auth,
      data: [{ formId, contentType: "person", contentId: donald.id, submittedBy: donald.id, submissionDate: new Date().toISOString(), answers: [{ questionId, value: "Wrong person" }] }]
    });
    expect(subRes.ok()).toBeTruthy();
    submissionId = (await subRes.json())?.[0]?.id;
    expect(submissionId).toBeTruthy();
  });

  loggedInTest.afterAll(async () => {
    if (formId) await ctx.delete(`${WIDE_API}/membership/forms/${formId}`, auth);
    await ctx?.dispose();
  });

  async function openSubmissions(page: Page) {
    await page.goto(`/forms/${formId}`);
    await page.getByText("Form Submissions", { exact: true }).first().click();
    await expect(page.getByText("Form Submission Results")).toBeVisible({ timeout: 15000 });
  }

  async function pickPerson(page: Page, name: string) {
    const dialog = page.getByRole("dialog");
    await dialog.locator('[data-testid="person-search-input"] input, input[name="personAddText"]').first().fill(name);
    await dialog.locator('[data-testid="search-button"]').click();
    await dialog.getByRole("row").filter({ hasText: name }).locator('[data-testid^="add-person-button-"]').first().click();
    await expect(dialog).toHaveCount(0, { timeout: 10000 });
  }

  loggedInTest("moves a submission to another person from the Submissions table", async ({ page }) => {
    await openSubmissions(page);
    await expect(page.getByRole("cell", { name: SEED_PEOPLE.DONALD })).toBeVisible();
    await page.locator(`[data-testid="submission-change-person-${submissionId}"]`).click();
    await pickPerson(page, SEED_PEOPLE.CAROL);
    await expect(page.getByRole("cell", { name: SEED_PEOPLE.CAROL })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("cell", { name: SEED_PEOPLE.DONALD })).toHaveCount(0);
  });

  loggedInTest("the moved submission shows on the new person's Forms tab and can be unlinked there", async ({ page }) => {
    await navigateToPeople(page);
    await openPersonRow(page, SEED_PEOPLE.CAROL);
    await page.getByTestId("person-forms-all").click();
    await page.getByText(RELINK_FORM_NAME, { exact: true }).first().click();
    const pane = page.locator('[data-testid="display-box-content"]');
    await expect(pane.getByText("Wrong person")).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="submission-change-person"]').click();
    await page.getByRole("dialog").getByRole("button", { name: "Unlink (Anonymous)" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 10000 });
    await expect(pane.getByText("Wrong person")).toHaveCount(0, { timeout: 10000 });

    await openSubmissions(page);
    await expect(page.getByRole("cell", { name: "Anonymous" })).toBeVisible();
    await expect(page.getByRole("cell", { name: SEED_PEOPLE.CAROL })).toHaveCount(0);
  });
});
