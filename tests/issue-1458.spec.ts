import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";
import { STORAGE_STATE_PATH } from "./global-setup";

// Issue #1458: "Recent people" under the Person search box never showed the people the admin
// had just picked; it was a fixed set ordered by the random person id.
const DEMO_BATCH = "/donations/batches/BAT00000001";
const JENNIFER_WILLIAMS = "PER00000011";

test.describe("issue-1458 recent people under the Person search box", () => {
  test.describe.configure({ retries: 0 });

  test("a person just picked is listed first under Recent people", async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const page = await context.newPage();
    try {
      await login(page);
      await page.goto(DEMO_BATCH);
      const search = page.getByTestId("person-search-input").locator("input");
      await expect(search).toBeVisible({ timeout: 15000 });
      await search.fill("Jennifer Williams");
      await page.getByTestId(`add-person-button-${JENNIFER_WILLIAMS}`).click();

      await page.getByTestId("bulk-donation-change-person").click();
      await expect(page.getByText("Recent people")).toBeVisible({ timeout: 15000 });
      const firstRow = page.locator("#householdMemberAddTable tr").first();
      await expect(firstRow).toContainText("Jennifer Williams", { timeout: 15000 });
    } finally {
      await context.close();
    }
  });
});
