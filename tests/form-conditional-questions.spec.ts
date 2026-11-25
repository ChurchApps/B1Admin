import { type Page } from "@playwright/test";
import { settingsTest as test, expect } from "./helpers/test-fixtures";
import { navigateToForms } from "./helpers/navigation";
import { confirmDelete } from "./helpers/fixtures";
import { login } from "./helpers/auth";
import { STORAGE_STATE_PATH } from "./global-setup";

// A question can be shown only when an earlier question has a given answer.
// The question list explains the condition, and deleting the trigger clears it.
test.describe.serial("Conditional form questions", () => {
  const FORM_NAME = "Zacchaeus Conditional Questions Form";
  const TRIGGER = "Attending the retreat";
  const DEPENDENT = "Guest count";
  let page: Page;

  async function selectMuiOption(openLocator: ReturnType<Page["locator"]>, optionText: string) {
    await openLocator.click();
    const option = page.locator('li[role="option"]', { hasText: optionText }).first();
    await option.waitFor({ state: "visible", timeout: 10000 });
    await option.click();
    await page.locator('[role="listbox"]').waitFor({ state: "hidden", timeout: 10000 }).catch(() => { });
  }

  async function openFormsPage() {
    await navigateToForms(page);
    await page.locator('[data-testid="add-form-button"]').waitFor({ state: "visible", timeout: 15000 });
  }

  const formRow = () => page.locator("table tbody tr").filter({ hasText: FORM_NAME }).first();
  const questionRow = (title: string) => page.locator("table tbody tr").filter({ hasText: title }).first();

  async function openForm() {
    await openFormsPage();
    await formRow().locator("a", { hasText: FORM_NAME }).click();
    await page.waitForURL(/\/forms\/[\w-]+/, { timeout: 10000 });
    await expect(page.getByRole("button", { name: "Add question" })).toBeVisible({ timeout: 10000 });
  }

  async function addQuestion(title: string, fieldType: string, condition?: { question: string; answer: string }) {
    await page.getByRole("button", { name: "Add question" }).click();
    await page.locator('[data-testid="question-title-input"] input').waitFor({ state: "visible", timeout: 10000 });
    await selectMuiOption(page.locator("#questionBox").getByLabel("Field Type"), fieldType);
    await page.locator('[data-testid="question-title-input"] input').fill(title);
    if (condition) {
      await selectMuiOption(page.getByTestId("question-show-if-select"), condition.question);
      await selectMuiOption(page.getByTestId("question-show-if-value-select"), condition.answer);
    }
    await page.locator("#questionBox button", { hasText: /^Save$/ }).click();
    await page.locator("#questionBox").waitFor({ state: "hidden", timeout: 15000 });
    await expect(questionRow(title)).toBeVisible({ timeout: 10000 });
  }

  async function editQuestion(title: string) {
    await questionRow(title).getByRole("button", { name: title }).click();
    await page.locator("#questionBox").waitFor({ state: "visible", timeout: 10000 });
  }

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
  });

  test.afterAll(async () => {
    try {
      await openFormsPage();
      if (await formRow().count() > 0) {
        await formRow().locator('[data-testid^="edit-form-button-"]').first().click();
        await page.locator("#formBox").waitFor({ state: "visible", timeout: 10000 });
        await page.locator("#formBox button", { hasText: /^Delete$/ }).click();
        await confirmDelete(page);
        await page.locator("#formBox").waitFor({ state: "hidden", timeout: 15000 });
      }
    } catch { /* cleanup is best effort */ }
    await page?.context().close();
  });

  test("creates a form with a Yes/No question and a question shown only on Yes", async () => {
    await openFormsPage();
    await page.locator('[data-testid="add-form-button"]').click();
    await page.locator('[data-testid="form-name-input"] input').fill(FORM_NAME);
    await selectMuiOption(page.locator('[data-testid="content-type-select"]'), "People");
    await page.locator("#formBox button", { hasText: /^Save$/ }).click();
    await page.locator("#formBox").waitFor({ state: "hidden", timeout: 15000 });
    await expect(formRow()).toBeVisible({ timeout: 10000 });

    await openForm();
    await addQuestion(TRIGGER, "Yes/No");
    await addQuestion(DEPENDENT, "Whole Number", { question: TRIGGER, answer: "Yes" });

    await expect(questionRow(DEPENDENT)).toContainText(`Shown if ${TRIGGER} is Yes`);
    await expect(questionRow(TRIGGER)).not.toContainText("Shown if");
  });

  test("keeps the condition when the question is reopened", async () => {
    await openForm();
    await editQuestion(DEPENDENT);
    await expect(page.getByTestId("question-show-if-select")).toContainText(TRIGGER);
    await expect(page.getByTestId("question-show-if-value-select")).toContainText("Yes");
    await page.locator("#questionBox button", { hasText: /^Cancel$/ }).click();
    await page.locator("#questionBox").waitFor({ state: "hidden", timeout: 10000 });
  });

  test("deleting the trigger question clears the condition on its dependents", async () => {
    await openForm();
    await editQuestion(TRIGGER);
    await page.locator("#questionBox button", { hasText: /^Delete$/ }).click();
    await confirmDelete(page);
    await page.locator("#questionBox").waitFor({ state: "hidden", timeout: 15000 });
    await expect(questionRow(TRIGGER)).toHaveCount(0, { timeout: 10000 });

    await page.reload();
    await expect(questionRow(DEPENDENT)).toBeVisible({ timeout: 15000 });
    await expect(questionRow(DEPENDENT)).not.toContainText("Shown if");
    await editQuestion(DEPENDENT);
    await expect(page.getByTestId("question-show-if-select")).toHaveCount(0);
  });
});
