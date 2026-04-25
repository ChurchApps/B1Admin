import { settingsTest as test, expect } from './helpers/test-fixtures';

// Import/Export entry-point coverage.
// The actual import/export workflow (CSV upload, Breeze, B1 Database export) lives in
// the B1Transfer app at https://transfer.b1.church — see .notes/B1Admin-test-judgment-log.md.
// All B1Admin can verify is that the entry-point button is present, labeled correctly,
// targets the transfer subdomain, and opens in a new tab.

test.describe('Settings — Import/Export entry point', () => {
  test('shows the Import/Export button on the Settings page', async ({ page }) => {
    const button = page.getByRole('link', { name: 'Import/Export' });
    await expect(button).toBeVisible({ timeout: 15000 });
  });

  test('Import/Export button targets transfer.b1.church with auth params', async ({ page }) => {
    const button = page.getByRole('link', { name: 'Import/Export' });
    const href = await button.getAttribute('href');
    expect(href).toContain('transfer.b1.church/login');
    expect(href).toContain('jwt=');
    expect(href).toContain('churchId=');
  });

  test('Import/Export button opens in a new tab', async ({ page }) => {
    const button = page.getByRole('link', { name: 'Import/Export' });
    await expect(button).toHaveAttribute('target', '_blank');
    await expect(button).toHaveAttribute('rel', /noreferrer.*noopener|noopener.*noreferrer/);
  });
});
