import type { Page } from "@playwright/test";
import { servingTest as test, expect } from "./helpers/test-fixtures";
import { login } from "./helpers/auth";
import { navigateToServing } from "./helpers/navigation";
import { STORAGE_STATE_PATH } from "./global-setup";

// Plan Templates: save a plan's order of service + positions as a reusable named
// template, then start a new plan from it (and manage templates).
//
// Source is the demo "Upcoming Worship Schedule" plan (Worship ministry, Sunday
// Service type) which ships with a full order of service. Capture is read-only on
// that plan; the only rows this chain creates are one template + one throwaway
// plan, both deleted in the final test. Names use a "Zephaniah" prefix to stay
// clear of other serving specs.
const MINISTRY = "Worship";
const PLAN_TYPE = "Sunday Service";
const SOURCE_PLAN = "Upcoming Worship Schedule";
const TEMPLATE_NAME = "Zephaniah Template";
const NEW_PLAN = "Zephaniah Plan";
const CAPTURED_HEADER = "Scripture and Sermon"; // a header from the source plan's order

test.describe.serial("Serving Management - Plan Templates", () => {
  // Shared data across the chain — a retry would duplicate the template/plan.
  test.describe.configure({ retries: 0 });

  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  // Land on the Sunday Service plan list under the Worship ministry. With a single
  // ministry the page renders it directly (no ministry tabs), so click the tab only
  // when one is present.
  async function gotoPlanList() {
    await navigateToServing(page);
    await page.goto("/serving/plans");
    await page.waitForURL(/\/serving\/plans/, { timeout: 15000 });
    const minTab = page.locator('[role="tab"]').getByText(MINISTRY).first();
    if (await minTab.count() > 0) await minTab.click();
    const typeLink = page.locator("a").getByText(PLAN_TYPE, { exact: true }).first();
    await expect(typeLink).toBeVisible({ timeout: 10000 });
    await typeLink.click();
    await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
  }

  async function openOrderTab(planName: string) {
    const planLink = page.locator("a").getByText(planName, { exact: true }).first();
    await expect(planLink).toBeVisible({ timeout: 10000 });
    await planLink.click();
    await page.waitForURL(/\/serving\/plans\/[^/]+/, { timeout: 15000 });
    await page.locator('button[role="tab"]').getByText("Service Order").click();
  }

  test("saves a plan as a template", async () => {
    await gotoPlanList();
    await openOrderTab(SOURCE_PLAN);

    const saveTemplateBtn = page.getByRole("button", { name: "Save as Template" });
    await expect(saveTemplateBtn).toBeVisible({ timeout: 15000 });
    await saveTemplateBtn.click();

    const dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox").fill(TEMPLATE_NAME);
    const saved = page.waitForResponse(
      (r) => r.url().includes("/plantemplates/fromPlan/") && r.request().method() === "POST" && r.status() === 200,
      { timeout: 15000 }
    );
    await dialog.getByRole("button", { name: "Save" }).click();
    await saved;
    await expect(dialog).toBeHidden({ timeout: 10000 });
  });

  test("template appears in the manager", async () => {
    await gotoPlanList();
    await page.locator("button").getByText("Templates").first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText(TEMPLATE_NAME)).toBeVisible({ timeout: 10000 });
    await dialog.getByRole("button", { name: "Close" }).click();
  });

  test("creates a new plan from the template and copies the order of service", async () => {
    await gotoPlanList();
    await page.locator('[data-testid="add-plan-button"]').click();

    // MUI v7 Select exposes an unnamed combobox — reach it via its FormControl label.
    await page.locator(".MuiFormControl-root", { hasText: "Start from template" }).getByRole("combobox").click();
    await page.getByRole("option", { name: TEMPLATE_NAME }).click();

    await page.locator('[name="name"]').fill(NEW_PLAN);
    await page.locator('[id="serviceDate"]').fill("2031-05-04");

    const applied = page.waitForResponse(
      (r) => r.url().includes("/plantemplates/apply/") && r.request().method() === "POST" && r.status() === 200,
      { timeout: 20000 }
    );
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await applied;

    await openOrderTab(NEW_PLAN);
    await expect(page.getByText(CAPTURED_HEADER).first()).toBeVisible({ timeout: 15000 });
  });

  test("cleanup: deletes the new plan and the template", async () => {
    // Delete the throwaway plan via its card's Edit -> Delete.
    await gotoPlanList();
    const card = page.locator(".MuiCard-root").filter({ has: page.getByRole("link", { name: NEW_PLAN, exact: true }) });
    await card.getByRole("button", { name: "Edit" }).click();
    // FormCard's delete carries id="delete"; scope to it (the page has other Delete buttons).
    await page.locator("#delete").click();
    await expect(page.getByRole("link", { name: NEW_PLAN, exact: true })).toHaveCount(0, { timeout: 10000 });

    // Delete the template from the manager (confirms via window.confirm).
    await gotoPlanList();
    await page.locator("button").getByText("Templates").first().click();
    const dialog = page.getByRole("dialog");
    const row = dialog.locator("tr").filter({ hasText: TEMPLATE_NAME });
    page.once("dialog", (d) => d.accept());
    await row.getByRole("button", { name: "Delete" }).click();
    await expect(dialog.getByText(TEMPLATE_NAME)).toHaveCount(0, { timeout: 10000 });
  });
});
