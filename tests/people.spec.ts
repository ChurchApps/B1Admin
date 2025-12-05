import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';
import { navigateToPeople } from './helpers/navigation';

// OCTAVIAN is the name used for testing. If you see Octavian entered anywhere, it is a result of these tests.
test.describe('People Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToPeople(page);
    await expect(page).toHaveURL(/\/people/);
  });

  test.describe('Individuals', () => {
    test('should view person details', async ({ page }) => {
      const firstPerson = page.locator('table tbody tr').first();
      await firstPerson.click();

      await page.waitForURL(/\/people\/PER\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/people\/PER\d+/);
    });

    test('should search for people', async ({ page }) => {
      const searchInput = page.locator('input[name="searchText"]');
      await searchInput.fill('Smith');
      await searchInput.press('Enter');

      await page.waitForResponse(response => response.url().includes('/people') && response.status() === 200, { timeout: 10000 }).catch(() => { });

      await page.waitForSelector('table tbody tr', { state: 'visible' });
      const results = page.locator('table tbody tr');
      await expect(results.first()).toBeVisible();
    });

    test('should advance search for people', async ({ page }) => {
      const advBtn = page.locator('p').getByText('Advanced');
      await advBtn.click();
      const firstCheck = page.locator('div input[type="checkbox"]').first();
      await firstCheck.click();
      const condition = page.locator('div[aria-haspopup="listbox"]');
      await condition.click();
      const equalsCondition = page.locator('li[data-value="equals"]');
      await equalsCondition.click();
      const firstName = page.locator('input[type="text"]').nth(1);
      await firstName.fill('Donald');

      await page.waitForResponse(response => response.url().includes('/people') && response.status() === 200, { timeout: 10000 }).catch(() => { });

      await page.waitForSelector('table tbody tr', { state: 'visible' });
      const results = page.locator('table tbody tr');
      await expect(results.first()).toBeVisible();

      const firstPerson = page.locator('table tbody tr').first();
      await firstPerson.click();

      await page.waitForURL(/\/people\/PER\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/people\/PER\d+/);
      const name = page.locator('p').getByText('Donald Clark');
      await name.click();
    });

    test('should delete advance search conditions', async ({ page }) => {
      const advBtn = page.locator('p').getByText('Advanced');
      await advBtn.click();
      const firstCheck = page.locator('div input[type="checkbox"]').first();
      await firstCheck.click();
      const secondCheck = page.locator('div input[type="checkbox"]').nth(1);
      await secondCheck.click();
      const checkTwo = page.locator('span').getByText('2 active:');
      await expect(checkTwo).toHaveCount(1);
      const deleteLast = page.locator('[d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"]').last();
      await deleteLast.click();
      const checkOne = page.locator('span').getByText('1 active:');
      await expect(checkOne).toHaveCount(1);
      await secondCheck.click();
      await expect(checkTwo).toHaveCount(1);
      const clearAll = page.locator('span').getByText("Clear All");
      await clearAll.click();
      await expect(checkTwo).toHaveCount(0);
    });

    test('should AI search for people', async ({ page }) => {
      //search
      const searchInput = page.locator('[id="display-box"] textarea').first();
      await searchInput.fill('Show me married men');
      const searchBtn = page.locator('button').getByText('Search').last();
      await searchBtn.click();

      await page.waitForResponse(response => response.url().includes('/people') && response.status() === 200, { timeout: 10000 }).catch(() => { });
      await page.waitForTimeout(5000);
      await page.waitForSelector('table tbody tr', { state: 'visible' });
      const results = page.locator('table tbody tr');
      await expect(results.first()).toBeVisible();
      //check result accuracy
      const firstPerson = page.locator('table tbody tr').first();
      await firstPerson.click();
      const checkGender = page.locator('p').getByText('Male');
      await checkGender.click();
      const checkMarriage = page.locator('p').getByText('Married');
      await checkMarriage.click();
    });

    test('should open notes tab', async ({ page }) => {
      const firstPerson = page.locator('table tbody tr').first();
      await firstPerson.click();
      await page.waitForURL(/\/people\/PER\d+/, { timeout: 10000 });

      const notesBtn = page.locator('button').getByText('Notes');
      await notesBtn.click();
      const seekNotes = page.locator('[name="noteText"]');
      await seekNotes.click();
    });

    test('should add a note from people notes tab', async ({ page }) => {
      const firstPerson = page.locator('table tbody tr').first();
      await firstPerson.click();
      await page.waitForURL(/\/people\/PER\d+/, { timeout: 10000 });

      const notesBtn = page.locator('button').getByText('Notes');
      await notesBtn.click();
      const seekNotes = page.locator('textArea').first();
      await seekNotes.fill('Test Note');
      const sendBtn = page.locator('button').getByText('send');
      await sendBtn.click();
      await page.waitForTimeout(500);
      const validatedNote = page.locator('p').getByText('Test Note');
      await expect(validatedNote).toHaveCount(1);
    });

    test('DOES NOT WORK should edit a note from people notes tab', async ({ page }) => {
      //Get dad to fix duplication error v
      const firstPerson = page.locator('table tbody tr').first();
      await firstPerson.click();
      await page.waitForURL(/\/people\/PER\d+/, { timeout: 10000 });
      //DUPLICATES instead of editing during tests- works if I do it though

      const notesBtn = page.locator('button').getByText('Notes');
      await notesBtn.click();
      const editBtn = page.locator('button').getByText('edit');
      await editBtn.click();
      const seekNotes = page.locator('textArea').first();
      await seekNotes.fill('Testing Note');
      const sendBtn = page.locator('button').getByText('send');
      await sendBtn.click();
      await page.waitForTimeout(500);
      const validatedEdit = page.locator('p').getByText('Testing Note');
      await expect(validatedEdit).toHaveCount(1);
    });

    test('should delete a note from people notes tab', async ({ page }) => {
      const firstPerson = page.locator('table tbody tr').first();
      await firstPerson.click();
      await page.waitForURL(/\/people\/PER\d+/, { timeout: 10000 });

      const notesBtn = page.locator('button').getByText('Notes');
      await notesBtn.click();
      const editBtn = page.locator('button').getByText('edit');
      await editBtn.click();
      const deleteBtn = page.locator('button').getByText('delete');
      await deleteBtn.click();
      await page.waitForTimeout(500);
      const validatedDeletion = page.locator('p').getByText('Testing Note');
      await expect(validatedDeletion).toHaveCount(0);
    });

    test('should open groups tab', async ({ page }) => {
      const firstPerson = page.locator('table tbody tr').first();
      await firstPerson.click();
      await page.waitForURL(/\/people\/PER\d+/, { timeout: 10000 });

      const groupsBtn = page.locator('button').getByText('Groups');
      await groupsBtn.click();
      await page.waitForTimeout(5000);
      const seekText = page.locator('p').getByText('Not currently a member of any groups.');
      const seekGroup = page.locator('li').first();
      const seekEither = seekText.or(seekGroup);
      await seekEither.click();
    });

    test('should open group from people groups tab', async ({ page }) => {
      const firstPerson = page.locator('table tbody tr').getByText('Donald').first();
      await firstPerson.click();
      await page.waitForURL(/\/people\/PER\d+/, { timeout: 10000 });

      const groupsBtn = page.locator('button').getByText('Groups');
      await groupsBtn.click();
      await page.waitForTimeout(5000);
      const seekGroup = page.locator('li').first();
      await seekGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);
    });

    test('should open attendance tab', async ({ page }) => {
      const firstPerson = page.locator('table tbody tr').first();
      await firstPerson.click();
      await page.waitForURL(/\/people\/PER\d+/, { timeout: 10000 });
      await page.waitForTimeout(500);
      const attBtn = page.locator('button').getByText('Attendance');
      await attBtn.click();
      await page.waitForTimeout(5000);
      const seekText = page.locator('p').getByText('No attendance records.');
      const seekDate = page.locator('li').first();
      const seekEither = seekText.or(seekDate);
      await seekEither.click();
    });

    test('should open group from people attendance', async ({ page }) => {
      const firstPerson = page.locator('table tbody tr').first();
      await firstPerson.click();
      await page.waitForURL(/\/people\/PER\d+/, { timeout: 10000 });
      await page.waitForTimeout(500);
      const attBtn = page.locator('button').getByText('Attendance');
      await attBtn.click();
      await page.waitForTimeout(5000);
      const seekGroup = page.locator('li div').last();
      await seekGroup.click();
      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);
    });

    test('should open donations tab', async ({ page }) => {
      const firstPerson = page.locator('table tbody tr').first();
      await firstPerson.click();
      await page.waitForURL(/\/people\/PER\d+/, { timeout: 10000 });
      await page.waitForTimeout(500);
      const donationBtn = page.locator('button').getByText('Donations');
      await donationBtn.click();
      await page.waitForTimeout(5000);
      const seekText = page.locator('td').getByText('Donations will appear once a donation has been entered.');
      const seekDate = page.locator('li').first();
      const seekEither = seekText.or(seekDate);
      await seekEither.click();
    });

    /* test('UNFINISHED should print current year from people donations tab', async ({ page }) => {
      const firstPerson = page.locator('table tbody tr').first();
      await firstPerson.click();
      await page.waitForURL(/\/people\/PER\d+/, { timeout: 10000 });
  
      const donationBtn = page.locator('button').getByText('Donations');
      await donationBtn.click();
      await page.waitForTimeout(5000);
  
      const printBtn = page.locator('[id="download-button"]');
      await printBtn.click();
      const currentBtn = page.locator('button').getByText('Current Year (PRINT)');
      await currentBtn.click();
      await page.waitForURL(/\/donations\/print\/PER\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/donations\/print\/PER\d+/);
    }); */

    /* test('UNFINISHED should print last year from people donations tab', async ({ page }) => {
      const firstPerson = page.locator('table tbody tr').first();
      await firstPerson.click();
      await page.waitForURL(/\/people\/PER\d+/, { timeout: 10000 });
  
      const donationBtn = page.locator('button').getByText('Donations');
      await donationBtn.click();
      await page.waitForTimeout(5000);
  
      const printBtn = page.locator('[id="download-button"]');
      await printBtn.click();
      const previousBtn = page.locator('button').getByText('Last Year (PRINT)');
      await previousBtn.click();
      await page.waitForURL(/\/donations\/print\/PER\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/donations\/print\/PER\d+/);
    }); */

    /* test('DOES NOT WORK should add card from people donations tab', async ({ page }) => {
      const firstPerson = page.locator('table tbody tr').first();
      await firstPerson.click();
      await page.waitForURL(/\/people\/PER\d+/, { timeout: 10000 });
      await page.waitForTimeout(2000);
  
      const donationBtn = page.locator('button').getByText('Donations');
      await donationBtn.click();
      await page.waitForTimeout(5000);
  
      const addBtn = page.locator('[id="addBtnGroup"]');
      await addBtn.click();
      const addCardBtn = page.locator('[aria-labelledby="addBtnGroup"] li').first();
      await addCardBtn.click();
      // I'm pretty sure security measures prevent these fields from being found
      const cardEntry = page.locator('[name="cardnumber"]');
      await cardEntry.fill('4242424242424242');
      const dateEntry = page.locator('[name="exp-date"]');
      await dateEntry.fill('0132');
      const cvcEntry = page.locator('[name="cvc"]');
      await cvcEntry.fill('123');
      const zipEntry = page.locator('[name="postal"]');
      await zipEntry.fill('11111');
  
      const saveBtn = page.locator('Button').getByText('Save');
      await saveBtn.click();
    }); */

    test('should cancel adding card from people donations tab', async ({ page }) => {
      const firstPerson = page.locator('table tbody tr').first();
      await firstPerson.click();
      await page.waitForURL(/\/people\/PER\d+/, { timeout: 10000 });
      await page.waitForTimeout(500);

      const donationBtn = page.locator('button').getByText('Donations');
      await donationBtn.click();
      await page.waitForTimeout(5000);

      const addBtn = page.locator('[id="addBtnGroup"]');
      await addBtn.click();
      const addCardBtn = page.locator('[aria-labelledby="addBtnGroup"] li').first();
      await addCardBtn.click();

      const cancelBtn = page.locator('Button').getByText('Cancel');
      await cancelBtn.click();
      await addBtn.click();
    });

    /* test('DOES NOT WORK should add bank account from people donations tab', async ({ page }) => {
      //fix donations test first ^^^^^
      const firstPerson = page.locator('table tbody tr').first();
      await firstPerson.click();
      await page.waitForURL(/\/people\/PER\d+/, { timeout: 10000 });
  
      const donationBtn = page.locator('button').getByText('Donations');
      await donationBtn.click();
      await page.waitForTimeout(5000);
  
      const addBtn = page.locator('[id="addBtnGroup"]');
      await addBtn.click();
      const addBankBtn = page.locator('[aria-labelledby="addBtnGroup"] li').last();
      await addBankBtn.click();
      //similarly concerned about security preventing site from finding these
      await page.waitForTimeout(5000);
      const nameEntry = page.locator('[name="account-holder-name"]');
      await nameEntry.fill('Octavian');
      const routeEntry = page.locator('[name="routing-number"]');
      await routeEntry.fill('110000000');
      const accEntry = page.locator('[name="account-number"]');
      await accEntry.fill('000123456789');
  
      const saveBtn = page.locator('Button').getByText('Save');
      await saveBtn.click();
    }); */

    test('should cancel adding bank from people donations tab', async ({ page }) => {
      const firstPerson = page.locator('table tbody tr').first();
      await firstPerson.click();
      await page.waitForURL(/\/people\/PER\d+/, { timeout: 10000 });
      await page.waitForTimeout(500);

      const donationBtn = page.locator('button').getByText('Donations');
      await donationBtn.click();
      await page.waitForTimeout(5000);

      const addBtn = page.locator('[id="addBtnGroup"]');
      await addBtn.click();
      const addBankBtn = page.locator('[aria-labelledby="addBtnGroup"] li').last();
      await addBankBtn.click();

      const cancelBtn = page.locator('Button').getByText('Cancel');
      await cancelBtn.click();
      await addBtn.click();
    });
  });

  test.describe('Main Functions', () => {

    test('should add people', async ({ page }) => {
      const firstInput = page.locator('[name="first"]');
      await firstInput.fill('Octavian');
      const lastInput = page.locator('[name="last"]');
      await lastInput.fill('Tester');
      const emailInput = page.locator('[name="email"]');
      await emailInput.fill('octaviantester@gmail.com');
      const addBtn = page.locator('[type="submit"]');
      await addBtn.click();

      await page.waitForTimeout(2000);
      const peopleBtn = page.locator('[id="secondaryMenu"]').getByText('People');
      await peopleBtn.click();
      await page.waitForTimeout(2000);
      const searchInput = page.locator('input[name="searchText"]');
      await searchInput.fill('Octavian');

      await page.waitForResponse(response => response.url().includes('/people') && response.status() === 200, { timeout: 10000 }).catch(() => { });

      await page.waitForSelector('table tbody tr', { state: 'visible' });
      const results = page.locator('table tbody tr');
      await expect(results.first()).toBeVisible();
      //validate person
      const firstPerson = page.locator('td').getByText('Octavian');
      await firstPerson.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/people\/[^/]+/);
    });

    test('should cancel editing person household', async ({ page }) => {
      const firstPerson = page.locator('table tbody tr').first();
      await firstPerson.click();

      await page.waitForURL(/\/people\/PER\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/people\/PER\d+/);

      const editBtn = page.locator('button').getByText('edit');
      await editBtn.click();
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await editBtn.click();
    });

    test('should remove person from household', async ({ page }) => {
      const firstPerson = page.locator('table tbody tr').getByText('Donald');
      await firstPerson.click();

      await page.waitForURL(/\/people\/PER\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/people\/PER\d+/);

      const editBtn = page.locator('button').getByText('edit');
      await editBtn.click();
      const removeBtn = page.locator('button').getByText('Remove').last();
      await removeBtn.click();
      await page.waitForTimeout(5000);
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      await editBtn.click();
      const personRows = page.locator('[id="householdMemberTable"] tr');
      const rowCount = await personRows.count();
      await expect(rowCount).toBe(2);
    });

    test('should add person to household', async ({ page }) => {
      const firstPerson = page.locator('table tbody tr').getByText('Donald');
      await firstPerson.click();

      await page.waitForURL(/\/people\/PER\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/people\/PER\d+/);

      const editBtn = page.locator('button').getByText('edit');
      await editBtn.click();
      const addBtn = page.locator('button').getByText('Add');
      await addBtn.click();
      const searchInput = page.locator('input[name="personAddText"]');
      await searchInput.fill('Carol');
      const searchBtn = page.locator('button').getByText('Search');
      await searchBtn.click();
      const selBtn = page.locator('button').getByText('Select');
      await selBtn.click();
      const yesBtn = page.locator('button').getByText('Yes');
      await yesBtn.click();
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validatedAddition = page.locator('[id="householdBox"] h5').getByText('Carol Clark');
      await expect(validatedAddition).toHaveCount(1);
    });

    test('should cancel adding person to household', async ({ page }) => {
      const firstPerson = page.locator('table tbody tr').first();
      await firstPerson.click();

      await page.waitForURL(/\/people\/PER\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/people\/PER\d+/);

      const editBtn = page.locator('button').getByText('edit');
      await editBtn.click();
      const addBtn = page.locator('button').getByText('Add');
      await addBtn.click();
      const closeBtn = page.locator('button').getByText('close');
      await closeBtn.click();
      await page.waitForTimeout(5000);
      await expect(closeBtn).toHaveCount(0);
    });

    test('should cancel editing person details', async ({ page }) => {
      const firstPerson = page.locator('table tbody tr').first();
      await firstPerson.click();

      await page.waitForURL(/\/people\/PER\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/people\/PER\d+/);

      const editBtn = page.locator('button [d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"]');
      await editBtn.click();
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      const inputs = page.locator('input');
      await expect(inputs).toHaveCount(0);
    });

    test('should edit person details', async ({ page }) => {
      const firstPerson = page.locator('table tbody tr').first();
      await firstPerson.click();

      await page.waitForURL(/\/people\/PER\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/people\/PER\d+/);

      const editBtn = page.locator('button [d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"]');
      await editBtn.click();
      const middleName = page.locator('[name="name.middle"]');
      await middleName.fill('Octavian');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      await editBtn.click();
      await expect(middleName).toHaveValue('Octavian');
    });

    test('should cancel merging person details', async ({ page }) => {
      const firstPerson = page.locator('table tbody tr').first();
      await firstPerson.click();

      await page.waitForURL(/\/people\/PER\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/people\/PER\d+/);

      const editBtn = page.locator('button [d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"]');
      await editBtn.click();
      const mergeBtn = page.locator('button').getByText('merge');
      await mergeBtn.click();
      const cancelBtn = page.locator('button').getByText('Cancel').first();
      await cancelBtn.click();
      const mergeSearch = page.locator('[name="personAddText"]');
      await expect(mergeSearch).toHaveCount(0);
    });

    /* test('UNFINISHED should merge person details', async ({ page }) => {
      const firstPerson = page.locator('table tbody tr').first();
      await firstPerson.click();
  
      await page.waitForURL(/\/people\/PER\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/people\/PER\d+/);
  
      const editBtn = page.locator('button [d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"]');
      await editBtn.click();
      const mergeBtn = page.locator('button').getByText('merge');
      await mergeBtn.click();
      const mergeSearch = page.locator('[name="personAddText"]');
      await mergeSearch.fill('Donald');
      const searchBtn = page.locator('button').getByText("Search");
      await searchBtn.click();
      const saveBtn = page.locator('button').getByText('Save').first();
      await saveBtn.click();
    }); */

    test('should delete person from details page', async ({ page }) => {
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain('Are you sure');
        await dialog.accept();
      });

      const firstPerson = page.locator('table tbody tr').first();
      await firstPerson.click();

      await page.waitForURL(/\/people\/PER\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/people\/PER\d+/);

      const editBtn = page.locator('button [d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"]');
      await editBtn.click();
      const deleteBtn = page.locator('button').getByText('Delete');
      await deleteBtn.click();

      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/people/);
      const searchInput = page.locator('input[name="searchText"]');
      await searchInput.fill('Carol');
      await searchInput.press('Enter');

      await page.waitForResponse(response => response.url().includes('/people') && response.status() === 200, { timeout: 10000 }).catch(() => { });

      const results = page.locator('table tbody tr');
      await expect(results).toHaveCount(0);
    });
  });

});