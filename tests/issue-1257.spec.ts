import { type Page } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";
import { openSeedGroup, SESSION_GROUP } from "./helpers/fixtures";

// Issue #1257: a person created from the session's add box should be added to that session's attendance.

async function openNewSession(page: Page, date: string) {
  await openSeedGroup(page, SESSION_GROUP);
  await page.getByTestId("group-all-sessions").click();
  await page.locator("button").getByText("New").first().click();
  await page.locator('[data-testid="session-date-input"] input').fill(date);
  const saveBtn = page.getByRole("button", { name: "Save", exact: true });
  await expect(saveBtn).toBeEnabled({ timeout: 10000 });
  await saveBtn.click();
  const [y, m, d] = date.split("-");
  const item = page.getByRole("button").filter({ hasText: `${m}/${d}/${y}` }).first();
  await item.click({ timeout: 10000 });
  await expect(page.locator('[data-cy="session-present-msg"]')).toBeVisible({ timeout: 10000 });
}

test("a person created from the session add box is marked present", async ({ page }) => {
  await openNewSession(page, "2026-03-11");

  const last = `Newcomer${Date.now()}`;
  const box = page.getByTestId("session-person-add");
  await box.locator('input[name="personAddText"]').fill(`Zelda ${last}`);
  await box.locator('[data-testid="search-button"]').click();
  await box.getByRole("button", { name: /Add (a )?New Person/ }).click();

  const dialog = page.getByRole("dialog").filter({ hasText: /Add (a )?New Person/ });
  await dialog.locator('input[name="first"]').fill("Zelda");
  await dialog.locator('input[name="last"]').fill(last);
  await dialog.getByRole("button", { name: "Add", exact: true }).click();
  await expect(dialog).toBeHidden();

  const row = page.getByTestId("session-roster-row").filter({ hasText: `Zelda ${last}` });
  await expect(row).toHaveCount(1, { timeout: 10000 });
  await expect(row.locator('input[type="checkbox"]')).toBeChecked();
});
