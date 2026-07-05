import { request, type Page } from "@playwright/test";
import { peopleTest as test, expect } from "./helpers/test-fixtures";
import { navigateToPeople } from "./helpers/navigation";
import { personDetailsEditButton, SEED_PEOPLE, openPersonRow, confirmDelete } from "./helpers/fixtures";
import { login } from "./helpers/auth";
import { STORAGE_STATE_PATH } from "./global-setup";

// ZACCHAEUS/ZEBEDEE are test marker names.

test.describe("People Management", () => {

  test.describe("Individuals", () => {
    test("should view person details", async ({ page }) => {
      await openPersonRow(page, SEED_PEOPLE.DONALD);
      await expect(page).toHaveURL(/\/people\/PER\d+/);
    });

    test("should search for people", async ({ page }) => {
      const searchInput = page.locator('input[name="searchText"]');
      await searchInput.fill("Smith");
      // PeopleSearch debounces the simple search 500ms after typing stops.
      await page.waitForResponse(
        (response) => response.url().includes("/people/advancedSearch") && response.status() === 200,
        { timeout: 10000 }
      );
      const smithRow = page.locator("table tbody tr").filter({ hasText: "Smith" }).first();
      await expect(smithRow).toBeVisible({ timeout: 10000 });
    });

    test("should advance search for people", async ({ page }) => {
      // Match specific "▶ Advanced" / "▼ Advanced" toggle (avoid SavedLists copy).
      const advBtn = page.locator("p").getByText(/[▶▼] Advanced/);
      await advBtn.click();
      // Names accordion is expanded by default; first filter is First Name.
      const firstCheck = page.locator('div input[type="checkbox"]').first();
      await expect(firstCheck).toBeVisible({ timeout: 10000 });
      await firstCheck.click();
      const condition = page.locator('div[aria-haspopup="listbox"]').first();
      await condition.click();
      const equalsCondition = page.locator('li[data-value="equals"]');
      await equalsCondition.click();
      const firstNameInput = page.locator('input[placeholder="Enter value..."]').first();
      await firstNameInput.fill("Donald");
      // Filter auto-searches 500ms after change.
      await page.waitForResponse(
        (response) => response.url().includes("/people/advancedSearch") && response.status() === 200,
        { timeout: 10000 }
      );
      const donaldRow = page.locator("table tbody tr").filter({ hasText: "Donald Clark" }).first();
      await expect(donaldRow).toBeVisible({ timeout: 10000 });
      await donaldRow.click();
      await page.waitForURL(/\/people\/PER\d+/, { timeout: 10000 });
    });

    test("should delete advance search conditions", async ({ page }) => {
      // Match specific "▶ Advanced" / "▼ Advanced" toggle (avoid SavedLists copy).
      const advBtn = page.locator("p").getByText(/[▶▼] Advanced/);
      await advBtn.click();
      const firstCheck = page.locator('div input[type="checkbox"]').first();
      await expect(firstCheck).toBeVisible({ timeout: 10000 });
      await firstCheck.click();
      const secondCheck = page.locator('div input[type="checkbox"]').nth(1);
      await secondCheck.click();
      const checkTwo = page.locator("span").getByText("2 active:");
      await expect(checkTwo).toHaveCount(1);
      // SVG inside Chip has stopPropagation; force-click to bypass chip actionability.
      const chipDeleteIcons = page.locator(".MuiChip-deleteIcon");
      await chipDeleteIcons.last().click({ force: true });
      const checkOne = page.locator("span").getByText("1 active:");
      await expect(checkOne).toHaveCount(1, { timeout: 10000 });
      await secondCheck.click();
      await expect(checkTwo).toHaveCount(1);
      const clearAll = page.locator("span").getByText("Clear All");
      await clearAll.click();
      await expect(checkTwo).toHaveCount(0);
    });

    // Skipped: AI Search requires AskApi (separate service, not in local stack).
    test.skip("should AI search for people", async ({ page }) => {
      const searchInput = page.locator('[id="display-box"] textarea').first();
      await searchInput.fill("Show me married men");
      const searchBtn = page.locator("button").getByText("Search").last();
      await expect(searchBtn).toBeEnabled();
      await searchBtn.click();

      await page.waitForResponse((response) => response.url().includes("/people") && response.status() === 200, { timeout: 10000 });
      const results = page.locator("table tbody tr");
      await expect(results.first()).toBeVisible({ timeout: 10000 });
      await results.first().click();
      await expect(page.locator("p").getByText("Male")).toBeVisible();
      await expect(page.locator("p").getByText("Married")).toBeVisible();
    });

    test("should AI search for people, keep search text, and support clearing", async ({ page }) => {
      // Mock the AskApi call to /query/people
      await page.route("**/query/people", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([{ field: "gender", operator: "equals", value: "Male" }])
        });
      });

      // Mock the MembershipApi call to /people/advancedSearch
      await page.route("**/people/advancedSearch", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([{ id: "1", name: { display: "Donald Clark", first: "Donald", last: "Clark" }, contactInfo: { email: "donald@example.com" } }])
        });
      });

      const searchInput = page.locator('[id="display-box"] textarea').first();
      await searchInput.fill("show me users that contain 'gol'");

      const searchBtn = page.locator('[id="display-box"] button').getByText("Search").first();
      await expect(searchBtn).toBeEnabled();
      await searchBtn.click();

      // Check if search results are displayed
      const donaldRow = page.locator("table tbody tr").filter({ hasText: "Donald Clark" }).first();
      await expect(donaldRow).toBeVisible({ timeout: 10000 });

      // Verify input value is NOT cleared
      await expect(searchInput).toHaveValue("show me users that contain 'gol'");

      // Clear search should restore original list
      const clearBtn = page.getByTestId("ai-search-clear");
      await expect(clearBtn).toBeVisible();
      await clearBtn.click();

      // Verify input value IS cleared
      await expect(searchInput).toHaveValue("");
    });

    test("should open notes tab", async ({ page }) => {
      await openPersonRow(page, SEED_PEOPLE.DONALD);
      const notesBtn = page.locator("button").getByText("Notes");
      await notesBtn.click();
      // AddNote textarea renders once initial messages load.
      const seekNotes = page.locator('[name="noteText"]');
      await expect(seekNotes).toBeVisible({ timeout: 10000 });
    });

    // Serial: each test owns the most recent note via .last() (avoid race with fullyParallel).
    test.describe.serial("Donald notes lifecycle", () => {
      let page: Page;

      test.beforeAll(async ({ browser }) => {
        const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
        page = await context.newPage();
        await login(page);
        await navigateToPeople(page);
      });

      test.afterAll(async () => {
        await page?.context().close();
      });

      // openPersonRow expects /people list; return if on detail page.
      test.beforeEach(async () => {
        if (!/\/people\/?$/.test(new URL(page.url()).pathname)) {
          await navigateToPeople(page);
        }
      });

      test("should add a note from people notes tab", async () => {
        // Donald Clark has no seeded notes and is reliably in the "25 most recent"
        // landing list, so openPersonRow can find him without a search.
        await openPersonRow(page, SEED_PEOPLE.DONALD);
        const notesBtn = page.locator("button").getByText("Notes");
        await notesBtn.click();
        const seekNotes = page.locator('[name="noteText"]');
        await expect(seekNotes).toBeVisible({ timeout: 10000 });
        await seekNotes.fill("Zacchaeus Test Note");
        const sendBtn = page.locator("button").getByText("send");
        await sendBtn.click();
        const validatedNote = page.locator("p").getByText("Zacchaeus Test Note");
        await expect(validatedNote.first()).toBeVisible({ timeout: 15000 });
      });

      test("should edit a note from people notes tab", async () => {
        await openPersonRow(page, SEED_PEOPLE.DONALD);
        const notesBtn = page.locator("button").getByText("Notes");
        await notesBtn.click();
        // Add a note first so the edit affordance definitely exists for this person.
        const seekNotes = page.locator('[name="noteText"]');
        await expect(seekNotes).toBeVisible({ timeout: 10000 });
        // AddNote useEffect resets message after conversation loads; wait for prior note + tick.
        await expect(page.locator("p").getByText("Zacchaeus Test Note").first()).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(500);
        await seekNotes.fill("Zacchaeus Pre-edit Note");
        await expect(seekNotes).toHaveValue("Zacchaeus Pre-edit Note", { timeout: 5000 });
        await page.locator("button").getByText("send").click();
        await expect(page.locator("p").getByText("Zacchaeus Pre-edit Note").first()).toBeVisible({ timeout: 15000 });

        const editBtn = page.locator('button[aria-label="editNote"]').filter({ has: page.locator("text=edit") });
        // Edit the most recent note via .last().
        await editBtn.last().click();
        // AddNote fetches async; wait for form to show original content before fill.
        await expect(seekNotes).toHaveValue("Zacchaeus Pre-edit Note", { timeout: 10000 });
        await seekNotes.fill("Zebedee Test Note");
        await page.locator("button").getByText("send").click();
        const validatedEdit = page.locator("p").getByText("Zebedee Test Note");
        await expect(validatedEdit.first()).toBeVisible({ timeout: 15000 });
      });

      test("should delete a note from people notes tab", async () => {
        await openPersonRow(page, SEED_PEOPLE.DONALD);
        const notesBtn = page.locator("button").getByText("Notes");
        await notesBtn.click();
        // Seed a note for delete target.
        const seekNotes = page.locator('[name="noteText"]');
        await expect(seekNotes).toBeVisible({ timeout: 10000 });
        await seekNotes.fill("Zacchaeus Delete Target");
        await page.locator("button").getByText("send").click();
        const target = page.locator("p").getByText("Zacchaeus Delete Target");
        await expect(target.first()).toBeVisible({ timeout: 15000 });

        // Edit the most recent note via .last().
        await page.locator('button[aria-label="editNote"]').last().click();
        // Wait for edit mode before clicking delete.
        await expect(seekNotes).toHaveValue("Zacchaeus Delete Target", { timeout: 10000 });
        // Edit mode shows material-icon delete button.
        const deleteBtn = page.locator("button").getByText("delete", { exact: true });
        await deleteBtn.click();
        await expect(target).toHaveCount(0, { timeout: 15000 });
      });
    });

    test("should open groups tab", async ({ page }) => {
      await openPersonRow(page, SEED_PEOPLE.DONALD);
      const groupsBtn = page.locator("button").getByText("Groups");
      await groupsBtn.click();
      // ListItemButton component={Link}; no <li> wrapper.
      const seekText = page.locator("p").getByText("Not currently a member of any groups.");
      const seekGroup = page.locator('ul a[href^="/groups/"]').first();
      await expect(seekText.or(seekGroup)).toBeVisible({ timeout: 10000 });
    });

    test("should open group from people groups tab", async ({ page }) => {
      await openPersonRow(page, SEED_PEOPLE.DONALD);
      const groupsBtn = page.locator("button").getByText("Groups");
      await groupsBtn.click();
      const seekGroup = page.locator('ul a[href^="/groups/"]').first();
      await expect(seekGroup).toBeVisible({ timeout: 10000 });
      await seekGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
    });

    test("should open attendance tab", async ({ page }) => {
      await openPersonRow(page, SEED_PEOPLE.DONALD);
      const attBtn = page.locator("button").getByText("Attendance");
      await expect(attBtn).toBeVisible({ timeout: 10000 });
      await attBtn.click();
      // Renders Table or EmptyState <h6>; match on text, not tag.
      const seekText = page.getByText(/No attendance records/i);
      const seekRow = page.locator("table tbody tr").first();
      await expect(seekText.or(seekRow)).toBeVisible({ timeout: 10000 });
    });

    test("should open group from people attendance", async ({ page }) => {
      // Donald Clark has seeded attendance records (demo.sql).
      await openPersonRow(page, SEED_PEOPLE.DONALD);
      const attBtn = page.locator("button").getByText("Attendance");
      await attBtn.click();
      // Link inside row's Group cell navigates to group.
      const seekGroup = page.locator('table a[href^="/groups/"]').first();
      await expect(seekGroup).toBeVisible({ timeout: 10000 });
      await seekGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
    });

    test("should open donations tab", async ({ page }) => {
      await openPersonRow(page, SEED_PEOPLE.DONALD);
      const donationBtn = page.locator("button").getByText("Donations");
      await expect(donationBtn).toBeVisible({ timeout: 10000 });
      await donationBtn.click();
      // No seeded donations; apphelper "willAppear" copy renders.
      const seekText = page.locator("td").getByText("Donations will appear once a donation has been entered.");
      const donationRow = page.locator("td").getByText(/\$\d/).first();
      await expect(seekText.or(donationRow)).toBeVisible({ timeout: 10000 });
    });

    // Skipped: Stripe fields in iframe inaccessible to Playwright.
    test.skip("should add card from people donations tab", async ({ page }) => {
      await openPersonRow(page, SEED_PEOPLE.DONALD);
      const donationBtn = page.locator("button").getByText("Donations");
      await donationBtn.click();
      const addBtn = page.locator('[id="addBtnGroup"]');
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      const addCardBtn = page.locator('[aria-labelledby="addBtnGroup"] li').first();
      await addCardBtn.click();
      const cardEntry = page.locator('[name="cardnumber"]');
      await cardEntry.fill("4242424242424242");
      await page.locator('[name="exp-date"]').fill("0132");
      await page.locator('[name="cvc"]').fill("123");
      await page.locator('[name="postal"]').fill("11111");
      await page.locator("Button").getByText("Save").click();
    });

    test("should cancel adding card from people donations tab", async ({ page }) => {
      await openPersonRow(page, SEED_PEOPLE.DONALD);
      const donationBtn = page.locator("button").getByText("Donations");
      await expect(donationBtn).toBeVisible({ timeout: 10000 });
      await donationBtn.click();
      const addBtn = page.locator('[id="addBtnGroup"]');
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      const addCardMenuItem = page.locator('[aria-labelledby="addBtnGroup"] li[aria-label="add-card"]');
      await expect(addCardMenuItem).toBeVisible({ timeout: 10000 });
      await addCardMenuItem.click();
      // Both donation-form and input-box show Cancel; scope to input-box (not DOM order).
      await page.locator("#input-box").getByRole("button", { name: "Cancel" }).click();
      await expect(addBtn).toBeVisible({ timeout: 10000 });
    });

    // Skipped: Stripe fields in iframe inaccessible to Playwright.
    test.skip("should add bank account from people donations tab", async ({ page }) => {
      await openPersonRow(page, SEED_PEOPLE.DONALD);
      const donationBtn = page.locator("button").getByText("Donations");
      await donationBtn.click();
      const addBtn = page.locator('[id="addBtnGroup"]');
      await addBtn.click();
      const addBankBtn = page.locator('[aria-labelledby="addBtnGroup"] li').last();
      await addBankBtn.click();
      await page.locator('[name="account-holder-name"]').fill("Zacchaeus");
      await page.locator('[name="routing-number"]').fill("110000000");
      await page.locator('[name="account-number"]').fill("000123456789");
      await page.locator("Button").getByText("Save").click();
    });

    test("should cancel adding bank from people donations tab", async ({ page }) => {
      await openPersonRow(page, SEED_PEOPLE.DONALD);
      const donationBtn = page.locator("button").getByText("Donations");
      await expect(donationBtn).toBeVisible({ timeout: 10000 });
      await donationBtn.click();
      const addBtn = page.locator('[id="addBtnGroup"]');
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      const addBankMenuItem = page.locator('[aria-labelledby="addBtnGroup"] li[aria-label="add-bank"]');
      await expect(addBankMenuItem).toBeVisible({ timeout: 10000 });
      await addBankMenuItem.click();
      // Scope to bank-edit form's Cancel (id="input-box"), not donation-form.
      const cancelBtn = page.locator("#input-box").getByRole("button", { name: "Cancel" });
      await expect(cancelBtn).toBeVisible({ timeout: 10000 });
      await cancelBtn.click();
      await expect(addBtn).toBeVisible({ timeout: 10000 });
    });

    test("should open a person form from the Forms tab", async ({ page }) => {
      // Person-contentType forms now live under a dedicated "Forms" navigation tab.
      await openPersonRow(page, SEED_PEOPLE.DONALD);
      const formsTab = page.locator("button").getByText("Forms", { exact: true });
      await expect(formsTab).toBeVisible({ timeout: 10000 });
      await formsTab.click();
      const formItem = page.getByText("Visitor Information Card", { exact: true }).first();
      await expect(formItem).toBeVisible({ timeout: 10000 });
      await formItem.click();
      // Form selection shows the DisplayBox form pane.
      await expect(page.locator("h2").getByText("Visitor Information Card")).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[name="name.first"]')).toHaveCount(0);
    });
  });

  test.describe("Main Functions", () => {
    test("should add people", async ({ page }) => {
      await page.locator('[name="first"]').fill("Zacchaeus");
      await page.locator('[name="last"]').fill("Tester");
      await page.locator('[name="email"]').fill("zacchaeustester@gmail.com");
      await page.locator('[type="submit"]').click();

      await page.waitForURL(/\/people\/[^/]+/, { timeout: 10000 });
      await expect(page.locator("#page-header-title")).toContainText("Zacchaeus", { timeout: 10000 });
    });

    test("should cancel editing person household", async ({ page }) => {
      await openPersonRow(page, SEED_PEOPLE.DONALD);
      // Icon-only Edit button in DisplayBox.
      const editBtn = page.locator('#householdBox button[aria-label="Edit"]');
      await editBtn.first().click();
      const cancelBtn = page.locator("button").getByText("Cancel");
      await cancelBtn.click();
      await expect(editBtn.first()).toBeVisible({ timeout: 10000 });
    });

    // Remove then add same member; row-count asserts remove runs before re-add.
    test.describe.serial("Donald household membership", () => {
      let page: Page;

      test.beforeAll(async ({ browser }) => {
        const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
        page = await context.newPage();
        await login(page);
        await navigateToPeople(page);
      });

      test.afterAll(async () => {
        await page?.context().close();
      });

      // openPersonRow expects /people list; return if on detail page.
      test.beforeEach(async () => {
        if (!/\/people\/?$/.test(new URL(page.url()).pathname)) {
          await navigateToPeople(page);
        }
      });

      test("should remove person from household", async () => {
        await openPersonRow(page, SEED_PEOPLE.DONALD);
        const editBtn = page.locator('#householdBox button[aria-label="Edit"]').first();
        await editBtn.click();
        const removeBtn = page.locator('[data-testid="remove-household-member-button"]').last();
        await expect(removeBtn).toBeVisible({ timeout: 10000 });
        await removeBtn.click();
        const saveBtn = page.locator("button").getByText("Save");
        await expect(saveBtn).toBeVisible({ timeout: 10000 });
        await saveBtn.click();
        await expect(editBtn).toBeVisible({ timeout: 10000 });
        await editBtn.click();
        const personRows = page.locator('[id="householdMemberTable"] tr');
        await expect(personRows).toHaveCount(2, { timeout: 10000 });
      });

      test("should add person to household", async () => {
        await openPersonRow(page, SEED_PEOPLE.DONALD);
        const editBtn = page.locator('#householdBox button[aria-label="Edit"]').first();
        await editBtn.click();
        const addBtn = page.locator('[data-testid="add-household-member-button"]');
        await expect(addBtn).toBeVisible({ timeout: 10000 });
        await addBtn.click();
        await page.locator('input[name="personAddText"]').fill("Carol");
        await page.locator('[data-testid="search-button"]').click();
        // Icon-only add button in results; data-testid="add-person-<id>".
        const selBtn = page.locator('#householdMemberAddTable [data-testid^="add-person-"]').first();
        await expect(selBtn).toBeVisible({ timeout: 10000 });
        await selBtn.click();
        // Confirmation dialog when adding a person who is already in another household.
        const yesBtn = page.locator("button").getByText("Yes");
        if (await yesBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await yesBtn.click();
        }
        const saveBtn = page.locator("button").getByText("Save");
        await expect(saveBtn).toBeVisible({ timeout: 10000 });
        await saveBtn.click();
        const validatedAddition = page.locator('[id="householdBox"] h5').getByText("Carol Clark");
        await expect(validatedAddition).toHaveCount(1, { timeout: 10000 });
      });
    });

    test("should cancel adding person to household", async ({ page }) => {
      await openPersonRow(page, SEED_PEOPLE.DONALD);
      const editBtn = page.locator('#householdBox button[aria-label="Edit"]').first();
      await editBtn.click();
      const addBtn = page.locator('[data-testid="add-household-member-button"]');
      await addBtn.click();
      // Icon-only Close button closes add-member panel.
      const closeBtn = page.locator('#householdBox button[aria-label="Close"]');
      await expect(closeBtn).toBeVisible({ timeout: 10000 });
      await closeBtn.click();
      await expect(closeBtn).toHaveCount(0, { timeout: 10000 });
    });

    test("should cancel editing person details", async ({ page }) => {
      await openPersonRow(page, SEED_PEOPLE.DONALD);
      const editBtn = personDetailsEditButton(page);
      await editBtn.first().click();
      const cancelBtn = page.locator("button").getByText("Cancel");
      await cancelBtn.click();
      await expect(page.locator('[name="name.middle"]')).toHaveCount(0);
    });

    test("should edit person details", async ({ page }) => {
      await openPersonRow(page, SEED_PEOPLE.DONALD);
      const editBtn = personDetailsEditButton(page);
      await editBtn.first().click();
      const middleName = page.locator('[name="name.middle"]');
      await expect(middleName).toBeVisible({ timeout: 10000 });
      await middleName.fill("Zacchaeus");
      await page.locator("button").getByText("Save").click();
      await expect(editBtn.first()).toBeVisible({ timeout: 10000 });
      await editBtn.first().click();
      await expect(middleName).toBeVisible({ timeout: 10000 });
      await expect(middleName).toHaveValue("Zacchaeus");
    });

    test("should cancel merging person details", async ({ page }) => {
      await openPersonRow(page, SEED_PEOPLE.DONALD);
      const editBtn = personDetailsEditButton(page);
      await editBtn.first().click();
      const mergeBtn = page.locator("button").getByText("merge");
      await mergeBtn.click();
      const cancelBtn = page.locator("button").getByText("Cancel").first();
      await cancelBtn.click();
      await expect(page.locator('[name="personAddText"]')).toHaveCount(0);
    });

    test("should merge person details", async ({ page }) => {
      test.slow();
      await openPersonRow(page, SEED_PEOPLE.PATRICIA);
      const editBtn = personDetailsEditButton(page);
      await editBtn.first().click();
      const mergeBtn = page.locator("button").getByText("merge");
      await mergeBtn.click();
      const mergeSearch = page.locator('[name="personAddText"]');
      // Full name "Robert Moore" disambiguates from other Roberts in seed data.
      await mergeSearch.fill("Robert Moore");
      const searchResponse = page.waitForResponse(
        (response) => response.url().includes("/people/search") && response.status() === 200,
        { timeout: 20000 }
      );
      // Merge box has its own Search button; scope to #mergeBox.
      await page.locator("#mergeBox").getByRole("button", { name: "Search" }).click();
      await searchResponse;
      // Anchor on expected household member result row.
      const robertRow = page.locator("#searchResults tr").filter({ hasText: "Robert Moore" }).first();
      await expect(robertRow).toBeVisible({ timeout: 20000 });
      await robertRow.locator('[data-testid="select-person-button"]').click();
      // Wait for modal to mount before clicking confirm.
      const confirmBtn = page.locator('[data-cy="confirm-merge"]');
      await expect(confirmBtn).toBeVisible({ timeout: 20000 });
      // Wait for DELETE + navigate("/people") after Promise.all resolves.
      const deleteResponse = page.waitForResponse(
        (response) => response.url().match(/\/people\/PER\d+/) !== null
          && response.request().method() === "DELETE"
          && response.status() === 200,
        { timeout: 30000 }
      );
      const navAfterMerge = page.waitForURL(/\/people(\?|$)/, { timeout: 30000 });
      await confirmBtn.click();
      await deleteResponse;
      await navAfterMerge;

      // After merge, one of the two should no longer show in search results.
      await navigateToPeople(page);
      const searchInput = page.locator('input[name="searchText"]');
      // Register listener before fill (fast response may slip past waiter).
      const searched = page.waitForResponse(
        (response) => response.url().includes("/people/advancedSearch") && response.status() === 200,
        { timeout: 20000 }
      );
      await searchInput.fill("Robert Moore");
      await searched;
      const validatedMerge = page.locator("table tbody tr").filter({ hasText: "Robert Moore" });
      await expect(validatedMerge).toHaveCount(0, { timeout: 20000 });
    });

    test("should delete person from details page", async ({ page }) => {
      // Create disposable person for deterministic delete target.
      await page.locator('[name="first"]').fill("Zacchaeus");
      await page.locator('[name="last"]').fill("Disposable");
      await page.locator('[name="email"]').fill("disposable@example.com");
      await page.locator('[type="submit"]').click();
      await page.waitForURL(/\/people\/[^/]+/, { timeout: 10000 });

      const editBtn = personDetailsEditButton(page);
      await editBtn.first().click();
      await page.locator("button").getByText("Delete").click();
      await confirmDelete(page);

      await page.waitForURL(/\/people(\?|$)/, { timeout: 10000 });
      const searchInput = page.locator('input[name="searchText"]');
      await searchInput.fill("Zacchaeus Disposable");
      await page.waitForResponse(
        (response) => response.url().includes("/people/advancedSearch") && response.status() === 200,
        { timeout: 10000 }
      );
      const results = page.locator("table tbody tr").filter({ hasText: "Zacchaeus Disposable" });
      await expect(results).toHaveCount(0);
    });

    test("should allow selecting multiple people for bulk delete", async ({ page }) => {
      test.slow();
      const suffix = Date.now().toString();
      const sharedLastName = `BulkDelete${suffix}`;
      const peopleToCreate = [
        { first: "Zacchaeus", last: sharedLastName, email: `bulk-delete-a-${suffix}@example.com` },
        { first: "Zebedee", last: sharedLastName, email: `bulk-delete-b-${suffix}@example.com` }
      ];

      for (const person of peopleToCreate) {
        await navigateToPeople(page);
        await page.locator('[name="first"]').fill(person.first);
        await page.locator('[name="last"]').fill(person.last);
        await page.locator('[name="email"]').fill(person.email);
        await page.locator('[type="submit"]').click();
        await page.waitForURL(/\/people\/[^/]+/, { timeout: 20000 });
      }

      await navigateToPeople(page);
      const searchInput = page.locator('input[name="searchText"]');
      await searchInput.fill(sharedLastName);
      await page.waitForResponse(
        (response) => response.url().includes("/people/advancedSearch") && response.status() === 200,
        { timeout: 20000 }
      );

      const matchingRows = page.locator("table tbody tr").filter({ hasText: sharedLastName });
      await expect(matchingRows).toHaveCount(2, { timeout: 20000 });

      for (const person of peopleToCreate) {
        const row = page.locator("table tbody tr").filter({ hasText: `${person.first} ${sharedLastName}` }).first();
        await expect(row).toBeVisible({ timeout: 20000 });
        await row.getByRole("checkbox").check();
      }

      const bulkActionsBtn = page.getByTestId("bulk-actions-button");
      await expect(bulkActionsBtn).toBeVisible({ timeout: 20000 });
      await bulkActionsBtn.click();
      await page.getByTestId("bulk-action-delete").click();

      const confirmDialog = page.getByRole("dialog").filter({ hasText: "Delete Selected People" });
      await expect(confirmDialog).toBeVisible({ timeout: 20000 });
      await expect(confirmDialog.getByText("Are you sure you want to delete 2 selected people?")).toBeVisible({ timeout: 20000 });
      await confirmDialog.getByRole("button", { name: "Cancel" }).click();
      await expect(confirmDialog).toHaveCount(0, { timeout: 20000 });
      await expect(bulkActionsBtn).toBeVisible({ timeout: 20000 });
    });

    test("should bulk-update membership status for selected people", async ({ page }) => {
      const suffix = Date.now().toString();
      const sharedLastName = `BulkStatus${suffix}`;
      const peopleToCreate = [
        { first: "Bartholomew", last: sharedLastName, email: `bulk-status-a-${suffix}@example.com` },
        { first: "Barnabas", last: sharedLastName, email: `bulk-status-b-${suffix}@example.com` }
      ];

      for (const person of peopleToCreate) {
        await navigateToPeople(page);
        await page.locator('[name="first"]').fill(person.first);
        await page.locator('[name="last"]').fill(person.last);
        await page.locator('[name="email"]').fill(person.email);
        await page.locator('[type="submit"]').click();
        await page.waitForURL(/\/people\/[^/]+/, { timeout: 10000 });
      }

      await navigateToPeople(page);
      await page.locator('input[name="searchText"]').fill(sharedLastName);
      await page.waitForResponse(
        (response) => response.url().includes("/people/advancedSearch") && response.status() === 200,
        { timeout: 10000 }
      );

      const matchingRows = page.locator("table tbody tr").filter({ hasText: sharedLastName });
      await expect(matchingRows).toHaveCount(2, { timeout: 10000 });

      for (const person of peopleToCreate) {
        const row = page.locator("table tbody tr").filter({ hasText: `${person.first} ${sharedLastName}` }).first();
        await row.getByRole("checkbox").check();
      }

      await page.getByTestId("bulk-actions-button").click();
      await page.getByTestId("bulk-action-membershipStatus").click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 10000 });
      await dialog.getByTestId("bulk-field-select").click();
      await page.getByRole("option", { name: "Member" }).click();

      const updateResponse = page.waitForResponse(
        (response) => response.url().includes("/people/bulk-update") && response.status() === 200,
        { timeout: 10000 }
      );
      await dialog.getByTestId("bulk-field-apply").click();
      await updateResponse;
      await expect(dialog).toHaveCount(0, { timeout: 10000 });
    });

    test("should bulk add and remove selected people from a group", async ({ page }) => {
      test.slow();
      const suffix = Date.now().toString();
      const sharedLastName = `BulkGroup${suffix}`;
      const groupName = `Zz Bulk ${suffix}`;
      const peopleToCreate = [
        { first: "Cleopas", last: sharedLastName, email: `bulk-group-a-${suffix}@example.com` },
        { first: "Cornelius", last: sharedLastName, email: `bulk-group-b-${suffix}@example.com` }
      ];

      for (const person of peopleToCreate) {
        await navigateToPeople(page);
        await page.locator('[name="first"]').fill(person.first);
        await page.locator('[name="last"]').fill(person.last);
        await page.locator('[name="email"]').fill(person.email);
        await page.locator('[type="submit"]').click();
        await page.waitForURL(/\/people\/[^/]+/, { timeout: 20000 });
      }

      const selectMatchingPeople = async () => {
        await navigateToPeople(page);
        await page.locator('input[name="searchText"]').fill(sharedLastName);
        await page.waitForResponse(
          (response) => response.url().includes("/people/advancedSearch") && response.status() === 200,
          { timeout: 20000 }
        );
        const rows = page.locator("table tbody tr").filter({ hasText: sharedLastName });
        await expect(rows).toHaveCount(2, { timeout: 20000 });
        for (const person of peopleToCreate) {
          const row = page.locator("table tbody tr").filter({ hasText: `${person.first} ${sharedLastName}` }).first();
          await row.getByRole("checkbox").check();
        }
      };

      // Add both people to a brand-new group created inline.
      await selectMatchingPeople();
      await page.getByTestId("bulk-actions-button").click();
      await page.getByTestId("bulk-action-add-group").click();

      const addDialog = page.getByRole("dialog");
      await expect(addDialog).toBeVisible({ timeout: 20000 });
      await addDialog.getByTestId("bulk-create-group-toggle").check();
      await addDialog.getByRole("textbox", { name: "New group name" }).fill(groupName);

      const addResponse = page.waitForResponse(
        (response) => response.url().includes("/groupMembers/bulk-add") && response.status() === 200,
        { timeout: 20000 }
      );
      await addDialog.getByTestId("bulk-group-apply").click();
      const addBody = await (await addResponse).json();
      expect(addBody.count).toBe(2);
      await expect(addDialog).toHaveCount(0, { timeout: 20000 });

      // Remove the same people from that group.
      await selectMatchingPeople();
      await page.getByTestId("bulk-actions-button").click();
      await page.getByTestId("bulk-action-remove-group").click();

      const removeDialog = page.getByRole("dialog");
      await expect(removeDialog).toBeVisible({ timeout: 20000 });
      await removeDialog.getByTestId("bulk-group-select").click();
      await page.getByRole("option", { name: groupName }).click();

      const removeResponse = page.waitForResponse(
        (response) => response.url().includes("/groupMembers/bulk-remove") && response.status() === 200,
        { timeout: 20000 }
      );
      await removeDialog.getByTestId("bulk-group-apply").click();
      const removeBody = await (await removeResponse).json();
      expect(removeBody.count).toBe(2);
      await expect(removeDialog).toHaveCount(0, { timeout: 20000 });

      const ctx = await request.newContext();
      const loginRes = await ctx.post("http://localhost:8084/membership/users/login", { data: { email: "demo@b1.church", password: "password" } });
      const loginBody = await loginRes.json();
      const uc = (loginBody.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || loginBody.userChurches?.[0];
      const auth = { headers: { Authorization: "Bearer " + uc?.jwt } };
      const allGroups = await (await ctx.get("http://localhost:8084/membership/groups", auth)).json();
      const leaked = (Array.isArray(allGroups) ? allGroups : []).find((g: any) => g.name === groupName);
      if (leaked?.id) await ctx.delete(`http://localhost:8084/membership/groups/${leaked.id}`, auth);
      await ctx.dispose();
    });
  });

  test.describe("People — edge-case affordances", () => {
    test("person profile exposes a top-level Edit button for contact info", async ({ page }) => {
      await openPersonRow(page, SEED_PEOPLE.DONALD);
      // Personal Details box exposes Edit button for people with edit permission.
      await expect(personDetailsEditButton(page).first()).toBeVisible({ timeout: 10000 });
    });

    test("search with no matches renders an empty results state", async ({ page }) => {
      const searchInput = page.locator('input[name="searchText"]');
      await searchInput.fill("Zzzzz Nonexistent Surname");
      await page.waitForResponse(
        (response) => response.url().includes("/people/advancedSearch") && response.status() === 200,
        { timeout: 10000 }
      );
      // Result table shows zero rows or explicit no-match state.
      await expect(page.locator("table tbody tr").filter({ hasText: "Zzzzz" })).toHaveCount(0);
    });

    test("person attendance tab is accessible and shows visit history container", async ({ page }) => {
      await openPersonRow(page, SEED_PEOPLE.DONALD);
      const attBtn = page.locator("button").getByText("Attendance");
      await attBtn.click();
      // Renders Table or empty-state <h6>.
      const rows = page.locator("table tbody tr").first();
      const empty = page.getByText(/No attendance/i);
      await expect(rows.or(empty)).toBeVisible({ timeout: 10000 });
    });
  });
});
