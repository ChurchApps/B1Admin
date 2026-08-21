import type { Page } from "@playwright/test";
import { servingTest as test, expect } from "./helpers/test-fixtures";
import { dismissSendInviteIfPresent, editIconButton } from "./helpers/fixtures";
import { login } from "./helpers/auth";
import { navigateToServing } from "./helpers/navigation";
import { STORAGE_STATE_PATH } from "./global-setup";

// OBADIAH is the marker name; the file is one serial chain verifying that switching
// between position edit panels never shows another position's unsaved edits (PR #457).
test.describe.serial("Assignment stale position form (PR #457)", () => {
  test.describe.configure({ retries: 0 });
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
    await navigateToServing(page);
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  test.beforeEach(async () => {
    await dismissSendInviteIfPresent(page, 500);
  });

  const openMinistryTab = async () => {
    if (!/\/serving\/plans$/.test(page.url().split("?")[0])) {
      await page.goto("/serving/plans");
      await page.waitForURL(/\/serving\/plans/, { timeout: 15000 });
    }
    const minBtn = page.locator('[role="tab"]').getByText("Obadiah Ministry").first();
    await expect(minBtn).toBeVisible({ timeout: 10000 });
    await minBtn.click();
  };

  const openPlanPage = async () => {
    await openMinistryTab();
    const plansBtn = page.locator("a").getByText("Obadiah Plans");
    await expect(plansBtn).toBeVisible({ timeout: 10000 });
    await plansBtn.click();
    await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
    const planLink = page.locator("a").getByText("Obadiah Service");
    await expect(planLink).toBeVisible({ timeout: 10000 });
    await planLink.click();
    await expect(page).toHaveURL(/\/serving\/plans\/[^/]+/);
  };

  const addPosition = async (name: string) => {
    await page.locator('[data-testid="add-position-button"]').click();
    await page.locator(".comboBox").click();
    await page.getByRole("option", { name: "Band" }).click();
    await page.locator('[id="name"]').fill(name);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.locator(".positionsTable").getByText(name)).toBeVisible({ timeout: 10000 });
  };

  test("setup: create ministry, plan type and plan", async () => {
    await page.goto("/serving/plans");
    await page.waitForURL(/\/serving\/plans/, { timeout: 15000 });
    await page.locator("button").getByText("Add Ministry").click();
    await page.locator('[name="name"]').fill("Obadiah Ministry");
    await page.locator("button").getByText("Add").first().click();
    await expect(page.locator('[role="tab"]').getByText("Obadiah Ministry")).toHaveCount(1, { timeout: 10000 });

    await openMinistryTab();
    await page.locator("button").getByText("Create Plan Type").click();
    await page.locator('[name="name"]').fill("Obadiah Plans");
    await page.locator("button").getByText("Save").click();
    const plansBtn = page.locator("a").getByText("Obadiah Plans");
    await expect(plansBtn).toBeVisible({ timeout: 10000 });
    await plansBtn.click();
    await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);

    await page.locator('[data-testid="add-plan-button"]').click();
    await page.locator('[name="name"]').fill("Obadiah Service");
    await page.locator('[id="serviceDate"]').fill("2030-07-14");
    await page.locator("button").getByText("Save").click();
    await expect(page.locator("a").getByText("Obadiah Service")).toHaveCount(1, { timeout: 10000 });
  });

  test("setup: add Greeter and Usher positions", async () => {
    await openPlanPage();
    await addPosition("Greeter");
    await addPosition("Usher");
  });

  test("switching positions without saving shows the new position's data, not stale edits", async () => {
    await openPlanPage();
    await page.locator(".positionsTable").getByText("Greeter").click();
    await expect(page.locator('[id="name"]')).toHaveValue("Greeter", { timeout: 10000 });
    await page.locator('[id="name"]').fill("Stale Draft Name");

    await page.locator(".positionsTable").getByText("Usher").click();
    await expect(page.locator('[id="name"]')).toHaveValue("Usher", { timeout: 10000 });
  });

  test("add position after an unsaved edit starts with an empty form", async () => {
    await openPlanPage();
    await page.locator(".positionsTable").getByText("Greeter").click();
    await expect(page.locator('[id="name"]')).toHaveValue("Greeter", { timeout: 10000 });
    await page.locator('[id="name"]').fill("Stale Draft Name");

    await page.locator('[data-testid="add-position-button"]').click();
    await expect(page.locator('[id="name"]')).toHaveValue("", { timeout: 10000 });
  });

  test("cleanup: delete plan and ministry", async () => {
    await openMinistryTab();
    const plansBtn = page.locator("a").getByText("Obadiah Plans");
    await plansBtn.click();
    await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
    await page.locator('button[aria-label="Edit"]').first().click();
    await page.locator("button").getByText("Delete").click();
    await expect(page.locator("a").getByText("Obadiah Service")).toHaveCount(0, { timeout: 10000 });

    page.once("dialog", async dialog => { await dialog.accept(); });
    await openMinistryTab();
    await page.locator("a").getByText("Edit Ministry").click();
    const minEditBtn = editIconButton(page).first();
    await expect(minEditBtn).toBeVisible({ timeout: 10000 });
    await minEditBtn.click();
    const deleteBtn = page.locator("button").getByText("Delete");
    await expect(deleteBtn).toBeVisible({ timeout: 10000 });
    await deleteBtn.click();
    await expect(page.locator("table a").getByText("Obadiah Ministry")).toHaveCount(0, { timeout: 10000 });
  });
});
