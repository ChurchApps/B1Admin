import { test as base, type Page } from "@playwright/test";
import { login } from "./auth";
import {
  navigateToAttendance,
  navigateToDonations,
  navigateToGroups,
  navigateToPeople,
  navigateToSermons,
  navigateToServing,
  navigateToSettings,
  navigateToSite,
} from "./navigation";

// Pre-extended `test` objects, one per primary section. Each overrides the
// built-in `page` fixture so it arrives logged in and already on the right
// section. Specs import the variant they need and drop their
// `beforeEach(login + navigate)` boilerplate. Test signatures stay
// `async ({ page }) => { ... }` — no rename needed.
//
// Usage:
//   import { attendanceTest as test, expect } from './helpers/test-fixtures';
//
// For specs that only need login (no navigation), use `loggedInTest`.

const sectionTest = (setup: (p: Page) => Promise<void>) =>
  base.extend({
    page: async ({ page }, use) => {
      await login(page);
      await setup(page);
      await use(page);
    },
  });

export const loggedInTest = base.extend({
  page: async ({ page }, use) => {
    await login(page);
    await use(page);
  },
});

export const peopleTest = sectionTest(navigateToPeople);
export const groupsTest = sectionTest(navigateToGroups);
export const attendanceTest = sectionTest(navigateToAttendance);
export const donationsTest = sectionTest(navigateToDonations);
export const sermonsTest = sectionTest(navigateToSermons);
export const servingTest = sectionTest(navigateToServing);
export const settingsTest = sectionTest(navigateToSettings);
export const siteTest = sectionTest(navigateToSite);

export { expect } from "@playwright/test";
