import { test, expect, type BrowserContext, type Page } from "@playwright/test";

// Issue #1076: a member without People > Edit is still offered edit/delete controls on
// the People screens. The Api rejects the requests, so the buttons never work - they
// just shouldn't be there. Person.tsx already gates its edit action this way.
const DONALD_CLARK = "PER00000080"; // demo seed person, not the signed-in volunteer

// Rachel Martin: demo seed user whose only role permission is DoingApi/Tasks/View.
// She is a church Member, so the Api's isMember carve-out still lets her read people.
const VOLUNTEER_EMAIL = "volunteer@b1.church";

async function signIn(page: Page, email: string) {
  await page.goto("/", { timeout: 60000 });

  const emailInput = page.locator('input[type="email"]');
  await emailInput.waitFor({ state: "visible", timeout: 30000 });

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', "password");
  await page.click('button[type="submit"]');

  const churchDialog = page.locator('[role="dialog"]').filter({ hasText: "Select a Church" });
  await Promise.race([
    churchDialog.waitFor({ state: "visible", timeout: 15000 }).catch(() => {}),
    page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 }).catch(() => {})
  ]);

  if (await churchDialog.isVisible().catch(() => false)) {
    const grace = page.locator('[role="dialog"] h3:has-text("Grace Community Church")').first();
    await grace.click({ timeout: 10000 });
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
  }

  await page.locator("#primaryNavButton").waitFor({ state: "visible", timeout: 30000 });
}

test.describe.serial("Issue #1076 - People edit/delete controls respect People > Edit", () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    // Fresh context: the default storageState is the demo Domain Admin.
    context = await browser.newContext({ storageState: undefined });
    page = await context.newPage();
    await signIn(page, VOLUNTEER_EMAIL);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("person page hides the edit action from a user without People > Edit", async () => {
    await page.goto(`/people/${DONALD_CLARK}`, { timeout: 60000 });

    // Person loaded, so the page rendered for real and we are asserting on a live view.
    await expect(page.getByText("Donald Clark").first()).toBeVisible({ timeout: 30000 });

    await expect(page.locator('[data-testid="edit-person-button"]')).toHaveCount(0);
  });

  test("column picker does not offer the Delete column to a user without People > Edit", async () => {
    await page.goto("/people", { timeout: 60000 });

    const columnsButton = page.locator('[data-testid="columns-button"]');
    await expect(columnsButton).toBeVisible({ timeout: 30000 });
    await columnsButton.click();

    // Picker is open: a always-available column proves we are looking at the real list.
    await expect(page.locator('[data-testid="column-checkbox-lastName"]')).toBeVisible({ timeout: 10000 });

    await expect(page.locator('[data-testid="column-checkbox-deleteOption"]')).toHaveCount(0);
  });
});

// Positive control: the gating must not hide these from staff who do have the permission.
test.describe("Issue #1076 - a user with People > Edit still gets both controls", () => {
  test("person page shows the edit action and the picker offers the Delete column", async ({ page }) => {
    await page.goto(`/people/${DONALD_CLARK}`, { timeout: 60000 });
    await expect(page.locator('[data-testid="edit-person-button"]')).toBeVisible({ timeout: 30000 });

    await page.goto("/people", { timeout: 60000 });
    const columnsButton = page.locator('[data-testid="columns-button"]');
    await expect(columnsButton).toBeVisible({ timeout: 30000 });
    await columnsButton.click();
    await expect(page.locator('[data-testid="column-checkbox-deleteOption"]')).toBeVisible({ timeout: 10000 });
  });
});
