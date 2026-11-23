import type { Page } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";
import { login } from "./helpers/auth";
import { STORAGE_STATE_PATH } from "./global-setup";
import { confirmDelete } from "./helpers/fixtures";

// Check-in label designer (roadmap 3.3): template creation, editing, saving, and deletion.
const TEMPLATE = "Zacchaeus Nametag";

const labelTemplatesPost = (page: Page) => page.waitForResponse((r) => r.url().includes("/labeltemplates") && r.request().method() === "POST" && r.status() === 200);

test.describe.serial("Check-in label designer", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  test("reaches the designer from the B1 CheckIn settings page", async () => {
    await page.goto("/mobile/checkin");
    await page.getByRole("link", { name: "Design Labels" }).first().click();
    await page.waitForURL(/\/mobile\/checkin\/labels/, { timeout: 15000 });
    await expect(page.locator('[data-testid="add-label"]')).toBeVisible({ timeout: 15000 });
  });

  test("creates a starter nametag template and opens the editor", async () => {
    await page.goto("/mobile/checkin/labels");
    await page.locator('[data-testid="add-label"]').click();
    await page.locator('[data-testid="add-nametag-starter"]').click();
    await expect(page.locator('[data-testid="label-canvas"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid^="block-"]')).toHaveCount(4);
  });

  test("adds a text block via the palette and edits its properties", async () => {
    await page.locator('[data-testid="palette-text"]').click();
    await expect(page.locator('[data-testid^="block-"]')).toHaveCount(5);
    await page.locator('[data-testid="prop-text"] input').fill("Zacchaeus Block");
    await expect(page.locator('[data-testid^="block-"]').filter({ hasText: "Zacchaeus Block" })).toBeVisible();
    await page.locator('[data-testid="prop-x"] input').fill("40");
    await expect(page.locator('[data-testid="prop-x"] input')).toHaveValue("40");
  });

  test("sets a birthday condition on the block", async () => {
    await page.locator('[data-testid="prop-cond-field"]').getByLabel("Condition").click();
    await page.getByRole("option", { name: "Birthday This Week" }).click();
    await page.locator('[data-testid="prop-cond-operator"]').getByLabel("Operator").click();
    await page.getByRole("option", { name: "Is not blank" }).click();
  });

  test("adds Age, Grade, Birth Date, and Check-in Type field blocks", async () => {
    const newFields = [
      { key: "person.age", label: "Age" },
      { key: "person.grade", label: "Grade" },
      { key: "person.birthDate", label: "Birth Date" },
      { key: "checkinType", label: "Check-in Type" }
    ];
    for (const f of newFields) {
      await expect(page.locator(`[data-testid="palette-${f.key}"]`)).toHaveText(f.label);
      await page.locator(`[data-testid="palette-${f.key}"]`).click();
      await expect(page.locator('[data-testid="prop-field"] input')).toHaveValue(f.key);
    }
    await expect(page.locator('[data-testid^="block-"]')).toHaveCount(9);
    await expect(page.locator('[data-testid^="block-"]').filter({ hasText: "PreK" })).toBeVisible();
    await expect(page.locator('[data-testid^="block-"]').filter({ hasText: "Member" })).toBeVisible();
    // A Check-in Type condition offers the kiosk's stable values instead of free text.
    await page.locator('[data-testid="prop-cond-field"]').getByLabel("Condition").click();
    await page.getByRole("option", { name: "Check-in Type" }).click();
    await page.locator('[data-testid="prop-cond-operator"]').getByLabel("Operator").click();
    await page.getByRole("option", { name: "Equals", exact: true }).click();
    await page.locator('[data-testid="prop-cond-value"]').getByLabel("Value").click();
    await page.getByRole("option", { name: "Volunteer" }).click();
    await expect(page.locator('[data-testid="prop-cond-value"] input')).toHaveValue("Volunteer");
    // Bring the text block back into focus for the save/persist steps below.
    await page.locator('[data-testid^="block-"]').filter({ hasText: "Zacchaeus Block" }).click();
  });

  test("saves the template and shows it in the list", async () => {
    await page.locator('[data-testid="template-name-input"] input').fill(TEMPLATE);
    const post = labelTemplatesPost(page);
    await page.getByRole("button", { name: "Save" }).click();
    await post;
    const row = page.locator('[data-testid="labels-table"] tbody tr').filter({ hasText: TEMPLATE });
    await expect(row).toBeVisible({ timeout: 15000 });
    await expect(row).toContainText("Nametag");
    await expect(row).toContainText("3.5");
  });

  test("persists the birthday condition when reopened", async () => {
    const row = page.locator('[data-testid="labels-table"] tbody tr').filter({ hasText: TEMPLATE });
    await row.locator('[data-testid^="edit-label-"]').click();
    await page.locator('[data-testid^="block-"]').filter({ hasText: "Zacchaeus Block" }).click();
    await expect(page.locator('[data-testid="prop-cond-field"] input')).toHaveValue("person.isBirthdayWeek");
    await expect(page.locator('[data-testid="prop-cond-operator"] input')).toHaveValue("notEmpty");
    await expect(page.locator('[data-testid^="block-"]')).toHaveCount(9);
    // The new blocks stack at the same spot; the last one added (Check-in Type) is on top.
    await page.locator('[data-testid^="block-"]').filter({ hasText: "Member" }).click();
    await expect(page.locator('[data-testid="prop-field"] input')).toHaveValue("checkinType");
    await page.getByRole("button", { name: "Cancel" }).click();
  });

  test("sets the template as the default for its type", async () => {
    const row = page.locator('[data-testid="labels-table"] tbody tr').filter({ hasText: TEMPLATE });
    const post = labelTemplatesPost(page);
    await row.locator('[data-testid^="default-label-"]').click();
    await post;
    await expect(row).toContainText("Default", { timeout: 15000 });
  });

  test("deletes the template", async () => {
    const row = page.locator('[data-testid="labels-table"] tbody tr').filter({ hasText: TEMPLATE });
    await row.locator('[data-testid^="delete-label-"]').click();
    await confirmDelete(page);
    await expect(page.locator('[data-testid="labels-table"] tbody tr').filter({ hasText: TEMPLATE })).toHaveCount(0, { timeout: 15000 });
  });
});
