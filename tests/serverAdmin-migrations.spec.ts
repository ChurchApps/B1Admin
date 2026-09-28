import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";
import { navigateTo } from "./helpers/navigation";

// Server Admin → Database Migrations lists every module's applied/pending migrations
// from GET /membership/serverHealth/migrations. demo@b1.church is a server admin via
// the Domain Admins role (see serverAdmin-commons.spec.ts). A freshly reset demo DB has
// every migration applied, so the tab reads "up to date" and the run button is disabled.
test("migrations tab shows every module up to date on a migrated demo database", async ({ page }) => {
  await login(page);
  await navigateTo(page, "serverAdmin");
  const section = page.locator('[data-testid="settings-section-migrations"]');
  await expect(section).toBeVisible();
  await section.click();
  await expect(page).toHaveURL(/[?&]tab=migrations/);

  const table = page.locator("#adminMigrationsTable");
  await expect(table).toBeVisible();
  for (const m of ["membership", "attendance", "content", "giving", "messaging", "doing", "commons"]) {
    await expect(page.getByTestId("migration-row-" + m)).toContainText("Up to date");
  }
  await expect(page.getByTestId("run-migrations-button")).toBeDisabled();
});
