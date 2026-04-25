import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';
import { navigateToPeople } from './helpers/navigation';
import { editIconButton, closeIconButton, SEED_PEOPLE, openPersonRow } from './helpers/fixtures';

// OCTAVIAN/OCTAVIUS are the names used for testing. If you see Octavian/Octavius entered anywhere, it is a result of these tests.

// People is the largest spec in the project (29 tests). With the default
// `chromium` project's fullyParallel: true and workers: '75%', a 24-core
// machine launches 18 browser contexts that all hit Vite for /people at
// once, overwhelming the dev server (page.goto times out before content
// renders). Force this file to one worker so each test waits its turn
// instead of racing against module compilation.
test.describe.configure({ mode: 'serial' });

test.describe('People Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToPeople(page);
    await expect(page).toHaveURL(/\/people/);
  });

  test.describe('Individuals', () => {
    test('should view person details', async ({ page }) => {
      await openPersonRow(page, SEED_PEOPLE.DONALD);
      await expect(page).toHaveURL(/\/people\/PER\d+/);
    });

    test('should search for people', async ({ page }) => {
      const searchInput = page.locator('input[name="searchText"]');
      await searchInput.fill('Smith');
      // PeopleSearch debounces the simple search 500ms after typing stops.
      await page.waitForResponse(
        (response) => response.url().includes('/people/advancedSearch') && response.status() === 200,
        { timeout: 10000 }
      );
      const smithRow = page.locator('table tbody tr').filter({ hasText: 'Smith' }).first();
      await expect(smithRow).toBeVisible({ timeout: 10000 });
    });

    test('should advance search for people', async ({ page }) => {
      const advBtn = page.locator('p').getByText('Advanced');
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
      await firstNameInput.fill('Donald');
      // Filter auto-searches 500ms after change.
      await page.waitForResponse(
        (response) => response.url().includes('/people/advancedSearch') && response.status() === 200,
        { timeout: 10000 }
      );
      const donaldRow = page.locator('table tbody tr').filter({ hasText: 'Donald Clark' }).first();
      await expect(donaldRow).toBeVisible({ timeout: 10000 });
      await donaldRow.click();
      await page.waitForURL(/\/people\/PER\d+/, { timeout: 10000 });
    });

    test('should delete advance search conditions', async ({ page }) => {
      const advBtn = page.locator('p').getByText('Advanced');
      await advBtn.click();
      const firstCheck = page.locator('div input[type="checkbox"]').first();
      await expect(firstCheck).toBeVisible({ timeout: 10000 });
      await firstCheck.click();
      const secondCheck = page.locator('div input[type="checkbox"]').nth(1);
      await secondCheck.click();
      const checkTwo = page.locator('span').getByText('2 active:');
      await expect(checkTwo).toHaveCount(1);
      // MUI Chip deleteIcon renders as an <svg> inside the Chip root (which
      // Playwright sees as a button-role element). The svg has the click
      // handler with stopPropagation; force-click to bypass the chip-level
      // actionability check.
      const chipDeleteIcons = page.locator('.MuiChip-deleteIcon');
      await chipDeleteIcons.last().click({ force: true });
      const checkOne = page.locator('span').getByText('1 active:');
      await expect(checkOne).toHaveCount(1, { timeout: 10000 });
      await secondCheck.click();
      await expect(checkTwo).toHaveCount(1);
      const clearAll = page.locator('span').getByText('Clear All');
      await clearAll.click();
      await expect(checkTwo).toHaveCount(0);
    });

    // Skipped: AI Search depends on AskApi (separate service not launched by this
    // project's webServer config). The UI renders an error banner when AskApi is
    // unreachable, and the feature can only be exercised end-to-end when AskApi
    // is running locally.
    test.skip('should AI search for people', async ({ page }) => {
      const searchInput = page.locator('[id="display-box"] textarea').first();
      await searchInput.fill('Show me married men');
      const searchBtn = page.locator('button').getByText('Search').last();
      await expect(searchBtn).toBeEnabled();
      await searchBtn.click();

      await page.waitForResponse((response) => response.url().includes('/people') && response.status() === 200, { timeout: 10000 });
      const results = page.locator('table tbody tr');
      await expect(results.first()).toBeVisible({ timeout: 10000 });
      await results.first().click();
      await expect(page.locator('p').getByText('Male')).toBeVisible();
      await expect(page.locator('p').getByText('Married')).toBeVisible();
    });

    test('should open notes tab', async ({ page }) => {
      await openPersonRow(page, SEED_PEOPLE.DONALD);
      const notesBtn = page.locator('button').getByText('Notes');
      await notesBtn.click();
      // Notes panel renders the AddNote textarea (name="noteText") once the
      // initial messages load resolves.
      const seekNotes = page.locator('[name="noteText"]');
      await expect(seekNotes).toBeVisible({ timeout: 10000 });
    });

    // Notes tests each seed their own note on Donald and target it via `.last()`.
    // With fullyParallel, concurrent runs would race on the "last note" locator —
    // keep them serial so each test owns the most recent note when it acts.
    test.describe.serial('Donald notes lifecycle', () => {
      test('should add a note from people notes tab', async ({ page }) => {
        // Donald Clark has no seeded notes and is reliably in the "25 most recent"
        // landing list, so openPersonRow can find him without a search.
        await openPersonRow(page, SEED_PEOPLE.DONALD);
        const notesBtn = page.locator('button').getByText('Notes');
        await notesBtn.click();
        const seekNotes = page.locator('[name="noteText"]');
        await expect(seekNotes).toBeVisible({ timeout: 10000 });
        await seekNotes.fill('Octavian Test Note');
        const sendBtn = page.locator('button').getByText('send');
        await sendBtn.click();
        const validatedNote = page.locator('p').getByText('Octavian Test Note');
        await expect(validatedNote.first()).toBeVisible({ timeout: 15000 });
      });

      test('should edit a note from people notes tab', async ({ page }) => {
        await openPersonRow(page, SEED_PEOPLE.DONALD);
        const notesBtn = page.locator('button').getByText('Notes');
        await notesBtn.click();
        // Add a note first so the edit affordance definitely exists for this person.
        const seekNotes = page.locator('[name="noteText"]');
        await expect(seekNotes).toBeVisible({ timeout: 10000 });
        await seekNotes.fill('Octavian Pre-edit Note');
        await page.locator('button').getByText('send').click();
        await expect(page.locator('p').getByText('Octavian Pre-edit Note').first()).toBeVisible({ timeout: 15000 });

        const editBtn = page.locator('button[aria-label="editNote"]').filter({ has: page.locator('text=edit') });
        // Edit the note we just added (last in the list).
        await editBtn.last().click();
        // AddNote fetches the message content asynchronously and then calls
        // setMessage — wait for the form to show the original content before
        // replacing it, otherwise the fill gets overwritten by the response.
        await expect(seekNotes).toHaveValue('Octavian Pre-edit Note', { timeout: 10000 });
        await seekNotes.fill('Octavius Test Note');
        await page.locator('button').getByText('send').click();
        const validatedEdit = page.locator('p').getByText('Octavius Test Note');
        await expect(validatedEdit.first()).toBeVisible({ timeout: 15000 });
      });

      test('should delete a note from people notes tab', async ({ page }) => {
        await openPersonRow(page, SEED_PEOPLE.DONALD);
        const notesBtn = page.locator('button').getByText('Notes');
        await notesBtn.click();
        // Seed a note to guarantee a delete target.
        const seekNotes = page.locator('[name="noteText"]');
        await expect(seekNotes).toBeVisible({ timeout: 10000 });
        await seekNotes.fill('Octavian Delete Target');
        await page.locator('button').getByText('send').click();
        const target = page.locator('p').getByText('Octavian Delete Target');
        await expect(target.first()).toBeVisible({ timeout: 15000 });

        // Click edit on the note we just added (last in the list).
        await page.locator('button[aria-label="editNote"]').last().click();
        // Wait for edit mode to load this note's content before clicking delete.
        await expect(seekNotes).toHaveValue('Octavian Delete Target', { timeout: 10000 });
        // In edit mode, an extra IconButton with material-icon text "delete" appears.
        const deleteBtn = page.locator('button').getByText('delete', { exact: true });
        await deleteBtn.click();
        await expect(target).toHaveCount(0, { timeout: 15000 });
      });
    });

    test('should open groups tab', async ({ page }) => {
      await openPersonRow(page, SEED_PEOPLE.DONALD);
      const groupsBtn = page.locator('button').getByText('Groups');
      await groupsBtn.click();
      const seekText = page.locator('p').getByText('Not currently a member of any groups.');
      const seekGroup = page.locator('li').first();
      await expect(seekText.or(seekGroup)).toBeVisible({ timeout: 10000 });
    });

    test('should open group from people groups tab', async ({ page }) => {
      await openPersonRow(page, SEED_PEOPLE.DONALD);
      const groupsBtn = page.locator('button').getByText('Groups');
      await groupsBtn.click();
      const seekGroup = page.locator('li').first();
      await expect(seekGroup).toBeVisible({ timeout: 10000 });
      await seekGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
    });

    test('should open attendance tab', async ({ page }) => {
      await openPersonRow(page, SEED_PEOPLE.DONALD);
      const attBtn = page.locator('button').getByText('Attendance');
      await expect(attBtn).toBeVisible({ timeout: 10000 });
      await attBtn.click();
      const seekText = page.locator('p').getByText('No attendance records');
      const seekDate = page.locator('li').first();
      await expect(seekText.or(seekDate)).toBeVisible({ timeout: 10000 });
    });

    test('should open group from people attendance', async ({ page }) => {
      // Donald Clark has seeded attendance records (see attendance demo.sql).
      await openPersonRow(page, SEED_PEOPLE.DONALD);
      const attBtn = page.locator('button').getByText('Attendance');
      await attBtn.click();
      const seekGroup = page.locator('li').first();
      await expect(seekGroup).toBeVisible({ timeout: 10000 });
      await seekGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
    });

    test('should open donations tab', async ({ page }) => {
      await openPersonRow(page, SEED_PEOPLE.DONALD);
      const donationBtn = page.locator('button').getByText('Donations');
      await expect(donationBtn).toBeVisible({ timeout: 10000 });
      await donationBtn.click();
      // Donald has no seeded donations; the apphelper "willAppear" copy renders.
      const seekText = page.locator('td').getByText('Donations will appear once a donation has been entered.');
      const donationRow = page.locator('td').getByText(/\$\d/).first();
      await expect(seekText.or(donationRow)).toBeVisible({ timeout: 10000 });
    });

    // Skipped: Stripe payment fields are in a secure iframe that Playwright cannot access
    test.skip('should add card from people donations tab', async ({ page }) => {
      await openPersonRow(page, SEED_PEOPLE.DONALD);
      const donationBtn = page.locator('button').getByText('Donations');
      await donationBtn.click();
      const addBtn = page.locator('[id="addBtnGroup"]');
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      const addCardBtn = page.locator('[aria-labelledby="addBtnGroup"] li').first();
      await addCardBtn.click();
      const cardEntry = page.locator('[name="cardnumber"]');
      await cardEntry.fill('4242424242424242');
      await page.locator('[name="exp-date"]').fill('0132');
      await page.locator('[name="cvc"]').fill('123');
      await page.locator('[name="postal"]').fill('11111');
      await page.locator('Button').getByText('Save').click();
    });

    test('should cancel adding card from people donations tab', async ({ page }) => {
      await openPersonRow(page, SEED_PEOPLE.DONALD);
      const donationBtn = page.locator('button').getByText('Donations');
      await expect(donationBtn).toBeVisible({ timeout: 10000 });
      await donationBtn.click();
      const addBtn = page.locator('[id="addBtnGroup"]');
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      const addCardMenuItem = page.locator('[aria-labelledby="addBtnGroup"] li[aria-label="add-card"]');
      await expect(addCardMenuItem).toBeVisible({ timeout: 10000 });
      await addCardMenuItem.click();
      await page.locator('button').getByText('Cancel').click();
      await expect(addBtn).toBeVisible({ timeout: 10000 });
    });

    // Skipped: Stripe payment fields are in a secure iframe that Playwright cannot access
    test.skip('should add bank account from people donations tab', async ({ page }) => {
      await openPersonRow(page, SEED_PEOPLE.DONALD);
      const donationBtn = page.locator('button').getByText('Donations');
      await donationBtn.click();
      const addBtn = page.locator('[id="addBtnGroup"]');
      await addBtn.click();
      const addBankBtn = page.locator('[aria-labelledby="addBtnGroup"] li').last();
      await addBankBtn.click();
      await page.locator('[name="account-holder-name"]').fill('Octavian');
      await page.locator('[name="routing-number"]').fill('110000000');
      await page.locator('[name="account-number"]').fill('000123456789');
      await page.locator('Button').getByText('Save').click();
    });

    test('should cancel adding bank from people donations tab', async ({ page }) => {
      await openPersonRow(page, SEED_PEOPLE.DONALD);
      const donationBtn = page.locator('button').getByText('Donations');
      await expect(donationBtn).toBeVisible({ timeout: 10000 });
      await donationBtn.click();
      const addBtn = page.locator('[id="addBtnGroup"]');
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      const addBankMenuItem = page.locator('[aria-labelledby="addBtnGroup"] li[aria-label="add-bank"]');
      await expect(addBankMenuItem).toBeVisible({ timeout: 10000 });
      await addBankMenuItem.click();
      const cancelBtn = page.locator('button').getByText('Cancel').first();
      await expect(cancelBtn).toBeVisible({ timeout: 10000 });
      await cancelBtn.click();
      await expect(addBtn).toBeVisible({ timeout: 10000 });
    });

    test('should open forms dropdown and select a form', async ({ page }) => {
      // adding-people.md (steps 11-13) documents selecting a form from the Forms
      // dropdown on the person page. The dropdown only renders when at least one
      // contentType=person form exists; demo seeds "Friend or Family Connection".
      await openPersonRow(page, SEED_PEOPLE.DONALD);
      const formsTab = page.locator('button').getByText('Forms');
      await expect(formsTab).toBeVisible({ timeout: 10000 });
      await formsTab.click();
      const firstForm = page.getByRole('menuitem').first();
      await expect(firstForm).toBeVisible({ timeout: 10000 });
      await firstForm.click();
      // Selecting the form swaps the tab panel into PersonForm; it renders
      // question fields. Just assert we left the Details view.
      await expect(page.locator('[name="name.first"]')).toHaveCount(0);
    });
  });

  test.describe('Main Functions', () => {
    test('should add people', async ({ page }) => {
      await page.locator('[name="first"]').fill('Octavian');
      await page.locator('[name="last"]').fill('Tester');
      await page.locator('[name="email"]').fill('octaviantester@gmail.com');
      await page.locator('[type="submit"]').click();

      await page.waitForURL(/\/people\/[^/]+/, { timeout: 10000 });
      await expect(page.locator('p').getByText('Octavian').first()).toBeVisible({ timeout: 10000 });
    });

    test('should cancel editing person household', async ({ page }) => {
      await openPersonRow(page, SEED_PEOPLE.DONALD);
      const editBtn = page.locator('button').getByText('edit');
      await editBtn.first().click();
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(editBtn.first()).toBeVisible({ timeout: 10000 });
    });

    // Remove then add the same household member — the row-count assertion after
    // removal depends on remove running before add puts Carol back.
    test.describe.serial('Donald household membership', () => {
      test('should remove person from household', async ({ page }) => {
        await openPersonRow(page, SEED_PEOPLE.DONALD);
        const editBtn = page.locator('button').getByText('edit').first();
        await editBtn.click();
        const removeBtn = page.locator('button').getByText('Remove').last();
        await expect(removeBtn).toBeVisible({ timeout: 10000 });
        await removeBtn.click();
        const saveBtn = page.locator('button').getByText('Save');
        await expect(saveBtn).toBeVisible({ timeout: 10000 });
        await saveBtn.click();
        await expect(editBtn).toBeVisible({ timeout: 10000 });
        await editBtn.click();
        const personRows = page.locator('[id="householdMemberTable"] tr');
        await expect(personRows).toHaveCount(2, { timeout: 10000 });
      });

      test('should add person to household', async ({ page }) => {
        await openPersonRow(page, SEED_PEOPLE.DONALD);
        const editBtn = page.locator('button').getByText('edit').first();
        await editBtn.click();
        const addBtn = page.locator('button').getByText('Add');
        await addBtn.click();
        await page.locator('input[name="personAddText"]').fill('Carol');
        await page.locator('button').getByText('Search').click();
        const selBtn = page.locator('button').getByText('Select');
        await expect(selBtn).toBeVisible({ timeout: 10000 });
        await selBtn.click();
        // Confirmation dialog when adding a person who is already in another household.
        const yesBtn = page.locator('button').getByText('Yes');
        if (await yesBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await yesBtn.click();
        }
        const saveBtn = page.locator('button').getByText('Save');
        await expect(saveBtn).toBeVisible({ timeout: 10000 });
        await saveBtn.click();
        const validatedAddition = page.locator('[id="householdBox"] h5').getByText('Carol Clark');
        await expect(validatedAddition).toHaveCount(1, { timeout: 10000 });
      });
    });

    test('should cancel adding person to household', async ({ page }) => {
      await openPersonRow(page, SEED_PEOPLE.DONALD);
      const editBtn = page.locator('button').getByText('edit').first();
      await editBtn.click();
      const addBtn = page.locator('button').getByText('Add');
      await addBtn.click();
      const closeBtn = page.locator('button').getByText('close');
      await closeBtn.click();
      await expect(closeBtn).toHaveCount(0, { timeout: 10000 });
    });

    test('should cancel editing person details', async ({ page }) => {
      await openPersonRow(page, SEED_PEOPLE.DONALD);
      const editBtn = editIconButton(page);
      await editBtn.first().click();
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(page.locator('[name="name.middle"]')).toHaveCount(0);
    });

    test('should edit person details', async ({ page }) => {
      await openPersonRow(page, SEED_PEOPLE.DONALD);
      const editBtn = editIconButton(page);
      await editBtn.first().click();
      const middleName = page.locator('[name="name.middle"]');
      await expect(middleName).toBeVisible({ timeout: 10000 });
      await middleName.fill('Octavian');
      await page.locator('button').getByText('Save').click();
      await expect(editBtn.first()).toBeVisible({ timeout: 10000 });
      await editBtn.first().click();
      await expect(middleName).toBeVisible({ timeout: 10000 });
      await expect(middleName).toHaveValue('Octavian');
    });

    test('should cancel merging person details', async ({ page }) => {
      await openPersonRow(page, SEED_PEOPLE.DONALD);
      const editBtn = editIconButton(page);
      await editBtn.first().click();
      const mergeBtn = page.locator('button').getByText('merge');
      await mergeBtn.click();
      const cancelBtn = page.locator('button').getByText('Cancel').first();
      await cancelBtn.click();
      await expect(page.locator('[name="personAddText"]')).toHaveCount(0);
    });

    test('should merge person details', async ({ page }) => {
      await openPersonRow(page, SEED_PEOPLE.PATRICIA);
      const editBtn = editIconButton(page);
      await editBtn.first().click();
      const mergeBtn = page.locator('button').getByText('merge');
      await mergeBtn.click();
      const mergeSearch = page.locator('[name="personAddText"]');
      // Search by full name — "Robert Moore" disambiguates from Robert Johnson
      // and other Roberts that exist in the seed data.
      await mergeSearch.fill('Robert Moore');
      const searchResponse = page.waitForResponse(
        (response) => response.url().includes('/people/search') && response.status() === 200,
        { timeout: 10000 }
      );
      // Merge box renders its own Search button inside InputBox; scope to the merge box.
      await page.locator('#mergeBox').getByRole('button', { name: 'Search' }).click();
      await searchResponse;
      // The Search component renders one select-person-button per result row.
      // Anchor on the household member we expect to merge.
      const robertRow = page.locator('#searchResults tr').filter({ hasText: 'Robert Moore' }).first();
      await expect(robertRow).toBeVisible({ timeout: 10000 });
      await robertRow.locator('[data-testid="select-person-button"]').click();
      // MergeModal renders inside data-cy="merge-modal"; the Confirm button has
      // data-cy="confirm-merge". Wait for the modal to mount before clicking.
      const confirmBtn = page.locator('[data-cy="confirm-merge"]');
      await expect(confirmBtn).toBeVisible({ timeout: 10000 });
      // Listen for the /people DELETE that removes the merged-out person, plus
      // the internal navigate("/people") fired by Merge.tsx after Promise.all
      // resolves. Both must complete before we re-search.
      const deleteResponse = page.waitForResponse(
        (response) => response.url().match(/\/people\/PER\d+/) !== null
          && response.request().method() === 'DELETE'
          && response.status() === 200,
        { timeout: 15000 }
      );
      const navAfterMerge = page.waitForURL(/\/people(\?|$)/, { timeout: 15000 });
      await confirmBtn.click();
      await deleteResponse;
      await navAfterMerge;

      // After merge, one of the two should no longer show in search results.
      await navigateToPeople(page);
      const searchInput = page.locator('input[name="searchText"]');
      await searchInput.fill('Robert Moore');
      await page.waitForResponse(
        (response) => response.url().includes('/people/advancedSearch') && response.status() === 200,
        { timeout: 10000 }
      );
      const validatedMerge = page.locator('table tbody tr').filter({ hasText: 'Robert Moore' });
      await expect(validatedMerge).toHaveCount(0, { timeout: 10000 });
    });

    test('should delete person from details page', async ({ page }) => {
      page.once('dialog', async (dialog) => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain('Are you sure');
        await dialog.accept();
      });

      // Create a disposable person first so the delete target is deterministic.
      await page.locator('[name="first"]').fill('Octavian');
      await page.locator('[name="last"]').fill('Disposable');
      await page.locator('[name="email"]').fill('disposable@example.com');
      await page.locator('[type="submit"]').click();
      await page.waitForURL(/\/people\/[^/]+/, { timeout: 10000 });

      const editBtn = editIconButton(page);
      await editBtn.first().click();
      await page.locator('button').getByText('Delete').click();

      await page.waitForURL(/\/people(\?|$)/, { timeout: 10000 });
      const searchInput = page.locator('input[name="searchText"]');
      await searchInput.fill('Octavian Disposable');
      await page.waitForResponse(
        (response) => response.url().includes('/people/advancedSearch') && response.status() === 200,
        { timeout: 10000 }
      );
      const results = page.locator('table tbody tr').filter({ hasText: 'Octavian Disposable' });
      await expect(results).toHaveCount(0);
    });
  });
});
