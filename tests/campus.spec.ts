import type { Page, Locator } from "@playwright/test";
import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";
import { navigateToSettings, navigateToPeople, navigateToGroups } from "./helpers/navigation";
import { openKnownPerson, editIconButton, personDetailsEditButton, SEED_PEOPLE, confirmDelete } from "./helpers/fixtures";
import { STORAGE_STATE_PATH } from "./global-setup";

const MAIN = "Main Campus";
const NORTH = "North Campus";
const SOUTH = "South Campus";

test.describe.serial("Campus multi-site", () => {
  // Serial retry would duplicate fixtures, making selectors ambiguous.
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

  const expectResponse = async (urlPart: string, action: () => Promise<void>, method = "POST") => {
    const resp = page.waitForResponse(
      (r) => r.url().includes(urlPart) && r.request().method() === method && r.status() === 200,
      { timeout: 15000 }
    );
    await action();
    await resp;
  };

  const pickOption = async (trigger: Locator, name: string) => {
    await trigger.click();
    await page.getByRole("option", { name }).click();
  };

  const saveInputBox = (boxId: string) => () => page.locator(boxId).getByRole("button", { name: "Save" }).click();
  const clickSave = () => page.locator("button").getByText("Save", { exact: true }).click();

  const gotoCampuses = async () => {
    await navigateToSettings(page);
    await page.getByRole("button", { name: "Campuses" }).click();
    await expect(page.getByTestId("add-campus-button")).toBeVisible({ timeout: 15000 });
  };

  const createCampus = async (name: string) => {
    await page.getByTestId("add-campus-button").click();
    // data-testid on wrapper; actual input is a child locator.
    const nameInput = page.getByTestId("campus-name-input").locator("input");
    await expect(nameInput).toBeVisible({ timeout: 10000 });
    await nameInput.fill(name);
    await expectResponse("/campuses", saveInputBox("#campusBox"));
    await expect(page.locator("table tbody tr").filter({ hasText: name }).first()).toBeVisible({ timeout: 10000 });
  };

  test("lists seeded Main Campus and creates North/South campuses", async () => {
    await gotoCampuses();
    await expect(page.locator("table tbody tr").filter({ hasText: MAIN }).first()).toBeVisible({ timeout: 10000 });
    await createCampus(NORTH);
    await createCampus(SOUTH);
  });

  test("edits a campus and persists the change", async () => {
    await page.locator("table tbody tr").filter({ hasText: NORTH }).first().click();
    const city = page.locator("#city");
    await expect(city).toBeVisible({ timeout: 10000 });
    await city.fill("Northtown");
    await expectResponse("/campuses", saveInputBox("#campusBox"));
    await page.locator("table tbody tr").filter({ hasText: NORTH }).first().click();
    await expect(page.locator("#city")).toHaveValue("Northtown", { timeout: 10000 });
  });

  test("assigns a person to a campus and persists", async () => {
    await openKnownPerson(page, SEED_PEOPLE.DONALD);
    await personDetailsEditButton(page).first().click();
    const select = page.getByTestId("campus-select");
    await expect(select).toBeVisible({ timeout: 10000 });
    await pickOption(select, NORTH);
    await expectResponse("/people", clickSave);
    await personDetailsEditButton(page).first().click();
    await expect(page.getByTestId("campus-select")).toContainText(NORTH, { timeout: 10000 });
  });

  test("shows the campus column on the people list", async () => {
    await navigateToPeople(page);
    await page.getByTestId("columns-button").click();
    // MUI Checkbox: target inner <input> via name attribute.
    const checkbox = page.locator('#fieldsMenu input[name="campus"]');
    await expect(checkbox).toBeVisible({ timeout: 10000 });
    await checkbox.check();
    await page.locator("#fieldsMenu").getByRole("button", { name: "Close" }).click();
    const donaldRow = page.locator("table tbody tr").filter({ hasText: "Donald Clark" }).first();
    await expect(donaldRow).toContainText(NORTH, { timeout: 10000 });
  });

  test("filters people by the belongs-to-campus condition", async () => {
    await navigateToPeople(page);
    // Match arrow to avoid SavedLists "advanced search" copy.
    await page.locator("p").getByText(/[▶▼] Advanced/).click();
    const membership = page.locator(".MuiAccordion-root").filter({ hasText: "Membership & Groups" });
    await membership.getByText("Membership & Groups").click();
    // Use label-relative xpath to survive field reordering.
    const campusCheckbox = membership.getByText("Campus", { exact: true })
      .locator('xpath=preceding-sibling::span//input[@type="checkbox"]');
    await expect(campusCheckbox).toBeVisible({ timeout: 10000 });
    await campusCheckbox.check();
    // Default is Main; pick North to match Donald's assignment above.
    const valueSelect = membership.locator('[aria-haspopup="listbox"]').first();
    await expect(valueSelect).toBeVisible({ timeout: 10000 });
    await expectResponse("/people/advancedSearch", () => pickOption(valueSelect, NORTH));
    await expect(page.locator("table tbody tr").filter({ hasText: "Donald Clark" }).first()).toBeVisible({ timeout: 10000 });
  });

  test("bulk-assigns selected people to a campus", async () => {
    await navigateToPeople(page);
    const row = page.locator("table tbody tr").filter({ hasText: SEED_PEOPLE.CAROL }).first();
    await expect(row).toBeVisible({ timeout: 10000 });
    await row.getByRole("checkbox").check();
    await page.getByTestId("bulk-actions-button").click();
    await page.getByTestId("bulk-action-campusId").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await pickOption(dialog.getByTestId("bulk-field-select"), SOUTH);
    await expectResponse("/people/bulk-update", () => dialog.getByTestId("bulk-field-apply").click());
    await expect(dialog).toHaveCount(0, { timeout: 10000 });
  });

  test("assigns a group to a campus and persists", async () => {
    await navigateToGroups(page);
    await page.locator("table tbody tr a").first().click();
    await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
    await editIconButton(page).first().click();
    const select = page.getByTestId("group-campus-select");
    await expect(select).toBeVisible({ timeout: 10000 });
    await pickOption(select, NORTH);
    await expectResponse("/membership/groups", clickSave);
    await editIconButton(page).first().click();
    await expect(page.getByTestId("group-campus-select")).toContainText(NORTH, { timeout: 10000 });
  });

  test("renders the campus distribution chart on Demographics", async () => {
    await page.goto("/people/demographics");
    // The campus donut only renders once the demographics payload resolves, so
    // asserting its title is enough (and avoids racing on the XHR vs. page load).
    await expect(page.getByText("Campus", { exact: true }).first()).toBeVisible({ timeout: 15000 });
  });

  test("assigns a plan to a campus", async () => {
    // Create test ministry so admin gains Plans__Edit via membership (seeded ones 401).
    await page.goto("/serving/plans");
    await page.waitForURL(/\/serving\/plans/, { timeout: 15000 });
    await page.locator("button").getByText("Add Ministry").click();
    await page.locator('[name="name"]').fill("Barnabas Ministry");
    await page.locator("button").getByText("Add").first().click();
    const minTab = page.locator('[role="tab"]').getByText("Barnabas Ministry").first();
    await expect(minTab).toBeVisible({ timeout: 10000 });
    await minTab.click();
    await page.locator("button").getByText("Create Plan Type").click();
    await page.locator('[name="name"]').fill("Barnabas Plans");
    await page.locator("button").getByText("Save").click();
    const planType = page.locator("a").getByText("Barnabas Plans");
    await expect(planType).toBeVisible({ timeout: 10000 });
    await planType.click();
    await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/, { timeout: 10000 });
    await page.locator('[data-testid="add-plan-button"]').click();
    await page.locator('[name="name"]').fill("Campus Assignment Plan");
    await page.locator('[id="serviceDate"]').fill("2030-04-01");
    await expectResponse("/plans", clickSave);
    // Icon-only button, find by aria-label.
    const editBtn = page.locator('button[aria-label="Edit"]').first();
    await expect(editBtn).toBeVisible({ timeout: 10000 });
    await editBtn.click();
    const select = page.getByTestId("plan-campus-select");
    await expect(select).toBeVisible({ timeout: 10000 });
    await pickOption(select, MAIN);
    await expectResponse("/plans", clickSave);
  });

  // Regression: Plans/Edit under DoingApi allows Domain Admin to edit seeded-ministry plans.
  test("Domain Admin can edit a seeded ministry plan without being a member", async () => {
    await page.goto("/serving/plans");
    const planType = page.locator("a").getByText("Sunday Service").first();
    await expect(planType).toBeVisible({ timeout: 10000 });
    await planType.click();
    await expect(page).toHaveURL(/\/serving\/planTypes\/[^/]+/, { timeout: 10000 });
    await page.locator('button[aria-label="Edit"]').first().click();
    const select = page.getByTestId("plan-campus-select");
    await expect(select).toBeVisible({ timeout: 10000 });
    await pickOption(select, MAIN);
    await expectResponse("/plans", clickSave);
  });

  test("deletes the created campuses", async () => {
    await gotoCampuses();
    for (const name of [NORTH, SOUTH]) {
      const row = page.locator("table tbody tr").filter({ hasText: name }).first();
      if (!(await row.isVisible({ timeout: 5000 }).catch(() => false))) continue;
      await row.click();
      await expect(page.locator("#campusBox")).toBeVisible({ timeout: 10000 });
      await expectResponse("/campuses", async () => {
        await page.locator("#campusBox").getByRole("button", { name: "Delete" }).click();
        await confirmDelete(page);
      }, "DELETE");
      await expect(page.locator("table tbody tr").filter({ hasText: name })).toHaveCount(0, { timeout: 10000 });
    }
  });
});
