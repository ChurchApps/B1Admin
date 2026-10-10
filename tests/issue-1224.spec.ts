import { peopleTest as test, expect } from "./helpers/test-fixtures";
import { SEED_PEOPLE, openPersonRow, personDetailsEditButton } from "./helpers/fixtures";

// ChurchAppsSupport#1224: people created from a form are "Guest", but B1Admin's status list had no Guest,
// so their status showed blank on the edit form and couldn't be picked in conditions or search.
test("a Guest's membership status shows on the person edit form", async ({ page }) => {
  await page.route(/\/membership\/people\/[^/?]+$/, async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    const response = await route.fetch();
    const person = await response.json();
    await route.fulfill({ response, json: { ...person, membershipStatus: "Guest" } });
  });
  await openPersonRow(page, SEED_PEOPLE.DONALD);
  await personDetailsEditButton(page).click();
  const status = page.locator('[data-testid="membership-status-select"]');
  await expect(status).toBeVisible({ timeout: 10000 });
  await expect(status.getByRole("combobox")).toHaveText("Guest");
});
