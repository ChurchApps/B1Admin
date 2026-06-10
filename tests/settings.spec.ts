import type { Page } from '@playwright/test';
import { settingsTest as test, expect } from './helpers/test-fixtures';
import { dismissSendInviteIfPresent, editIconButton } from './helpers/fixtures';
import { login } from './helpers/auth';
import { navigateToSettings, navigateToRoles, navigateToForms } from './helpers/navigation';
import { STORAGE_STATE_PATH } from './global-setup';

// ZACCHAEUS/ZEBEDEE are the names used for testing. If you see Zacchaeus or Zebedee entered anywhere, it is a result of these tests.
test.describe.serial('Settings Management', () => {
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

  // Shared modal helpers (used by Church Settings + Roles).
  const closeAnyModal = async () => {
    // ESC-loop until any modal/dialog is gone. ESC on MUI Dialog with an
    // onClose triggers props.onClose(), which closes both SendInvite and
    // any other transient dialog without depending on a button selector.
    for (let i = 0; i < 6; i++) {
      const anyModal = page.locator('.MuiDialog-container');
      if (!(await anyModal.first().isVisible({ timeout: 200 }).catch(() => false))) return;
      await page.keyboard.press('Escape');
      await page.waitForTimeout(150);
    }
  };

  const dismissInviteLoop = async () => {
    // Dismiss any leftover SendInviteDialog from a prior test before
    // attempting to re-navigate (it intercepts pointer events on the nav).
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

  test.describe.serial('Church Settings', () => {
    test.describe.configure({ retries: 0 });

    test.beforeEach(async () => {
      await dismissInviteLoop();
      // The landing is the master–detail config page; Church Information is the
      // default-selected section. Navigate back if a prior sub-tab left us off it.
      if (!/\/settings(\?|$|\/$)/.test(page.url())) {
        await navigateWithModalGuard(() => navigateToSettings(page));
      }
      await expect(page.locator('[data-testid="settings-section-church-info"]')).toBeVisible({ timeout: 15000 });
    });

    test('should edit church', async () => {
      // Church Information is selected by default — open its section Edit form.
      const editBtn = page.locator('[data-testid="small-button-edit"]').first();
      await editBtn.dispatchEvent('click');
      const churchName = page.locator('[name="churchName"]');
      await expect(churchName).toBeVisible({ timeout: 10000 });
      const originalName = await churchName.inputValue();
      await churchName.fill('Gracious Community Church');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      // Wait for the edit panel to close (back to read-only view) before re-opening.
      await expect(churchName).toHaveCount(0, { timeout: 10000 });
      // Revert the name back
      await editBtn.dispatchEvent('click');
      await expect(churchName).toBeVisible({ timeout: 10000 });
      await churchName.fill(originalName || 'Grace Community Church');
      await saveBtn.click();
      await expect(churchName).toHaveCount(0, { timeout: 10000 });
    });

    test('should cancel editing church', async () => {
      const editBtn = page.locator('[data-testid="small-button-edit"]').first();
      await editBtn.dispatchEvent('click');
      const churchName = page.locator('[name="churchName"]');
      await expect(churchName).toBeVisible({ timeout: 10000 });
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(churchName).toHaveCount(0);
    });
  });

  test.describe.serial('Roles', () => {
    // Roles tests share data — a retry would create duplicate "Zacchaeus
    // Test Role" rows and break subsequent assertions. Disable retries here.
    test.describe.configure({ retries: 0 });

    test.beforeEach(async () => {
      await dismissInviteLoop();
      // Roles is its own page in the settings secondary nav.
      if (!/\/settings\/roles/.test(page.url())) {
        await navigateWithModalGuard(() => navigateToRoles(page));
      }
      await expect(page.locator('[data-testid="add-role-button"]')).toBeVisible({ timeout: 15000 });
    });

    test('should create role', async () => {
      const addBtn = page.locator('[data-testid="add-role-button"]');
      await addBtn.click();
      const custom = page.locator('li').getByText('Add Custom Role');
      await custom.click();
      const roleName = page.locator('[name="roleName"]');
      await roleName.fill('Zacchaeus Test Role');
      const saveBtn = page.locator('button').getByText('Save');
      // Wait for the role POST to complete so the table refresh is reflected
      // before the toHaveCount assertion. Without this the retry can create
      // a duplicate row, breaking subsequent serial tests.
      const rolePost = page.waitForResponse(
        r => r.url().includes('/membership/roles') && r.request().method() === 'POST',
        { timeout: 15000 }
      ).catch(() => null);
      await saveBtn.click();
      await rolePost;
      const validatedRole = page.locator('a').getByText('Zacchaeus Test Role');
      await expect(validatedRole).toHaveCount(1, { timeout: 10000 });
    });

    test('should add person to role', async () => {
      const role = page.locator('a').getByText('Zacchaeus Test Role').first();
      await role.click();
      const addBtn = page.locator('[data-testid="add-role-member-button"]');
      await addBtn.click();
      const searchBox = page.locator('[name="personAddText"]');
      await searchBox.fill('Jennifer Williams');
      const searchBtn = page.locator('[data-testid="search-button"]');
      await searchBtn.click();
      // Result rows render an icon-only AppIconButton (aria-label "Add").
      const selectBtn = page.locator('[data-testid^="add-person-"]').first();
      await selectBtn.click();
      // Person has email → auto-saves and opens SendInviteDialog. Dismiss it
      // before asserting on the Members table (which is the target column).
      await dismissSendInviteIfPresent(page);
      const validatedPerson = page.locator('table tbody tr').filter({ hasText: 'Jennifer Williams' }).first();
      await expect(validatedPerson).toBeVisible({ timeout: 15000 });
      // The SendInviteDialog can race with navigation — keep dismissing
      // until it stays gone. The next test's beforeEach handles re-navigation.
      for (let i = 0; i < 3; i++) {
        await dismissSendInviteIfPresent(page, 1500);
        const dialog = page.locator('div[role="dialog"]:has-text("Send Invite Email")');
        if (!(await dialog.isVisible({ timeout: 500 }).catch(() => false))) break;
      }
    });

    test('should edit role', async () => {
      const editBtn = page.locator('[data-testid="edit-role-button"]').last();
      await editBtn.click();
      const roleName = page.locator('[name="roleName"]');
      await expect(roleName).toHaveValue('Zacchaeus Test Role', { timeout: 10000 });
      await roleName.fill('Zebedee Test Role');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedRole = page.locator('a').getByText('Zebedee Test Role');
      await expect(validatedRole).toHaveCount(1);
    });

    test('should cancel editing role', async () => {
      const editBtn = page.locator('[data-testid="edit-role-button"]').last();
      await editBtn.click();
      const roleName = page.locator('[name="roleName"]');
      await expect(roleName).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(roleName).toHaveCount(0);
    });

    test('should delete role', async () => {
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain('Are you sure');
        await dialog.accept();
      });

      const editBtn = page.locator('[data-testid="edit-role-button"]').last();
      await editBtn.click();
      const deleteBtn = page.locator('button').getByText('Delete');
      await deleteBtn.click();
      const validatedDeletion = page.locator('a').getByText('Zebedee Test Role');
      await expect(validatedDeletion).toHaveCount(0);
    });
  });

  test.describe.serial('Mobile Settings', () => {
    // Tab create/edit/delete isn't idempotent — a retry would add a duplicate
    // tab and break the count assertions.
    test.describe.configure({ retries: 0 });

    test.beforeEach(async () => {
      // "Mobile" is a primary nav item (not in settings secondary menu),
      // gated by ContentApi content.edit permission. Navigate via the primary nav.
      // NavItem renders <a href="about:blank"> with data-testid="nav-item-mobile".
      const menuBtn = page.locator('[id="primaryNavButton"]').getByText('expand_more');
      await menuBtn.click();
      const mobileLink = page.locator('[data-testid="nav-item-mobile"]');
      await expect(mobileLink).toBeVisible({ timeout: 10000 });
      await mobileLink.click();
      await expect(page).toHaveURL(/\/mobile/);
      await expect(page.locator('button').getByText('Add Tab')).toBeVisible({ timeout: 10000 });
    });

    // "Settings Tab" names are private to this spec — mobile-app.spec owns
    // "Zacchaeus Test Tab" on the same page and the two files run in parallel
    // workers; sharing a name breaks both files' count assertions. Edit clicks
    // are row-scoped for the same reason.
    test('should create mobile app tab', async () => {
      const addBtn = page.locator('button').getByText('Add Tab');
      await addBtn.dispatchEvent('click');
      const tabName = page.locator('[name="text"]');
      await tabName.fill('Zacchaeus Settings Tab')
      const url = page.locator('[name="url"]');
      await url.fill('https://pony.town/');
      const saveBtn = page.locator('button').getByText('Save Tab');
      await saveBtn.click();
      const validatedTab = page.locator('h6').getByText('Zacchaeus Settings Tab');
      await expect(validatedTab).toHaveCount(1);
    });

    test('should edit mobile app tab', async () => {
      const row = page.getByRole('listitem').filter({ hasText: 'Zacchaeus Settings Tab' }).first();
      await row.locator('button[aria-label="Edit"]').click();
      const tabName = page.locator('[name="text"]');
      await expect(tabName).toHaveValue('Zacchaeus Settings Tab', { timeout: 10000 });
      await tabName.fill('Zebedee Settings Tab')
      const saveBtn = page.locator('button').getByText('Save Tab');
      await saveBtn.click();
      const validatedTab = page.locator('h6').getByText('Zebedee Settings Tab');
      await expect(validatedTab).toHaveCount(1);
    });

    test('should cancel edit mobile app tab', async () => {
      const row = page.getByRole('listitem').filter({ hasText: 'Zebedee Settings Tab' }).first();
      await row.locator('button[aria-label="Edit"]').click();
      const tabName = page.locator('[name="text"]');
      await expect(tabName).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(tabName).toHaveCount(0);
    });

    test('should delete mobile app tab', async () => {
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain('Are you sure');
        await dialog.accept();
      });

      const row = page.getByRole('listitem').filter({ hasText: 'Zebedee Settings Tab' }).first();
      await row.locator('button[aria-label="Edit"]').click();
      const deleteBtn = page.locator('button').getByText('Delete');
      await deleteBtn.click();
      const validatedDeletion = page.locator('h6').getByText('Zebedee Settings Tab');
      await expect(validatedDeletion).toHaveCount(0);
    });
  });

  test.describe.serial('Form Settings', () => {
    test.beforeEach(async () => {
      // Forms now live under People → Forms; navigate there before each test.
      await navigateToForms(page);
      await expect(page.locator('[data-testid="add-form-button"]')).toBeVisible({ timeout: 10000 });
    });

    test('should create form', async () => {
      // Pre-cleanup: delete any leftover test forms from previous runs (local dev only).
      // In CI the DB is always fresh so this loop exits immediately.
      for (let i = 0; i < 10; i++) {
        const octavRows = page.locator('tr').filter({
          has: page.locator('a, td').filter({ hasText: /^Octav/ })
        });
        const count = await octavRows.count();
        if (count === 0) break;
        const editBtn = octavRows.first().getByRole('button', { name: /Edit/ });
        if (!await editBtn.isVisible().catch(() => false)) break;
        await editBtn.click();
        // Wait for form data to load before clicking delete
        await expect(page.locator('[name="name"]')).toBeVisible({ timeout: 5000 });
        page.once('dialog', d => d.accept());
        await page.locator('button').getByText('Delete').first().click();
        // Wait for the total count of matching rows to decrease
        await expect(octavRows).toHaveCount(count - 1, { timeout: 5000 }).catch(() => { });
      }

      const addBtn = page.locator('[data-testid="add-form-button"]');
      await addBtn.dispatchEvent('click');
      const formName = page.locator('[name="name"]');
      await formName.fill('Zacchaeus Test Form');
      const association = page.locator('[id="mui-component-select-contentType"]');
      await association.click();
      const selAssociation = page.locator('li').getByText('Stand Alone');
      await selAssociation.click();
      const restriction = page.locator('[id="mui-component-select-restricted"]');
      await restriction.click();
      const selRestriction = page.locator('li').getByText('Restricted');
      await selRestriction.click();
      const thanksMsg = page.locator('[name="thankYouMessage"]');
      await thanksMsg.fill('Thanks from Zacchaeus');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedForm = page.locator('a').getByText('Zacchaeus Test Form').first();
      await expect(validatedForm).toBeVisible({ timeout: 10000 });
    });

    test('should edit form', async () => {
      // Target the form we created, not the first Edit button (which may be a seed form)
      const zacchaeusRow = page.locator('tr').filter({ hasText: 'Zacchaeus Test Form' }).first();
      const editBtn = zacchaeusRow.getByRole('button', { name: 'Edit' });
      await editBtn.click();
      // Wait for API form data to load before editing (prevents contentType reset to default "person")
      const formName = page.locator('[name="name"]');
      await expect(formName).toHaveValue('Zacchaeus Test Form', { timeout: 10000 });
      await formName.fill('Zebedee Test Form');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedForm = page.locator('a').getByText('Zebedee Test Form').first();
      await expect(validatedForm).toBeVisible();
    });

    test('should cancel editing form', async () => {
      // Target the form we created/edited, not the first Edit button
      const octavRow = page.locator('tr').filter({ hasText: 'Zebedee Test Form' }).first();
      const editBtn = octavRow.getByRole('button', { name: 'Edit' });
      await editBtn.click();
      const formName = page.locator('[name="name"]');
      await expect(formName).toHaveValue('Zebedee Test Form', { timeout: 10000 });
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(formName).toHaveCount(0, { timeout: 5000 });
    });

    test('should add form questions', async () => {
      const form = page.locator('a').getByText('Zebedee Test Form').first();
      await form.click();

      // Wait for the async memberPermission query to resolve before proceeding
      const addBtn = page.locator('button').getByText('Add Question');
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      const selectBox = page.locator('[role="combobox"]').first();
      await selectBox.click();
      const multChoice = page.locator('li').getByText('Multiple Choice');
      await multChoice.click();
      const title = page.locator('[id="title"]');
      await title.fill('I support playwright testing. True or False?');
      const desc = page.locator('[id="title"]');
      await desc.fill('I support playwright testing. True or False?');
      const value = page.locator('[name="choiceValue"]');
      await value.fill('True');
      const choice = page.locator('[name="choiceText"]');
      await choice.fill('True');
      const addOpBtn = page.locator('[id="addQuestionChoiceButton"]');
      await addOpBtn.click();
      await value.fill('False');
      await choice.fill('False');
      await addOpBtn.click();
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();

      const validatedAddition = page.locator('td button').getByText('I support playwright testing. True or False?');
      await expect(validatedAddition).toHaveCount(1, { timeout: 10000 });
    });

    test('should edit form questions', async () => {
      const form = page.locator('a').getByText('Zebedee Test Form').first();
      await form.click();

      // Wait for questions to load (depends on async memberPermission query)
      const question = page.locator('td button').getByText('I support playwright testing. True or False?');
      await expect(question).toBeVisible({ timeout: 10000 });
      await question.click();
      const title = page.locator('[id="title"]');
      // Wait for the edit form to finish loading the question data before filling
      await expect(title).toHaveValue('I support playwright testing. True or False?', { timeout: 5000 });
      await title.fill('True or False? I support playwright testing.');
      const saveBtn = page.locator('button').getByText('Save');
      const responsePromise = page.waitForResponse(resp => resp.url().includes('/questions') && resp.request().method() === 'POST');
      await saveBtn.click();
      await responsePromise;
      const validatedEdit = page.locator('td button').getByText('True or False? I support playwright testing.').first();
      await expect(validatedEdit).toBeVisible({ timeout: 10000 });
    });

    test('should cancel editing form questions', async () => {
      const form = page.locator('a').getByText('Zebedee Test Form').first();
      await form.click();

      // Wait for questions to load (depends on async memberPermission query)
      const question = page.locator('td button').getByText('True or False? I support playwright testing.').first();
      await expect(question).toBeVisible({ timeout: 10000 });
      await question.click();
      const title = page.locator('[id="title"]');
      await expect(title).toHaveValue('True or False? I support playwright testing.', { timeout: 5000 });
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(title).toHaveCount(0);
    });

    test('should delete form questions', async () => {
      page.once('dialog', dialog => dialog.accept());

      const form = page.locator('a').getByText('Zebedee Test Form').first();
      await form.click();

      const question = page.locator('td button').getByText('True or False? I support playwright testing.').first();
      await expect(question).toBeVisible({ timeout: 10000 });
      await question.click();
      // InputBox renders its delete action as <button id="delete"> — unique while
      // the question edit panel is open, unlike getByText('Delete') which can race
      // with other transient buttons that briefly render the word.
      const deleteBtn = page.locator('button#delete');
      await expect(deleteBtn).toBeVisible({ timeout: 5000 });
      await deleteBtn.click();
      await expect(question).toHaveCount(0, { timeout: 10000 });
    });

    test('should add form members', async () => {
      const form = page.locator('a').getByText('Zebedee Test Form').first();
      await form.click();
      const membersTab = page.locator('[role="tab"]').getByText('Form Members');
      await expect(membersTab).toBeVisible({ timeout: 10000 });
      await membersTab.click();

      const personSearch = page.locator('[name="personAddText"]');
      await personSearch.fill('Dorothy Jackson');
      const searchBtn = page.locator('[id="searchButton"]');
      await searchBtn.click();
      // Result rows render an icon-only AppIconButton (aria-label "Add").
      const addBtn = page.locator('[data-testid^="add-person-"]').first();
      await addBtn.click();

      const validatedAddition = page.locator('td a').getByText('Dorothy Jackson');
      await expect(validatedAddition).toHaveCount(1, { timeout: 10000 });
    });

    test('should remove form members', async () => {
      const form = page.locator('a').getByText('Zebedee Test Form').first();
      await form.click();
      const membersTab = page.locator('[role="tab"]').getByText('Form Members');
      await expect(membersTab).toBeVisible({ timeout: 10000 });
      await membersTab.click();

      const removeBtn = page.locator('button').getByText('Remove').last();
      await removeBtn.click();
      const validatedDeletion = page.locator('td a').getByText('Dorothy Jackson');
      await expect(validatedDeletion).toHaveCount(0, { timeout: 10000 });
    });

    test('should delete form', async () => {
      // Delete all Zebedee Test Form entries (handles duplicates from previous runs)
      for (let i = 0; i < 10; i++) {
        const octavRow = page.locator('tr').filter({ hasText: 'Zebedee Test Form' }).first();
        if (await octavRow.count() === 0) break;
        const editBtn = octavRow.getByRole('button', { name: 'Edit' });
        if (!await editBtn.isVisible().catch(() => false)) break;
        await editBtn.click();
        // Wait for form data to load before clicking delete (the form name
        // field shows up once the edit InputBox has fetched the form).
        const formName = page.locator('[name="name"]');
        await expect(formName).toHaveValue('Zebedee Test Form', { timeout: 10000 });
        page.once('dialog', d => d.accept());
        // InputBox renders its delete action as <button id="delete"> — this is
        // unique while the form edit panel is open, unlike getByText('Delete')
        // which can race with other buttons that transiently render the word.
        await page.locator('button#delete').click();
        await expect(octavRow).toHaveCount(0, { timeout: 10000 }).catch(() => { });
      }
      const validatedDeletion = page.locator('a').getByText('Zebedee Test Form');
      await expect(validatedDeletion).toHaveCount(0, { timeout: 10000 });
    });
  });

  // Edge-case extensions: extra surface checks per .notes/B1Admin-test-coverage-gaps.md §3.
  test.describe('Settings landing — extras', () => {
    test.beforeEach(async () => {
      // Form/Mobile Settings tests leave us on a sub-tab (or /mobile) — return
      // to the settings landing so the configuration list is in the DOM.
      await navigateToSettings(page);
      await expect(page.locator('[data-testid="settings-section-church-info"]')).toBeVisible({ timeout: 15000 });
    });

    test('Church Information section edit exposes the name and subdomain fields', async () => {
      // Church Information is the default-selected section on the landing.
      const editBtn = page.locator('[data-testid="small-button-edit"]').first();
      await editBtn.dispatchEvent('click');
      // The edit InputBox renders MUI TextFields labeled "Church Name" and "Subdomain".
      await expect(page.getByLabel('Church Name').first()).toBeVisible({ timeout: 10000 });
      await expect(page.getByLabel('Subdomain').first()).toBeVisible();
      // Restore read-only view for any following tests.
      await page.locator('button').getByText('Cancel').click();
    });

    test('Settings landing shows the configuration list and Roles in the secondary nav', async () => {
      // The configuration master list is the new default landing content.
      await expect(page.locator('[data-testid="settings-section-church-info"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-testid="settings-section-campuses"]')).toBeVisible();
      // Roles moved out of the landing into the settings secondary nav.
      const rolesNav = page.locator('[id="secondaryMenu"]').getByText('Roles', { exact: true });
      await expect(rolesNav).toBeVisible({ timeout: 10000 });
    });
  });

});
