import { request as pwRequest, type APIRequestContext, type Page } from "@playwright/test";
import { settingsTest as test, expect } from "./helpers/test-fixtures";
import { dismissSendInviteIfPresent, confirmDelete, openPersonRow, personDetailsEditButton, SEED_PEOPLE } from "./helpers/fixtures";
import { login } from "./helpers/auth";
import { navigateToSettings, navigateToRoles, navigateToForms, navigateTo, siblingNav } from "./helpers/navigation";
import { STORAGE_STATE_PATH } from "./global-setup";

// ZACCHAEUS/ZEBEDEE are the names used for testing. If you see Zacchaeus or Zebedee entered anywhere, it is a result of these tests.
test.describe.serial("Settings Management", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
    await navigateToSettings(page);
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  const closeAnyModal = async () => {
    // ESC on MUI Dialog triggers onClose, closing any modal without button selector dependency.
    for (let i = 0; i < 6; i++) {
      const anyModal = page.locator(".MuiDialog-container");
      if (!(await anyModal.first().isVisible({ timeout: 200 }).catch(() => false))) return;
      await page.keyboard.press("Escape");
      await page.waitForTimeout(150);
    }
  };

  const dismissInviteLoop = async () => {
    // SendInviteDialog intercepts nav clicks — dismiss any leftover.
    for (let i = 0; i < 5; i++) {
      await dismissSendInviteIfPresent(page, 1500);
      const dialog = page.locator('div[role="dialog"]:has-text("Send Invite Email")');
      if (!(await dialog.isVisible({ timeout: 250 }).catch(() => false))) break;
    }
    await closeAnyModal();
  };

  const navigateWithModalGuard = async (nav: () => Promise<void>) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      await closeAnyModal();
      try {
        await nav();
        return;
      } catch (err) {
        // Modal may have appeared mid-click — dismiss and retry.
        await closeAnyModal();
        if (attempt === 2) throw err;
      }
    }
  };

  test.describe.serial("Church Settings", () => {
    test.describe.configure({ retries: 0 });

    test.beforeEach(async () => {
      await dismissInviteLoop();
      // Return to settings landing if navigated away.
      if (!/\/settings(\?|$|\/$)/.test(page.url())) {
        await navigateWithModalGuard(() => navigateToSettings(page));
      }
      await expect(page.locator('[data-testid="settings-section-church-info"]')).toBeVisible({ timeout: 15000 });
    });

    test("should edit church", async () => {
      const editBtn = page.locator('[data-testid="small-button-edit"]').first();
      await editBtn.dispatchEvent("click");
      const churchName = page.locator('[name="churchName"]');
      await expect(churchName).toBeVisible({ timeout: 10000 });
      const originalName = await churchName.inputValue();
      await churchName.fill("Gracious Community Church");
      const saveBtn = page.locator("button").getByText("Save");
      await saveBtn.click();
      // Wait for the edit panel to close (back to read-only view) before re-opening.
      await expect(churchName).toHaveCount(0, { timeout: 10000 });
      await editBtn.dispatchEvent("click");
      await expect(churchName).toBeVisible({ timeout: 10000 });
      await churchName.fill(originalName || "Grace Community Church");
      await saveBtn.click();
      await expect(churchName).toHaveCount(0, { timeout: 10000 });
    });

    test("should cancel editing church", async () => {
      const editBtn = page.locator('[data-testid="small-button-edit"]').first();
      await editBtn.dispatchEvent("click");
      const churchName = page.locator('[name="churchName"]');
      await expect(churchName).toBeVisible({ timeout: 10000 });
      const cancelBtn = page.locator("button").getByText("Cancel");
      await cancelBtn.click();
      await expect(churchName).toHaveCount(0);
    });
  });

  test.describe.serial("Roles", () => {
    // Retries would create duplicate role rows; data is shared across serial tests.
    test.describe.configure({ retries: 0 });

    test.beforeEach(async () => {
      await dismissInviteLoop();
      if (!/\/settings\/roles/.test(page.url())) {
        await navigateWithModalGuard(() => navigateToRoles(page));
      }
      await expect(page.locator('[data-testid="add-role-button"]')).toBeVisible({ timeout: 15000 });
    });

    test("should create role", async () => {
      const addBtn = page.locator('[data-testid="add-role-button"]');
      await addBtn.click();
      const custom = page.locator("li").getByText("Add Custom Role");
      await custom.click();
      const roleName = page.locator('[name="roleName"]');
      await roleName.fill("Zacchaeus Test Role");
      const saveBtn = page.locator("button").getByText("Save");
      // Wait for POST to complete so table refresh is reflected before assertion.
      const rolePost = page.waitForResponse(
        r => r.url().includes("/membership/roles") && r.request().method() === "POST",
        { timeout: 15000 }
      ).catch((): null => null);
      await saveBtn.click();
      await rolePost;
      const validatedRole = page.locator("a").getByText("Zacchaeus Test Role");
      await expect(validatedRole).toHaveCount(1, { timeout: 10000 });
    });

    test("should add person to role", async () => {
      const role = page.locator("a").getByText("Zacchaeus Test Role").first();
      await role.click();
      const addBtn = page.locator('[data-testid="add-role-member-button"]');
      await addBtn.click();
      const searchBox = page.locator('[name="personAddText"]');
      await searchBox.fill("Jennifer Williams");
      const searchBtn = page.locator('[data-testid="search-button"]');
      await searchBtn.click();
      const selectBtn = page.locator('[data-testid^="add-person-"]').first();
      await selectBtn.click();
      // Auto-save opens SendInviteDialog; dismiss before asserting on Members table.
      await dismissSendInviteIfPresent(page);
      const validatedPerson = page.locator("table tbody tr").filter({ hasText: "Jennifer Williams" }).first();
      await expect(validatedPerson).toBeVisible({ timeout: 15000 });
      // SendInviteDialog may race with navigation — dismiss until gone.
      for (let i = 0; i < 3; i++) {
        await dismissSendInviteIfPresent(page, 1500);
        const dialog = page.locator('div[role="dialog"]:has-text("Send Invite Email")');
        if (!(await dialog.isVisible({ timeout: 500 }).catch(() => false))) break;
      }
    });

    test("should edit role", async () => {
      const editBtn = page.locator('[data-testid="edit-role-button"]').last();
      await editBtn.click();
      const roleName = page.locator('[name="roleName"]');
      await expect(roleName).toHaveValue("Zacchaeus Test Role", { timeout: 10000 });
      await roleName.fill("Zebedee Test Role");
      const saveBtn = page.locator("button").getByText("Save");
      await saveBtn.click();
      const validatedRole = page.locator("a").getByText("Zebedee Test Role");
      await expect(validatedRole).toHaveCount(1, { timeout: 30000 });
    });

    test("should cancel editing role", async () => {
      const editBtn = page.locator('[data-testid="edit-role-button"]').last();
      await editBtn.click();
      const roleName = page.locator('[name="roleName"]');
      await expect(roleName).toHaveCount(1);
      const cancelBtn = page.locator("button").getByText("Cancel");
      await cancelBtn.click();
      await expect(roleName).toHaveCount(0);
    });

    test("should delete role", async () => {
      const editBtn = page.locator('[data-testid="edit-role-button"]').last();
      await editBtn.click();
      const deleteBtn = page.locator("button").getByText("Delete");
      await deleteBtn.click();
      await confirmDelete(page);
      const validatedDeletion = page.locator("a").getByText("Zebedee Test Role");
      await expect(validatedDeletion).toHaveCount(0);
    });
  });

  test.describe.serial("Mobile Settings", () => {
    // Tab create/edit/delete isn't idempotent — a retry would add a duplicate
    // tab and break the count assertions.
    test.describe.configure({ retries: 0 });

    test.beforeEach(async () => {
      await navigateTo(page, "mobile");
      await expect(page.locator("button").getByText("Add Tab")).toBeVisible({ timeout: 10000 });
    });

    // "Settings Tab" names are unique to this spec (mobile-app.spec uses "Zacchaeus Test Tab" concurrently).
    test("should create mobile app tab", async () => {
      const addBtn = page.locator("button").getByText("Add Tab");
      await addBtn.dispatchEvent("click");
      const tabName = page.locator('[name="text"]');
      await tabName.fill("Zacchaeus Settings Tab");
      const url = page.locator('[name="url"]');
      await url.fill("https://pony.town/");
      const saveBtn = page.locator("button").getByText("Save Tab");
      await saveBtn.click();
      const validatedTab = page.locator("h3").getByText("Zacchaeus Settings Tab");
      await expect(validatedTab).toHaveCount(1);
    });

    test("should edit mobile app tab", async () => {
      const row = page.getByRole("listitem").filter({ hasText: "Zacchaeus Settings Tab" }).first();
      await row.locator('button[aria-label="Edit"]').click();
      const tabName = page.locator('[name="text"]');
      await expect(tabName).toHaveValue("Zacchaeus Settings Tab", { timeout: 10000 });
      await tabName.fill("Zebedee Settings Tab");
      const saveBtn = page.locator("button").getByText("Save Tab");
      await saveBtn.click();
      const validatedTab = page.locator("h3").getByText("Zebedee Settings Tab");
      await expect(validatedTab).toHaveCount(1);
    });

    test("should cancel edit mobile app tab", async () => {
      const row = page.getByRole("listitem").filter({ hasText: "Zebedee Settings Tab" }).first();
      await row.locator('button[aria-label="Edit"]').click();
      const tabName = page.locator('[name="text"]');
      await expect(tabName).toHaveCount(1);
      const cancelBtn = page.locator("button").getByText("Cancel");
      await cancelBtn.click();
      await expect(tabName).toHaveCount(0);
    });

    test("should delete mobile app tab", async () => {
      const row = page.getByRole("listitem").filter({ hasText: "Zebedee Settings Tab" }).first();
      await row.locator('button[aria-label="Edit"]').click();
      const deleteBtn = page.locator("button").getByText("Delete");
      await deleteBtn.click();
      await confirmDelete(page);
      const validatedDeletion = page.locator("h3").getByText("Zebedee Settings Tab");
      await expect(validatedDeletion).toHaveCount(0);
    });
  });

  test.describe.serial("Form Settings", () => {
    test.beforeEach(async () => {
      // Forms now live under People → Forms; navigate there before each test.
      await navigateToForms(page);
      await expect(page.locator('[data-testid="add-form-button"]')).toBeVisible({ timeout: 10000 });
    });

    test("should create form", async () => {
      // Clean up leftover test forms from previous runs.
      for (let i = 0; i < 10; i++) {
        const octavRows = page.locator("tr").filter({ has: page.locator("a, td").filter({ hasText: /^Octav/ }) });
        const count = await octavRows.count();
        if (count === 0) break;
        const editBtn = octavRows.first().getByRole("button", { name: /Edit/ });
        if (!await editBtn.isVisible().catch(() => false)) break;
        await editBtn.click();
        // Wait for form data to load before clicking delete
        await expect(page.locator('[name="name"]')).toBeVisible({ timeout: 5000 });
        page.once("dialog", d => d.accept());
        await page.locator("button").getByText("Delete").first().click();
        // Wait for the total count of matching rows to decrease
        await expect(octavRows).toHaveCount(count - 1, { timeout: 5000 }).catch(() => { });
      }

      const addBtn = page.locator('[data-testid="add-form-button"]');
      await addBtn.dispatchEvent("click");
      const formName = page.locator('[name="name"]');
      await formName.fill("Zacchaeus Test Form");
      const association = page.locator('[id="mui-component-select-contentType"]');
      await association.click();
      const selAssociation = page.locator("li").getByText("Stand Alone");
      await selAssociation.click();
      const restriction = page.locator('[id="mui-component-select-restricted"]');
      await restriction.click();
      const selRestriction = page.locator("li").getByText("Restricted");
      await selRestriction.click();
      const thanksMsg = page.locator('[name="thankYouMessage"]');
      await thanksMsg.fill("Thanks from Zacchaeus");
      const saveBtn = page.locator("button").getByText("Save");
      await saveBtn.click();
      const validatedForm = page.locator("a").getByText("Zacchaeus Test Form").first();
      await expect(validatedForm).toBeVisible({ timeout: 10000 });
    });

    test("should edit form", async () => {
      // Target the form we created, not the first Edit button (which may be a seed form)
      const zacchaeusRow = page.locator("tr").filter({ hasText: "Zacchaeus Test Form" }).first();
      const editBtn = zacchaeusRow.getByRole("button", { name: "Edit" });
      await editBtn.click();
      // Wait for API form data to load before editing (prevents contentType reset to default "person")
      const formName = page.locator('[name="name"]');
      await expect(formName).toHaveValue("Zacchaeus Test Form", { timeout: 10000 });
      await formName.fill("Zebedee Test Form");
      const saveBtn = page.locator("button").getByText("Save");
      await saveBtn.click();
      const validatedForm = page.locator("a").getByText("Zebedee Test Form").first();
      await expect(validatedForm).toBeVisible();
    });

    test("should cancel editing form", async () => {
      const octavRow = page.locator("tr").filter({ hasText: "Zebedee Test Form" }).first();
      const editBtn = octavRow.getByRole("button", { name: "Edit" });
      await editBtn.click();
      const formName = page.locator('[name="name"]');
      await expect(formName).toHaveValue("Zebedee Test Form", { timeout: 10000 });
      const cancelBtn = page.locator("button").getByText("Cancel");
      await cancelBtn.click();
      await expect(formName).toHaveCount(0, { timeout: 5000 });
    });

    test("should add form questions", async () => {
      const form = page.locator("a").getByText("Zebedee Test Form").first();
      await form.click();

      const addBtn = page.locator("button").getByText("Add Question");
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      const selectBox = page.locator('[role="combobox"]').first();
      await selectBox.click();
      const multChoice = page.locator("li").getByText("Multiple Choice");
      await multChoice.click();
      const title = page.locator('[id="title"]');
      await title.fill("I support playwright testing. True or False?");
      const desc = page.locator('[id="title"]');
      await desc.fill("I support playwright testing. True or False?");
      const value = page.locator('[name="choiceValue"]');
      await value.fill("True");
      const choice = page.locator('[name="choiceText"]');
      await choice.fill("True");
      const addOpBtn = page.locator('[id="addQuestionChoiceButton"]');
      await addOpBtn.click();
      await value.fill("False");
      await choice.fill("False");
      await addOpBtn.click();
      const saveBtn = page.locator("button").getByText("Save");
      await saveBtn.click();

      const validatedAddition = page.locator("td button").getByText("I support playwright testing. True or False?");
      await expect(validatedAddition).toHaveCount(1, { timeout: 10000 });
    });

    test("should edit form questions", async () => {
      const form = page.locator("a").getByText("Zebedee Test Form").first();
      await form.click();

      // Wait for questions to load (depends on async memberPermission query)
      const question = page.locator("td button").getByText("I support playwright testing. True or False?");
      await expect(question).toBeVisible({ timeout: 10000 });
      await question.click();
      const title = page.locator('[id="title"]');
      // Wait for the edit form to finish loading the question data before filling
      await expect(title).toHaveValue("I support playwright testing. True or False?", { timeout: 5000 });
      await title.fill("True or False? I support playwright testing.");
      const saveBtn = page.locator("button").getByText("Save");
      const responsePromise = page.waitForResponse(resp => resp.url().includes("/questions") && resp.request().method() === "POST");
      await saveBtn.click();
      await responsePromise;
      const validatedEdit = page.locator("td button").getByText("True or False? I support playwright testing.").first();
      await expect(validatedEdit).toBeVisible({ timeout: 10000 });
    });

    test("should cancel editing form questions", async () => {
      const form = page.locator("a").getByText("Zebedee Test Form").first();
      await form.click();

      // Wait for questions to load (depends on async memberPermission query)
      const question = page.locator("td button").getByText("True or False? I support playwright testing.").first();
      await expect(question).toBeVisible({ timeout: 10000 });
      await question.click();
      const title = page.locator('[id="title"]');
      await expect(title).toHaveValue("True or False? I support playwright testing.", { timeout: 5000 });
      const cancelBtn = page.locator("button").getByText("Cancel");
      await cancelBtn.click();
      await expect(title).toHaveCount(0);
    });

    test("should delete form questions", async () => {
      const form = page.locator("a").getByText("Zebedee Test Form").first();
      await form.click();

      const question = page.locator("td button").getByText("True or False? I support playwright testing.").first();
      await expect(question).toBeVisible({ timeout: 10000 });
      await question.click();
      // Use button#delete instead of getByText to avoid race with transient buttons.
      const deleteBtn = page.locator("button#delete");
      await expect(deleteBtn).toBeVisible({ timeout: 5000 });
      await deleteBtn.click();
      await confirmDelete(page);
      await expect(question).toHaveCount(0, { timeout: 10000 });
    });

    test("should add form members", async () => {
      const form = page.locator("a").getByText("Zebedee Test Form").first();
      await form.click();
      const membersTab = page.locator('[role="tab"]').getByText("Form Members");
      await expect(membersTab).toBeVisible({ timeout: 10000 });
      await membersTab.click();

      const personSearch = page.locator('[name="personAddText"]');
      await personSearch.fill("Dorothy Jackson");
      const searchBtn = page.locator('[id="searchButton"]');
      await searchBtn.click();
      const addBtn = page.locator('[data-testid^="add-person-"]').first();
      await addBtn.click();

      const validatedAddition = page.locator("td a").getByText("Dorothy Jackson");
      await expect(validatedAddition).toHaveCount(1, { timeout: 10000 });
    });

    test("should remove form members", async () => {
      const form = page.locator("a").getByText("Zebedee Test Form").first();
      await form.click();
      const membersTab = page.locator('[role="tab"]').getByText("Form Members");
      await expect(membersTab).toBeVisible({ timeout: 10000 });
      await membersTab.click();

      const removeBtn = page.locator("button").getByText("Remove").last();
      await removeBtn.click();
      await confirmDelete(page);
      const validatedDeletion = page.locator("td a").getByText("Dorothy Jackson");
      await expect(validatedDeletion).toHaveCount(0, { timeout: 10000 });
    });

    test("should delete form", async () => {
      for (let i = 0; i < 10; i++) {
        const octavRow = page.locator("tr").filter({ hasText: "Zebedee Test Form" }).first();
        if (await octavRow.count() === 0) break;
        const editBtn = octavRow.getByRole("button", { name: "Edit" });
        if (!await editBtn.isVisible().catch(() => false)) break;
        await editBtn.click();
        const formName = page.locator('[name="name"]');
        await expect(formName).toHaveValue("Zebedee Test Form", { timeout: 10000 });
        // Use button#delete instead of getByText to avoid race with transient buttons.
        await page.locator("button#delete").click();
        await confirmDelete(page);
        await expect(octavRow).toHaveCount(0, { timeout: 10000 }).catch(() => { });
      }
      const validatedDeletion = page.locator("a").getByText("Zebedee Test Form");
      await expect(validatedDeletion).toHaveCount(0, { timeout: 10000 });
    });
  });

  test.describe("Settings landing — extras", () => {
    test.beforeEach(async () => {
      // Return to settings landing (prior tests left us on a sub-tab or /mobile).
      await navigateToSettings(page);
      await expect(page.locator('[data-testid="settings-section-church-info"]')).toBeVisible({ timeout: 15000 });
    });

    test("Church Information section edit exposes the name and subdomain fields", async () => {
      const editBtn = page.locator('[data-testid="small-button-edit"]').first();
      await editBtn.dispatchEvent("click");
      await expect(page.getByLabel("Church Name").first()).toBeVisible({ timeout: 10000 });
      await expect(page.getByLabel("Subdomain").first()).toBeVisible();
      // Restore read-only view for any following tests.
      await page.locator("button").getByText("Cancel").click();
    });

    test("Settings landing shows the configuration list and Roles in the secondary nav", async () => {
      await expect(page.locator('[data-testid="settings-section-church-info"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-testid="settings-section-campuses"]')).toBeVisible();
      const rolesNav = (await siblingNav(page)).getByText("Roles", { exact: true });
      await expect(rolesNav).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("Settings navigation", () => {
    test.beforeEach(async () => {
      await navigateToSettings(page);
      await expect(page.locator('[data-testid="settings-section-church-info"]')).toBeVisible({ timeout: 15000 });
    });

    test("the selected section is kept in the URL hash and survives a reload", async () => {
      await page.locator('[data-testid="settings-section-developer"]').click();
      await expect(page).toHaveURL(/#developer$/);
      await page.reload();
      await expect(page.locator('[data-testid="settings-section-developer"]')).toHaveClass(/Mui-selected/, { timeout: 15000 });
    });

    test("Email Templates, Audit Log and Batches are in the settings menu", async () => {
      const menu = await siblingNav(page);
      await expect(menu.getByText("Audit Log", { exact: true })).toBeVisible({ timeout: 10000 });
      await expect(menu.getByText("Batches", { exact: true })).toBeVisible();
      await menu.getByText("Email Templates", { exact: true }).click();
      await expect(page).toHaveURL(/\/settings\/email-templates/);
    });

    test("the old /settings/campuses route lands on the campuses section", async () => {
      await page.goto("/settings/campuses");
      await expect(page).toHaveURL(/\/settings#campuses$/);
      await expect(page.locator('[data-testid="settings-section-campuses"]')).toHaveClass(/Mui-selected/, { timeout: 15000 });
    });

    test("role permissions can be filtered", async () => {
      await page.goto("/settings/role/ROL00000010");
      const sections = page.locator("#rolePermissionsBox .MuiAccordion-root");
      await expect(sections.first()).toBeVisible({ timeout: 15000 });
      const total = await sections.count();
      const filter = page.getByTestId("role-permission-filter").locator("input");
      await filter.fill("zzzznomatch");
      await expect(sections).toHaveCount(0);
      await filter.fill("");
      await expect(sections).toHaveCount(total);
    });
  });

  test.describe.serial("Region", () => {
    test.describe.configure({ retries: 0 });

    const MONTH = "(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)";
    const DAY_FIRST = new RegExp(`^\\d{1,2} ${MONTH} \\d{4}$`);
    const MONTH_FIRST = new RegExp(`^${MONTH} \\d{1,2}, \\d{4}$`);

    const chooseRegion = async (region: string) => {
      await page.goto("/settings#region");
      const section = page.locator('[data-testid="settings-section-region"]');
      await expect(section).toHaveClass(/Mui-selected/, { timeout: 15000 });
      await page.locator('[data-testid="settings-region"] [data-testid="small-button-edit"]').dispatchEvent("click");
      await page.locator('[data-testid="region-select"]').click();
      await page.locator(`[data-testid="region-option-${region}"]`).click();
      await page.locator("button").getByText("Save").click();
      await expect(page.locator('[data-testid="region-select"]')).toHaveCount(0, { timeout: 10000 });
    };

    const batchDates = () => page.locator("table tbody tr td:nth-child(2) p");

    test("a UK region shows batch dates day-first, and switching back to US restores month-first", async () => {
      try {
        await chooseRegion("en-GB");
        await expect(page.locator('[data-testid="settings-section-region"]')).toContainText("United Kingdom");
        await expect(page.locator('[data-testid="settings-region"]')).toContainText("28/09/2026");

        await page.goto("/donations/batches");
        await expect(batchDates().first()).toHaveText(DAY_FIRST, { timeout: 15000 });

        // Survives a full reload (setting is read back at startup).
        await page.reload();
        await expect(batchDates().first()).toHaveText(DAY_FIRST, { timeout: 15000 });
      } finally {
        await chooseRegion("en-US");
      }
      await page.goto("/donations/batches");
      await expect(batchDates().first()).toHaveText(MONTH_FIRST, { timeout: 15000 });
    });

    const choosePhoneFormat = async (format: "international" | "local") => {
      await page.goto("/settings#region");
      await expect(page.locator('[data-testid="settings-section-region"]')).toHaveClass(/Mui-selected/, { timeout: 15000 });
      await page.locator('[data-testid="small-button-edit"]').first().dispatchEvent("click");
      await page.locator('[data-testid="phone-format-select"]').click();
      await page.locator(`[data-testid="phone-format-option-${format}"]`).click();
      await page.locator("button").getByText("Save").click();
      await expect(page.locator('[data-testid="phone-format-select"]')).toHaveCount(0, { timeout: 10000 });
    };

    test("local phone format saves a person's number as typed, without a country code", async () => {
      try {
        await choosePhoneFormat("local");
        await expect(page.locator('[data-testid="settings-section-region"]')).toContainText("Local phone numbers");
        await expect(page.locator('[data-testid="settings-region"]')).toContainText("Local phone numbers");

        await page.goto("/people");
        await openPersonRow(page, SEED_PEOPLE.DONALD);
        const editBtn = personDetailsEditButton(page);
        await editBtn.first().click();
        const mobile = page.locator("#mobilePhone");
        await expect(mobile).toBeVisible({ timeout: 10000 });
        // Plain field: no country flag button, and the typed number is not prefixed with "+".
        await expect(page.locator(".MuiTelInput-IconButton")).toHaveCount(0);
        await mobile.fill("0701234567");
        await expect(mobile).toHaveValue("0701234567");
        await page.locator("button").getByText("Save").click();
        await expect(editBtn.first()).toBeVisible({ timeout: 10000 });
        await expect(page.locator("body")).toContainText("0701234567");

        await editBtn.first().click();
        await expect(page.locator("#mobilePhone")).toHaveValue("0701234567", { timeout: 10000 });
        await page.locator("button").getByText("Cancel").click();
      } finally {
        await choosePhoneFormat("international");
      }
      await expect(page.locator('[data-testid="settings-section-region"]')).not.toContainText("Local phone numbers");
    });

    test("local phone format keeps a name typed while the phone setting is still loading", async () => {
      let release: () => void = () => {};
      const held = new Promise<void>((resolve) => { release = resolve; });
      const route = "**/membership/settings/public/**";
      try {
        await choosePhoneFormat("local");
        await page.goto("/people");
        await openPersonRow(page, SEED_PEOPLE.DONALD);
        const editBtn = personDetailsEditButton(page);
        await expect(editBtn.first()).toBeVisible({ timeout: 10000 });

        await page.route(route, async (r) => { await held; await r.continue(); });
        await editBtn.first().click();
        const first = page.locator("#first");
        await expect(first).toBeVisible({ timeout: 10000 });
        await first.fill("Zacchaeus");
        release();

        const mobile = page.locator("#mobilePhone");
        await expect(mobile).toBeVisible({ timeout: 10000 });
        await expect(page.locator(".MuiTelInput-IconButton")).toHaveCount(0);
        await expect(first).toHaveValue("Zacchaeus");
        await expect(mobile).not.toHaveValue(/^\+/);
        await page.locator("button").getByText("Cancel").click();
      } finally {
        release();
        await page.unroute(route);
        await choosePhoneFormat("international");
      }
    });
  });

});

// ChurchAppsSupport#1180: typing a domain and clicking Save (without +) closed the panel and saved nothing.
test.describe("Settings domains save a typed name", () => {
  const DOMAIN = "example-1180.org";
  // Each domain write is slow against the local Api (~10s).
  const SAVE_MS = 40000;

  test("Save keeps a typed domain even when + was not clicked", async ({ page }) => {
    test.setTimeout(150000);
    await page.locator('[data-testid="settings-section-domains"]').click();
    const section = page.locator('[data-testid="settings-domains"]');
    await expect(section).toBeVisible({ timeout: 15000 });

    const input = section.locator('input[name="domainName"]');
    const openEdit = () => section.locator('[data-testid="small-button-edit"]').dispatchEvent("click");
    await openEdit();
    await expect(input).toBeVisible({ timeout: 10000 });
    // A run that died before its cleanup leaves the domain behind, which makes the add fail as a duplicate.
    const leftover = section.locator("tr", { hasText: DOMAIN });
    if (await leftover.count()) {
      await leftover.getByRole("button").click();
      await section.locator("button").getByText("Save").click();
      await expect(input).toHaveCount(0, { timeout: SAVE_MS });
      await openEdit();
      await expect(input).toBeVisible({ timeout: 10000 });
    }
    await input.fill(DOMAIN);
    await section.locator("button").getByText("Save").click();
    await expect(input).toHaveCount(0, { timeout: SAVE_MS });
    await expect(section.getByText(DOMAIN)).toBeVisible({ timeout: SAVE_MS });

    // Clean up so later runs start without the domain.
    await openEdit();
    const row = section.locator("tr", { hasText: DOMAIN });
    await row.getByRole("button").click();
    await section.locator("button").getByText("Save").click();
    await expect(input).toHaveCount(0, { timeout: SAVE_MS });
    await expect(section.getByText(DOMAIN)).toHaveCount(0, { timeout: SAVE_MS });
  });
});

// ChurchAppsSupport#1181: merge-field chips on the email template editor must insert at the cursor, and editing mid-text must not eat the rest.
const openNewTemplate = async (page: Page) => {
  await page.goto("/settings/email-templates");
  await page.getByRole("button", { name: "New Template" }).first().click();
  await expect(page.getByText("Insert merge field into subject:")).toBeVisible();
};

const chipsAfter = (page: Page, caption: string) => page.locator("div", { has: page.getByText(caption, { exact: true }) }).last();

test.describe("Email template editor merge fields", () => {
  test("subject chip inserts at the cursor", async ({ page }) => {
    await openNewTemplate(page);
    const subject = page.getByLabel("Subject", { exact: true });
    await subject.fill("Hello  welcome");
    await subject.evaluate((el: HTMLInputElement) => { el.focus(); el.setSelectionRange(6, 6); });
    await chipsAfter(page, "Insert merge field into subject:").getByText("First Name", { exact: true }).click();
    await expect(subject).toHaveValue("Hello {{firstName}} welcome");
  });

  test("body chip inserts at the cursor", async ({ page }) => {
    await openNewTemplate(page);
    const body = page.locator(".editor-input[contenteditable='true']").first();
    await body.click();
    await page.keyboard.type("Hello  welcome");
    for (let i = 0; i < 8; i++) await page.keyboard.press("ArrowLeft");
    await chipsAfter(page, "Insert merge field into body:").getByText("First Name", { exact: true }).click();
    await expect(body).toHaveText("Hello {{firstName}} welcome");
    await page.getByRole("button", { name: "Preview" }).click();
    await expect(page.frameLocator("iframe[title='Email preview']").locator("body")).toContainText("Hello John welcome");
  });

  test("backspace in the middle of the body only removes one character", async ({ page }) => {
    await openNewTemplate(page);
    const body = page.locator(".editor-input[contenteditable='true']").first();
    await body.click();
    await page.keyboard.type("Hello world");
    for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("Backspace");
    await expect(body).toHaveText("Helloworld");
  });
});

// ChurchAppsSupport#1241: a church setting limits the app's volunteer signup list to the next week of each plan type.
test.describe.serial("Volunteer signup next week only", () => {
  test.describe.configure({ retries: 0 });
  const API = process.env.API_BASE || "http://localhost:8084";
  const PLAN_TYPE_NAME = "Next Week Only Spec " + Date.now().toString().slice(-6);
  let ctx: APIRequestContext;
  let auth: { headers: { Authorization: string } };
  let planTypeId: string;
  const planIds: string[] = [];

  const signupPlanIds = async () => {
    const res = await ctx.get(`${API}/doing/plans/public/signup/CHU00000001`);
    return ((await res.json()) as any[]).map((r) => r.plan.id).filter((id: string) => planIds.includes(id));
  };
  const deleteSetting = async () => {
    const settings = await (await ctx.get(`${API}/membership/settings`, auth)).json();
    const found = (settings || []).find((s: any) => s.keyName === "volunteerSignupNextOnly");
    if (found?.id) await ctx.delete(`${API}/membership/settings/${found.id}`, auth);
  };

  test.beforeAll(async () => {
    ctx = await pwRequest.newContext();
    const loginRes = await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
    expect(loginRes.ok()).toBeTruthy();
    const body = await loginRes.json();
    const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
    auth = { headers: { Authorization: "Bearer " + uc.jwt } };
    await deleteSetting();
    const typeRes = await ctx.post(`${API}/doing/planTypes`, { ...auth, data: [{ ministryId: "GRP0000000a", name: PLAN_TYPE_NAME }] });
    planTypeId = (await typeRes.json())[0].id;
    const planRes = await ctx.post(`${API}/doing/plans`, {
      ...auth,
      data: [
        { name: "Signup Week One", serviceDate: "2033-04-03", ministryId: "GRP0000000a", planTypeId },
        { name: "Signup Week Two", serviceDate: "2033-04-10", ministryId: "GRP0000000a", planTypeId }
      ]
    });
    planIds.push(...(await planRes.json()).map((p: any) => p.id));
    await ctx.post(`${API}/doing/positions`, { ...auth, data: planIds.map((planId) => ({ planId, categoryName: "Band", name: "Greeter", count: 2, allowSelfSignup: true })) });
  });

  test.afterAll(async () => {
    await deleteSetting();
    for (const id of planIds) await ctx.delete(`${API}/doing/plans/${id}`, auth);
    if (planTypeId) await ctx.delete(`${API}/doing/planTypes/${planTypeId}`, auth);
    await ctx.dispose();
  });

  test("turning the setting on limits the public signup list to the next week of each plan type", async ({ page }) => {
    expect(await signupPlanIds()).toEqual(planIds);

    await page.goto("/settings#volunteer-signup");
    const section = page.getByTestId("settings-volunteer-signup");
    await expect(section).toBeVisible({ timeout: 15000 });
    await expect(section).toContainText("All upcoming weeks");
    await section.getByTestId("small-button-edit").dispatchEvent("click");
    await page.getByTestId("volunteer-signup-next-only-switch").locator("input").check();
    const save = page.waitForResponse((r) => r.url().includes("/settings") && r.request().method() === "POST" && r.status() === 200);
    await page.getByRole("button", { name: "Save" }).click();
    await save;
    await expect(section).toContainText("Only the next week of each plan type", { timeout: 10000 });

    expect(await signupPlanIds()).toEqual([planIds[0]]);
  });

  test("turning the setting off shows every week again", async ({ page }) => {
    await page.goto("/settings#volunteer-signup");
    const section = page.getByTestId("settings-volunteer-signup");
    await expect(section).toContainText("Only the next week of each plan type", { timeout: 15000 });
    await section.getByTestId("small-button-edit").dispatchEvent("click");
    await page.getByTestId("volunteer-signup-next-only-switch").locator("input").uncheck();
    const del = page.waitForResponse((r) => r.url().includes("/settings/") && r.request().method() === "DELETE");
    await page.getByRole("button", { name: "Save" }).click();
    await del;
    await expect(section).toContainText("All upcoming weeks", { timeout: 10000 });

    expect(await signupPlanIds()).toEqual(planIds);
  });
});

// ChurchAppsSupport#1247: a church setting keeps each person's giving off their record until someone clicks Show giving.
test.describe.serial("Giving privacy on person records", () => {
  test.describe.configure({ retries: 0 });
  const API = process.env.API_BASE || "http://localhost:8084";
  let ctx: APIRequestContext;
  let auth: { headers: { Authorization: string } };

  const deleteSetting = async () => {
    const settings = await (await ctx.get(`${API}/membership/settings`, auth)).json();
    const found = (settings || []).find((s: any) => s.keyName === "hideGivingOnPerson");
    if (found?.id) await ctx.delete(`${API}/membership/settings/${found.id}`, auth);
  };
  const openDemoUser = async (page: Page) => {
    await page.goto("/people");
    await openPersonRow(page, SEED_PEOPLE.DEMO);
    const section = page.getByTestId("person-giving-section");
    await expect(section).toBeVisible({ timeout: 15000 });
    return section;
  };

  test.beforeAll(async () => {
    ctx = await pwRequest.newContext();
    const loginRes = await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
    expect(loginRes.ok()).toBeTruthy();
    const body = await loginRes.json();
    const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
    auth = { headers: { Authorization: "Bearer " + uc.jwt } };
    await deleteSetting();
  });

  test.afterAll(async () => {
    await deleteSetting();
    await ctx.dispose();
  });

  test("giving shows on the person record by default", async ({ page }) => {
    const section = await openDemoUser(page);
    await expect(section.getByTestId("person-giving-all")).toBeVisible({ timeout: 10000 });
    await expect(section.getByTestId("person-giving-show")).toHaveCount(0);
  });

  test("turning the setting on hides giving until Show giving is clicked", async ({ page }) => {
    await page.goto("/settings#giving-privacy");
    const settings = page.getByTestId("settings-giving-privacy");
    await expect(settings).toBeVisible({ timeout: 15000 });
    await expect(settings).toContainText("Shown");
    await settings.getByTestId("small-button-edit").dispatchEvent("click");
    await page.getByTestId("giving-privacy-hide-switch").locator("input").check();
    const save = page.waitForResponse((r) => r.url().includes("/settings") && r.request().method() === "POST" && r.status() === 200);
    await page.getByRole("button", { name: "Save" }).click();
    await save;
    await expect(settings).toContainText("Hidden until clicked", { timeout: 10000 });

    const donationRequests: string[] = [];
    page.on("request", (r) => { if (r.url().includes("/donations?personId=")) donationRequests.push(r.url()); });
    const section = await openDemoUser(page);
    await expect(section).toContainText("Giving is hidden on person records.");
    await expect(section.getByTestId("person-giving-all")).toHaveCount(0);
    await expect(section).not.toContainText(/\$\s?\d/);
    expect(donationRequests).toEqual([]);

    await section.getByTestId("person-giving-show").click();
    await expect(section.getByTestId("person-giving-all")).toBeVisible({ timeout: 10000 });
    await expect(section).toContainText(/\$\s?\d|No (household )?gifts recorded/);
    await expect(section.getByTestId("person-giving-show")).toHaveCount(0);
  });

  test("turning the setting off shows giving right away again", async ({ page }) => {
    await page.goto("/settings#giving-privacy");
    const settings = page.getByTestId("settings-giving-privacy");
    await expect(settings).toContainText("Hidden until clicked", { timeout: 15000 });
    await settings.getByTestId("small-button-edit").dispatchEvent("click");
    await page.getByTestId("giving-privacy-hide-switch").locator("input").uncheck();
    const del = page.waitForResponse((r) => r.url().includes("/settings/") && r.request().method() === "DELETE");
    await page.getByRole("button", { name: "Save" }).click();
    await del;
    await expect(settings).toContainText("Shown", { timeout: 10000 });

    const section = await openDemoUser(page);
    await expect(section.getByTestId("person-giving-all")).toBeVisible({ timeout: 10000 });
  });
});

// PR 664: Hungary (hu-HU) is selectable as a region and formats the sample date the Hungarian way.
test.describe("Region list includes Hungary", () => {
  test.describe.configure({ retries: 0 });

  const SAMPLE_DATE: [number, number, number] = [2026, 8, 28];
  // Same Intl calls as regionName / regionSample in RegionSettingsEdit, evaluated in the browser.
  const regionInfo = (page: Page, region: string) => page.evaluate(({ region, d }) => {
    const date = new Date(d[0], d[1], d[2]);
    const name = new Intl.DisplayNames([navigator.language || "en", "en"], { type: "language", languageDisplay: "standard" }).of(region) || region;
    const sample = new Intl.DateTimeFormat(region, { dateStyle: "medium" }).format(date) + " · " + new Intl.DateTimeFormat(region, { year: "numeric", month: "numeric", day: "numeric" }).format(date);
    return { name, sample };
  }, { region, d: SAMPLE_DATE });

  const chooseRegion = async (page: Page, region: string) => {
    await page.goto("/settings#region");
    await expect(page.locator('[data-testid="settings-section-region"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[data-testid="settings-section-region"]').click();
    const section = page.locator('[data-testid="settings-region"]');
    await section.locator('[data-testid="small-button-edit"]').dispatchEvent("click");
    await section.locator('[data-testid="region-select"]').click();
    const option = page.locator(`[data-testid="region-option-${region}"]`);
    await expect(option).toBeVisible({ timeout: 10000 });
    await option.click();
    await section.locator("button").getByText("Save").click();
    await expect(page.locator('[data-testid="region-select"]')).toHaveCount(0, { timeout: 10000 });
  };

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage();
    try {
      await login(page);
      await chooseRegion(page, "en-US");
    } finally {
      await page.close();
    }
  });

  test("choosing Hungary shows its name and a Hungarian sample date, and switching back restores en-US", async ({ page }) => {
    const hu = await regionInfo(page, "hu-HU");
    const us = await regionInfo(page, "en-US");
    expect(hu.sample).not.toBe(us.sample);
    const section = page.locator('[data-testid="settings-region"]');
    try {
      await chooseRegion(page, "hu-HU");
      await expect(section).toContainText(hu.name, { timeout: 10000 });
      await expect(section).toContainText(hu.sample);
      await expect(section).not.toContainText(us.sample);
    } finally {
      await chooseRegion(page, "en-US");
    }
    await expect(section).toContainText(us.sample, { timeout: 10000 });
    await expect(section).not.toContainText(hu.sample);
  });
});
