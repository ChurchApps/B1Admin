import type { Page } from "@playwright/test";
import { servingTest as test, expect } from "./helpers/test-fixtures";
import { dismissSendInviteIfPresent, editIconButton, confirmDelete } from "./helpers/fixtures";
import { login } from "./helpers/auth";
import { navigateToServing } from "./helpers/navigation";
import { STORAGE_STATE_PATH } from "./global-setup";

// JETHRO is the marker name; the file is one serial chain testing auto-scheduling features.
test.describe.serial("Auto-Scheduling (2.14/2.15)", () => {
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
    // Detail pages live at /serving/plans/:id (exact match to avoid false positives).
    if (!/\/serving\/plans$/.test(page.url().split("?")[0])) {
      await page.goto("/serving/plans");
      await page.waitForURL(/\/serving\/plans/, { timeout: 15000 });
    }
    const minBtn = page.locator('[role="tab"]').getByText("Jethro Ministry").first();
    await expect(minBtn).toBeVisible({ timeout: 10000 });
    await minBtn.click();
  };

  const openPlanPage = async () => {
    await openMinistryTab();
    const plansBtn = page.locator("a").getByText("Jethro Plans");
    await expect(plansBtn).toBeVisible({ timeout: 10000 });
    await plansBtn.click();
    await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
    const planLink = page.locator("a").getByText("Jethro Service");
    await expect(planLink).toBeVisible({ timeout: 10000 });
    await planLink.click();
    await expect(page).toHaveURL(/\/serving\/plans\/[^/]+/);
  };

  const addTeamMember = async (searchText: string, fullName: string) => {
    const personSearch = page.locator('[name="personAddText"]');
    await expect(personSearch).toBeVisible({ timeout: 10000 });
    await personSearch.fill(searchText);
    await page.locator('[data-testid="person-add-search-button"]').click();
    const row = page.locator("tr", { hasText: fullName });
    const addBtn = row.locator('[data-testid^="add-person-button-"]').first();
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();
    // Invite dialog opens after POST resolves; wait instead of polling.
    const inviteDialog = page.locator('div[role="dialog"]:has-text("Send Invite Email")');
    await inviteDialog.waitFor({ state: "visible", timeout: 5000 }).catch(() => { });
    if (await inviteDialog.isVisible().catch(() => false)) {
      await inviteDialog.locator('button:has-text("No Thanks")').click();
      await inviteDialog.waitFor({ state: "hidden", timeout: 5000 }).catch(() => { });
    }
    const verifiedPerson = page.locator('[id="groupMembersBox"] a').getByText(fullName);
    await expect(verifiedPerson).toHaveCount(1, { timeout: 10000 });
  };

  test("setup: create ministry", async () => {
    await page.goto("/serving/plans");
    await page.waitForURL(/\/serving\/plans/, { timeout: 15000 });
    await page.locator("button").getByText("Add Ministry").click();
    await page.locator('[name="name"]').fill("Jethro Ministry");
    await page.locator("button").getByText("Add").first().click();
    await expect(page.locator('[role="tab"]').getByText("Jethro Ministry")).toHaveCount(1, { timeout: 10000 });
  });

  test("setup: create team with Dorothy and Grace", async () => {
    await openMinistryTab();
    await page.locator('[data-testid="add-team-button"]').click();
    await page.locator('[name="name"]').fill("Jethro Team");
    await page.locator("button").getByText("Add").last().click();
    const teamLink = page.locator("a").getByText("Jethro Team");
    await expect(teamLink).toBeVisible({ timeout: 10000 });
    await teamLink.click();
    await expect(page).toHaveURL(/\/groups\/[^/]+/);
    await addTeamMember("Dorothy", "Dorothy Jackson");
    await addTeamMember("Grace", "Grace Jackson");
  });

  test("setup: create plan type and plan", async () => {
    await openMinistryTab();
    await page.locator("button").getByText("Create Plan Type").click();
    await page.locator('[name="name"]').fill("Jethro Plans");
    await page.locator("button").getByText("Save").click();
    const plansBtn = page.locator("a").getByText("Jethro Plans");
    await expect(plansBtn).toBeVisible({ timeout: 10000 });
    await plansBtn.click();
    await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);

    await page.locator('[data-testid="add-plan-button"]').click();
    await page.locator('[name="name"]').fill("Jethro Service");
    // Far-future Sunday avoids demo blockouts and conflicts.
    await page.locator('[id="serviceDate"]').fill("2030-06-09");
    await page.locator("button").getByText("Save").click();
    await expect(page.locator("a").getByText("Jethro Service")).toHaveCount(1, { timeout: 10000 });
  });

  test("setup: add position and service time", async () => {
    await openPlanPage();

    await page.locator('[data-testid="add-position-button"]').click();
    // CreatableSelect; explicitly pick Band to set form value.
    await page.locator(".comboBox").click();
    await page.getByRole("option", { name: "Band" }).click();
    await page.locator('[id="name"]').fill("Greeter");
    // MUI v7 Select unnamed; find via FormControl text.
    await page.locator(".MuiFormControl-root", { hasText: "Volunteer Group" }).getByRole("combobox").click();
    await page.getByRole("option", { name: "Jethro Team" }).click();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.locator(".positionsTable").getByText("Greeter")).toBeVisible({ timeout: 10000 });

    await page.locator('[data-testid="add-time-button"]').click();
    await page.locator('[data-testid="time-display-name-input"] input, input[id="displayName"]').first().fill("Morning Service");
    await page.locator('input[id="startTime"]').fill("2030-06-09T09:00");
    await page.locator('input[id="endTime"]').fill("2030-06-09T10:30");
    await page.locator('[data-testid="team-checkbox-band"] input').check();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Morning Service").first()).toBeVisible({ timeout: 10000 });
  });

  test("scheduling preferences persist for a volunteer", async () => {
    await openPlanPage();
    await page.locator("button").getByText("1 Person Needed").click();

    const dorothyRow = page.locator("tr", { hasText: "Dorothy Jackson" });
    await expect(dorothyRow.locator('[data-testid^="preferences-button-"]')).toBeVisible({ timeout: 10000 });
    await dorothyRow.locator('[data-testid^="preferences-button-"]').click();

    const dialog = page.locator('[data-testid="scheduling-preference-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    // Dorothy prefers evenings; plan has only 9:00 am time, so auto-assign skips her.
    await dialog.locator('[data-testid="preferred-times-input"] input').fill("8:00 pm");
    await dialog.locator('[data-testid="max-per-month-input"] input').fill("2");
    const prefPost = page.waitForResponse(r => r.url().includes("/schedulingPreferences") && r.request().method() === "POST", { timeout: 15000 });
    await dialog.locator('[data-testid="preference-save-button"]').click();
    await prefPost;
    await expect(dialog).toHaveCount(0, { timeout: 10000 });

    // Reopen dialog to confirm persistence.
    await dorothyRow.locator('[data-testid^="preferences-button-"]').click();
    const dialog2 = page.locator('[data-testid="scheduling-preference-dialog"]');
    await expect(dialog2).toBeVisible({ timeout: 10000 });
    await expect(dialog2.locator('[data-testid="preferred-times-input"] input')).toHaveValue("8:00 pm", { timeout: 10000 });
    await expect(dialog2.locator('[data-testid="max-per-month-input"] input')).toHaveValue("2");
    await dialog2.locator('[data-testid="preference-cancel-button"]').click();
    await expect(dialog2).toHaveCount(0, { timeout: 10000 });
    await page.locator("button").getByText("Done").click();
  });

  test("auto-assign picks the volunteer whose preferred time matches", async () => {
    await openPlanPage();
    const autofillPost = page.waitForResponse(r => r.url().includes("/plans/autofill/") && r.request().method() === "POST", { timeout: 15000 });
    await page.locator('[data-testid="auto-assign-button"]').click();
    await autofillPost;
    // Grace has no preference; Dorothy prefers 8:00 pm against a 9:00 am service.
    await expect(page.locator(".positionsTable").getByText("Grace Jackson")).toBeVisible({ timeout: 15000 });
    await expect(page.locator(".positionsTable").getByText("Dorothy Jackson")).toHaveCount(0);
    await expect(page.locator('[data-testid="undo-auto-assign-button"]')).toBeVisible({ timeout: 15000 });
  });

  test("undo removes the last auto-assign run", async () => {
    await openPlanPage();
    const undoBtn = page.locator('[data-testid="undo-auto-assign-button"]');
    await expect(undoBtn).toBeVisible({ timeout: 15000 });
    const undoPost = page.waitForResponse(r => r.url().includes("/undo") && r.request().method() === "POST", { timeout: 15000 });
    await undoBtn.click();
    await undoPost;
    await expect(page.locator(".positionsTable").getByText("Grace Jackson")).toHaveCount(0, { timeout: 15000 });
    await expect(page.locator("button").getByText("1 Person Needed")).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="undo-auto-assign-button"]')).toHaveCount(0, { timeout: 15000 });
  });

  test("penciled-in plan shows chip and hides nothing from admins", async () => {
    await openMinistryTab();
    const plansBtn = page.locator("a").getByText("Jethro Plans");
    await plansBtn.click();
    await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
    await page.locator('button[aria-label="Edit"]').first().click();
    await page.locator('[data-testid="prepared-checkbox"] input').check();
    await page.locator("button").getByText("Save").click();
    await expect(page.locator('[data-testid="prepared-checkbox"]')).toHaveCount(0, { timeout: 10000 });

    const planLink = page.locator("a").getByText("Jethro Service");
    await planLink.click();
    await expect(page).toHaveURL(/\/serving\/plans\/[^/]+/);
    await expect(page.locator('[data-testid="penciled-in-chip"]')).toBeVisible({ timeout: 15000 });
    // Penciled-in copy + publish action surface in the validation panel.
    await expect(page.locator('[data-testid="publish-plan-button"]')).toBeVisible({ timeout: 15000 });
  });

  test("publish & notify clears the penciled-in state", async () => {
    await openPlanPage();
    // Schedule someone to generate notification for publish.
    const autofillPost = page.waitForResponse(r => r.url().includes("/plans/autofill/") && r.request().method() === "POST", { timeout: 15000 });
    await page.locator('[data-testid="auto-assign-button"]').click();
    await autofillPost;
    await expect(page.locator(".positionsTable").getByText("Grace Jackson")).toBeVisible({ timeout: 15000 });

    const publishBtn = page.locator('[data-testid="publish-plan-button"]');
    await expect(publishBtn).toBeVisible({ timeout: 15000 });
    const planPost = page.waitForResponse(r => r.url().includes("/doing/plans") && r.request().method() === "POST", { timeout: 15000 });
    await publishBtn.click();
    await confirmDelete(page);
    await planPost;
    await expect(page.locator('[data-testid="penciled-in-chip"]')).toHaveCount(0, { timeout: 15000 });
    await expect(page.locator('[data-testid="publish-plan-button"]')).toHaveCount(0, { timeout: 15000 });
    await expect(page.getByText("All volunteers notified.")).toBeVisible({ timeout: 15000 });
  });

  test("cleanup: delete plan, team and ministry", async () => {
    await openMinistryTab();
    const plansBtn = page.locator("a").getByText("Jethro Plans");
    await plansBtn.click();
    await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/);
    await page.locator('button[aria-label="Edit"]').first().click();
    await page.locator("button").getByText("Delete").click();
    await expect(page.locator("a").getByText("Jethro Service")).toHaveCount(0, { timeout: 10000 });

    page.once("dialog", async dialog => { await dialog.accept(); });
    await openMinistryTab();
    const teamLink = page.locator("a").getByText("Jethro Team");
    await expect(teamLink).toBeVisible({ timeout: 10000 });
    await teamLink.click();
    await expect(page).toHaveURL(/\/groups\/[^/]+/);
    const teamEditBtn = editIconButton(page).first();
    await expect(teamEditBtn).toBeVisible({ timeout: 10000 });
    await teamEditBtn.click();
    await page.locator("button").getByText("Delete").click();
    await expect(page.locator("table a").getByText("Jethro Team")).toHaveCount(0, { timeout: 10000 });

    page.once("dialog", async dialog => { await dialog.accept(); });
    await openMinistryTab();
    await page.locator("a").getByText("Edit Ministry").click();
    const minEditBtn = editIconButton(page).first();
    await expect(minEditBtn).toBeVisible({ timeout: 10000 });
    await minEditBtn.click();
    const deleteBtn = page.locator("button").getByText("Delete");
    await expect(deleteBtn).toBeVisible({ timeout: 10000 });
    await deleteBtn.click();
    await expect(page.locator("table a").getByText("Jethro Ministry")).toHaveCount(0, { timeout: 10000 });
  });
});
