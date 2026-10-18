import { loggedInTest as test, expect } from "./helpers/test-fixtures";
import { navigateToCalendars } from "./helpers/navigation";

// Issue #1292: the calendar edit form showed "Calendar Details / Configure your calendar settings"
// in grey with no settings behind it, which read as a locked section.

test("calendar edit form shows no placeholder settings text", async ({ page }) => {
  await navigateToCalendars(page);
  const addButton = page.locator('[data-testid="add-calendar"]').or(page.locator('[data-testid="empty-state-add-calendar"]')).first();
  await expect(addButton).toBeVisible({ timeout: 15000 });
  await addButton.click();
  await expect(page.locator('[data-testid="calendar-name-input"] input')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("Configure your calendar settings")).toHaveCount(0);
  await expect(page.getByText("Calendar Details", { exact: true })).toHaveCount(0);
});
