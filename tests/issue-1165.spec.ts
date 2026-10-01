import { peopleTest as test, expect } from "./helpers/test-fixtures";
import { personDetailsEditButton, SEED_PEOPLE, openPersonRow } from "./helpers/fixtures";

// #1165: switching tabs and coming back refetched the person and wiped unsaved edits.
// Patricia Moore has no work phone, so each refetch hands the form a new person object.
test("unsaved person edits survive the tab regaining focus", async ({ page }) => {
  await openPersonRow(page, SEED_PEOPLE.PATRICIA);
  await page.waitForURL(/\/people\/(?!demographics|lists)[^/?#]+/);
  const personId = new URL(page.url()).pathname.split("/").pop();

  await personDetailsEditButton(page).first().click();
  const nick = page.getByTestId("nickname-input").locator("input");
  await expect(nick).toBeVisible();
  await nick.fill("Zacchaeus Unsaved");

  // Simulate the user coming back to the tab; react-query refetches on focus.
  const refetched = page.waitForResponse((r) => r.request().method() === "GET" && new RegExp(`/people/${personId}(\\?|$)`).test(r.url()), { timeout: 10000 });
  await page.evaluate(() => window.dispatchEvent(new Event("visibilitychange")));
  await refetched;
  // Let React commit whatever the refetch triggers before checking.
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 0)))));

  await expect(nick).toHaveValue("Zacchaeus Unsaved");
});
