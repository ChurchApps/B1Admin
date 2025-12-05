import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

// OCTAVIAN/OCTAVIUS are the names used for testing. If you see Octavian or Octavius entered anywhere, it is a result of these tests.
test.describe('Donations Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    const menuBtn = page.locator('[id="primaryNavButton"]').getByText('expand_more');
    await menuBtn.click();
    const donationHomeBtn = page.locator('[data-testid="nav-item-donations"]');
    await donationHomeBtn.click();
    await page.waitForTimeout(5000);
    await expect(page).toHaveURL(/\/donations/);
  });

  /* test('should load donations page', async ({ page }) => {
    const donationHeader = page.locator('h4').getByText('Donations');
    await donationHeader.click();
  }); */

  test.describe('Summary', () => {

    test('should run donations summary', async ({ page }) => {
      const startDate = page.locator('[name="startDate"]');
      await startDate.fill('2025-03-01');
      const endDate = page.locator('[name="endDate"]');
      await endDate.fill('2025-05-01');
      const runBtn = page.locator('button').getByText('Run Report');
      await runBtn.click();

      const verifyStart = page.locator('g text').nth(6);
      await expect(verifyStart).toContainText('Mar 1');
      const startYear = page.locator('g text').nth(7);
      await expect(startYear).toContainText('2025');
      const verifyEnd = page.locator('g text').nth(22);
      await expect(verifyEnd).toContainText('Apr 26');
      const endYear = page.locator('g text').nth(23);
      await expect(endYear).toContainText('2025');
    });
  });

  test.describe('Funds', () => {
    test('should create fund', async ({ page }) => {
      const fundsBtn = page.locator('[id="secondaryMenu"]').getByText('Funds');
      await fundsBtn.click();
      await page.waitForTimeout(500);
      const addBtn = page.locator('[data-testid="add-fund-button"]');
      await addBtn.click();
      const fundName = page.locator('[name="fundName"]');
      await fundName.fill('Octavian Fund');
      const taxCheck = page.locator('[name="taxDeductible"]');
      await taxCheck.click();
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      await page.waitForTimeout(500);

      const verifyFund = page.locator('a').getByText('Octavian Fund');
      await expect(verifyFund).toHaveCount(1);
      const verifyTax = page.locator('p').getByText('Non-Deductible');
      await expect(verifyTax).toHaveCount(1);
    });

    test('should edit fund', async ({ page }) => {
      const fundsBtn = page.locator('[id="secondaryMenu"]').getByText('Funds');
      await fundsBtn.click();
      await page.waitForTimeout(500);
      const editBtn = page.locator('[data-cy="edit-5"]');
      await editBtn.click();
      const fundName = page.locator('[name="fundName"]');
      await fundName.fill('Octavius Fund');
      const taxCheck = page.locator('[name="taxDeductible"]');
      await taxCheck.click();
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      await page.waitForTimeout(500);

      const verifyFund = page.locator('a').getByText('Octavius Fund');
      await expect(verifyFund).toHaveCount(1);
      const verifyTax = page.locator('p').getByText('Non-Deductible');
      await expect(verifyTax).toHaveCount(0);
    });

    test('should cancel editing fund', async ({ page }) => {
      const fundsBtn = page.locator('[id="secondaryMenu"]').getByText('Funds');
      await fundsBtn.click();
      await page.waitForTimeout(500);
      const editBtn = page.locator('[data-cy="edit-5"]');
      await editBtn.click();
      const fundName = page.locator('[name="fundName"]');
      await expect(fundName).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await page.waitForTimeout(500);
      await expect(fundName).toHaveCount(0);
    });
  });

  test.describe('Batches', () => {
    test('should create batch', async ({ page }) => {
      const batchesBtn = page.locator('[id="secondaryMenu"]').getByText('Batches');
      await batchesBtn.click();
      await page.waitForTimeout(500);

      const addBtn = page.locator('[data-testid="add-batch-button"]');
      await addBtn.click();
      const batchName = page.locator('[name="name"]');
      await batchName.fill('October 10, 2025 Batch');
      const date = page.locator('[name="date"]');
      await date.fill('2025-10-10');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      await page.waitForTimeout(500);

      const verifyBatch = page.locator('a').getByText('October 10, 2025 Batch');
      await expect(verifyBatch).toHaveCount(1);
      const verifyDate = page.locator('p').getByText('Oct 10, 2025');
      await expect(verifyDate).toHaveCount(1);
    });

    test('should edit batch', async ({ page }) => {
      const batchesBtn = page.locator('[id="secondaryMenu"]').getByText('Batches');
      await batchesBtn.click();
      await page.waitForTimeout(500);

      const editBtn = page.locator('[data-cy="edit-0"]');
      await editBtn.click();
      await page.waitForTimeout(500);
      const batchName = page.locator('[name="name"]');
      await batchName.fill('October 1, 2025 Batch');
      await page.waitForTimeout(500);
      const date = page.locator('[name="date"]');
      await date.fill('2025-10-01');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      await page.waitForTimeout(500);

      const verifyBatch = page.locator('a').getByText('October 1, 2025 Batch');
      await expect(verifyBatch).toHaveCount(1);
      const verifyDate = page.locator('p').getByText('Oct 1, 2025');
      await expect(verifyDate).toHaveCount(1);
    });

    test('should cancel editing batch', async ({ page }) => {
      const batchesBtn = page.locator('[id="secondaryMenu"]').getByText('Batches');
      await batchesBtn.click();
      await page.waitForTimeout(500);

      const editBtn = page.locator('[data-cy="edit-0"]');
      await editBtn.click();
      const batchName = page.locator('[name="name"]');
      await expect(batchName).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await page.waitForTimeout(500);
      await expect(batchName).toHaveCount(0);
    });

    test('should add donation to batch', async ({ page }) => {
      const batchesBtn = page.locator('[id="secondaryMenu"]').getByText('Batches');
      await batchesBtn.click();
      await page.waitForTimeout(500);

      const selBatch = page.locator('a').getByText('October 1, 2025 Batch');
      await selBatch.click();
      await page.waitForTimeout(500);

      const anon = page.locator('button').getByText('Anonymous');
      await anon.click();
      const date = page.locator('input').first();
      await date.fill('2025-05-02');
      const method = page.locator('[role="combobox"]').first();
      await method.click();
      const methodSel = page.locator('[data-value="Cash"]');
      await methodSel.click();
      const fund = page.locator('[role="combobox"]').nth(1);
      await fund.click();
      const fundSel = page.locator('li').getByText('Octavius Fund');
      await fundSel.click();
      const notes = page.locator('input').nth(3);
      await notes.fill('Test Donation Notes');
      const amount = page.locator('input').nth(4);
      await amount.fill('20.00');
      const addBtn = page.locator('[data-testid="add-donation-submit"]');
      await addBtn.click();

      await page.waitForTimeout(1000);
      const validateName = page.locator('table td').getByText('Anonymous');
      await expect(validateName).toHaveCount(1);
      const validateDate = page.locator('table td').getByText('May 2, 2025');
      await expect(validateDate).toHaveCount(1);
      const validateAmount = page.locator('table td').getByText('$20.00');
      await expect(validateAmount).toHaveCount(2);
    });

    test('should edit a batch donation', async ({ page }) => {
      const batchesBtn = page.locator('[id="secondaryMenu"]').getByText('Batches');
      await batchesBtn.click();
      await page.waitForTimeout(500);

      const selBatch = page.locator('a').getByText('October 1, 2025 Batch');
      await selBatch.click();
      await page.waitForTimeout(500);

      const editBtn = page.locator('button').getByText('Edit').last();
      await editBtn.click();
      await page.waitForTimeout(500);
      const amount = page.locator('input').nth(2);
      await amount.fill('30.00');

      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const validateAmount = page.locator('table td').getByText('$30.00');
      await expect(validateAmount).toHaveCount(2);
    });

    test('should cancel editing a batch donation', async ({ page }) => {
      const batchesBtn = page.locator('[id="secondaryMenu"]').getByText('Batches');
      await batchesBtn.click();
      await page.waitForTimeout(500);

      const selBatch = page.locator('a').getByText('October 1, 2025 Batch');
      await selBatch.click();
      await page.waitForTimeout(500);

      const editBtn = page.locator('button').getByText('Edit').last();
      await editBtn.click();
      const amount = page.locator('input').nth(2);
      await expect(amount).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(amount).toHaveCount(0);
    });

    test('should delete a batch donation', async ({ page }) => {
      const batchesBtn = page.locator('[id="secondaryMenu"]').getByText('Batches');
      await batchesBtn.click();
      await page.waitForTimeout(500);

      const selBatch = page.locator('a').getByText('October 1, 2025 Batch');
      await selBatch.click();
      await page.waitForTimeout(500);

      const editBtn = page.locator('button').getByText('Edit').last();
      await editBtn.click();
      const deleteBtn = page.locator('button').getByText('Delete');
      await deleteBtn.click();
      await page.waitForTimeout(500);
      const validateDeletion = page.locator('table td').getByText('$30.00');
      await expect(validateDeletion).toHaveCount(0);
    });

    test('should go back to person select on donation entry', async ({ page }) => {
      const batchesBtn = page.locator('[id="secondaryMenu"]').getByText('Batches');
      await batchesBtn.click();
      await page.waitForTimeout(500);

      const selBatch = page.locator('a').getByText('October 1, 2025 Batch');
      await selBatch.click();
      await page.waitForTimeout(500);

      const anon = page.locator('button').getByText('Anonymous');
      await anon.click();
      const change = page.locator('button').getByText('Change');
      await change.click();
      await anon.click();
    });

    test('should delete batch', async ({ page }) => {
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain('Are you sure');
        await dialog.accept();
      });

      const batchesBtn = page.locator('[id="secondaryMenu"]').getByText('Batches');
      await batchesBtn.click();
      await page.waitForTimeout(500);

      const editBtn = page.locator('[data-cy="edit-0"]');
      await editBtn.click();
      await page.waitForTimeout(500);
      const deleteBtn = page.locator('[id="delete"]');
      await deleteBtn.click();
      await page.waitForTimeout(500);
      const verifyBatch = page.locator('a').getByText('October 10, 2025 Batch');
      await expect(verifyBatch).toHaveCount(0);
    });

    test('should delete fund', async ({ page }) => {
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain('Are you sure');
        await dialog.accept();
      });

      const fundsBtn = page.locator('[id="secondaryMenu"]').getByText('Funds');
      await fundsBtn.click();
      await page.waitForTimeout(500);
      const editBtn = page.locator('[data-cy="edit-5"]');
      await editBtn.click();
      const deleteBtn = page.locator('[id="delete"]');
      await deleteBtn.click();
      const verifyFund = page.locator('a').getByText('Octavius Fund');
      await expect(verifyFund).toHaveCount(0);
    });

  });

});