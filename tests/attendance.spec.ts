import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

// OCTAVIAN/OCTAVIUS are the names used for testing. If you see Octavian or Octavius entered anywhere, it is a result of these tests.
test.describe('Attendance Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    const menuBtn = page.locator('[id="primaryNavButton"]').getByText('expand_more');
    await menuBtn.click();
    const peopleHomeBtn = page.locator('[data-testid="nav-item-people"]');
    await peopleHomeBtn.click();
    await page.waitForTimeout(5000);
    await expect(page).toHaveURL(/\/people/);
    const attHomeBtn = page.locator('[id="secondaryMenu"]').getByText('Attendance');
    await attHomeBtn.click();
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/attendance/);
  });

  /* test('should load attendance page', async ({ page }) => {
    const attendanceHeader = page.locator('h4').getByText('Attendance');
    await attendanceHeader.click();
  }); */

  test.describe('Setup', () => {

    test('should add campus', async ({ page }) => {
      const addBtn = page.locator('[data-testid="add-campus-button"]');
      await addBtn.click();
      const campusName = page.locator('input[id="name"]');
      await campusName.fill('Octavian Test Campus');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      await page.waitForTimeout(500);
      const verifiedName = page.locator('button').getByText('Octavian Test Campus');
      await expect(verifiedName).toHaveCount(1);
    });

    test('should cancel adding campus', async ({ page }) => {
      const addBtn = page.locator('[data-testid="add-campus-button"]');
      await addBtn.click();
      const campusName = page.locator('input[id="name"]');
      await expect(campusName).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(campusName).toHaveCount(0);
    });

    test('should edit campus', async ({ page }) => {
      const originName = page.locator('button').getByText('Octavian Test Campus');
      await originName.click();
      const campusName = page.locator('input[id="name"]');
      await campusName.fill('Octavius Test Campus');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      await page.waitForTimeout(500);
      const verifiedName = page.locator('button').getByText('Octavius Test Campus');
      await expect(verifiedName).toHaveCount(1);
    });

    test('should cancel editing campus', async ({ page }) => {
      const originName = page.locator('button').getByText('Octavius Test Campus');
      await originName.click();
      const campusName = page.locator('input[id="name"]');
      await expect(campusName).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await expect(campusName).toHaveCount(0);
    });

    test('should add service', async ({ page }) => {
      const addServBtn = page.locator('button').getByText('Add Service').nth(3);
      await addServBtn.click();
      const campusSelect = page.locator('div[role="combobox"]');
      await campusSelect.click();
      const selCampus = page.locator('li').getByText('Octavius Test Campus');
      await selCampus.click();
      const servName = page.locator('input[id="name"]');
      await servName.fill('Octavian Test Service');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const verifiedServ = page.locator('button').getByText('Octavian Test Service');
      await expect(verifiedServ).toHaveCount(1);
    });

    test('should edit service', async ({ page }) => {
      const serv = page.locator('button').getByText('Octavian Test Service');
      await serv.click();
      const campusSelect = page.locator('div[role="combobox"]');
      await campusSelect.click();
      const selCampus = page.locator('li').getByText('Octavius Test Campus');
      await selCampus.click();
      const servName = page.locator('input[id="name"]');
      await servName.fill('Octavius Test Service');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      await page.waitForTimeout(500);
      const verifiedServ = page.locator('button').getByText('Octavius Test Service');
      await expect(verifiedServ).toHaveCount(1);
    });

    test('should cancel editing service', async ({ page }) => {
      const serv = page.locator('button').getByText('Sunday Evening Service');
      await serv.click();
      const campusSelect = page.locator('div[role="combobox"]');
      await expect(campusSelect).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await page.waitForTimeout(500);
      await expect(campusSelect).toHaveCount(0);
    });

    test('should add service time', async ({ page }) => {
      const addServTimeBtn = page.locator('button').getByText('Add Service Time').first();
      await addServTimeBtn.click();
      const servSelect = page.locator('div[role="combobox"]');
      await servSelect.click();
      const selServ = page.locator('li').getByText('Octavius Test Service');
      await selServ.click();
      const timeName = page.locator('input[id="name"]');
      await timeName.fill('Octavian Test Time');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      const verifiedTime = page.locator('button').getByText('Octavian Test Time');
      await expect(verifiedTime).toHaveCount(1);
    });

    test('should edit service time', async ({ page }) => {
      const time = page.locator('button').getByText('Octavian Test Time');
      await time.click();
      const servSelect = page.locator('div[role="combobox"]');
      await servSelect.click();
      const selServ = page.locator('li').getByText('Octavius Test Service');
      await selServ.click();
      const timeName = page.locator('input[id="name"]');
      await timeName.fill('Octavius Test Time');
      const saveBtn = page.locator('button').getByText('Save');
      await saveBtn.click();
      await page.waitForTimeout(500);
      const verifiedTime = page.locator('button').getByText('Octavius Test Time');
      await expect(verifiedTime).toHaveCount(1);
    });

    test('should cancel editing service time', async ({ page }) => {
      const serv = page.locator('button').getByText('6:00 PM Service');
      await serv.click();
      const servSelect = page.locator('div[role="combobox"]');
      await expect(servSelect).toHaveCount(1);
      const cancelBtn = page.locator('button').getByText('Cancel');
      await cancelBtn.click();
      await page.waitForTimeout(500);
      await expect(servSelect).toHaveCount(0);
    });

    test('should delete service time', async ({ page }) => {
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain('Are you sure');
        await dialog.accept();
      });

      const time = page.locator('button').getByText('Octavius Test Time');
      await time.click();
      const deleteBtn = page.locator('button').getByText('Delete');
      await deleteBtn.click();
      await page.waitForTimeout(500);
      await expect(time).toHaveCount(0);
    });

    test('should delete service', async ({ page }) => {
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain('Are you sure');
        await dialog.accept();
      });

      const serv = page.locator('button').getByText('Octavius Test Service');
      await serv.click();
      const deleteBtn = page.locator('button').getByText('Delete');
      await deleteBtn.click();
      await page.waitForTimeout(500);
      await expect(serv).toHaveCount(0);
    });

    test('should delete campus', async ({ page }) => {
      page.once('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toContain('Are you sure');
        await dialog.accept();
      });

      const originName = page.locator('button').getByText('Octavius Test Campus');
      await originName.click();
      const deleteBtn = page.locator('button').getByText('Delete');
      await deleteBtn.click();
      await expect(originName).toHaveCount(0);
    });

    test('should view group from attendance homepage', async ({ page }) => {
      const groupBtn = page.locator('a').getByText('Preschool (3-5)').first();
      await groupBtn.click();

      await page.waitForURL(/\/groups\/GRP\d+/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/groups\/GRP\d+/);

      const groupHeader = page.locator('p').getByText('Preschool (3-5)').first();
      await groupHeader.click();
    });
  });

  test.describe('Trends', () => {
    test('should filter attendance trends', async ({ page }) => {
      const trendTab = page.locator('button[role="tab"]').getByText('Attendance Trend');
      await trendTab.click();
      await page.waitForTimeout(500);

      const campusName = page.locator('[id="mui-component-select-campusId"]');
      await campusName.click();
      const campusSel = page.locator('li').getByText('Main Campus');
      await campusSel.click();
      const serviceName = page.locator('[id="mui-component-select-serviceId"]');
      await serviceName.click();
      const serviceSel = page.locator('li').getByText('Sunday Morning Service');
      await serviceSel.click();
      const timeName = page.locator('[id="mui-component-select-serviceTimeId"]');
      await timeName.click();
      const timeSel = page.locator('li').getByText('10:30 AM Service');
      await timeSel.click();
      const groupName = page.locator('[id="mui-component-select-groupId"]');
      await groupName.click();
      const groupSel = page.locator('li').getByText('Sunday Morning Service');
      await groupSel.click();
      const runBtn = page.locator('button').getByText('Run Report');
      await runBtn.click();
      await page.waitForTimeout(500);

      const resultsTableRows = page.locator('[id="reportsBox"] table tr');
      expect(resultsTableRows).toHaveCount(36);
    });

    /* test('UNFINISHED should print attendance trends', async ({ page }) => {
      const trendTab = page.locator('button[role="tab"]').getByText('Attendance Trend');
      await trendTab.click();
      await page.waitForTimeout(500);
  
      const printBtn = page.locator('button').getByText('print');
      await printBtn.click();
      await page.waitForTimeout(500);
      
    }); */

    /* test('UNFINISHED should download attendance trends', async ({ page }) => {
      const trendTab = page.locator('button[role="tab"]').getByText('Attendance Trend');
      await trendTab.click();
      await page.waitForTimeout(500);
  
      const downloadBtn = page.locator('button').getByText('download');
      await downloadBtn.click();
      const summaryBtn = page.locator('button').getByText('Summary');
      await summaryBtn.click();
      await page.waitForTimeout(500);
      // doesn't work? v
      page.waitForEvent('download');
    }); */

    test('UPDATE should display group attendance', async ({ page }) => {
      // completed as I can, correcting reports display info is up to father. Data does not load in.
      const trendTab = page.locator('button[role="tab"]').getByText('Group Attendance');
      await trendTab.click();
      await page.waitForTimeout(500);

      const campusName = page.locator('[id="mui-component-select-campusId"]');
      await campusName.click();
      const campusSel = page.locator('li').getByText('Main Campus');
      await campusSel.click();
      const serviceName = page.locator('[id="mui-component-select-serviceId"]');
      await serviceName.click();
      const serviceSel = page.locator('li').getByText('Sunday Morning Service');
      await serviceSel.click();
      const weekBox = page.locator('[name="week"]');
      await weekBox.fill('2024-03-03');
      const runBtn = page.locator('button').getByText('Run Report');
      await runBtn.click();
      await page.waitForTimeout(500);
      const report = page.locator('td').getByText('10:30 AM Service');
      await report.click();
    });
  });

});