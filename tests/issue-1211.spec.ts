import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// #1211: making a curated-calendar event private hid it from the admin curated calendar, so staff could not reopen it.
test("private event stays on the admin curated calendar", async ({ page }) => {
  await page.goto("/calendars/CAL00000001");
  const event = page.locator(".rbc-event").filter({ hasText: "Youth Group Meeting" }).first();
  await expect(event).toBeVisible({ timeout: 15000 });
  await event.click();
  await page.getByTestId("calendar-event-edit-button").click();

  await page.getByTestId("new-event-visibility-select").click();
  await page.getByRole("option", { name: "Private" }).click();
  await page.getByTestId("new-event-save-button").click();
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).last().click();
  await expect(page.getByTestId("new-event-save-button")).toBeHidden({ timeout: 15000 });

  await page.reload();
  await expect(page.locator(".rbc-event").filter({ hasText: "Youth Group Meeting" }).first()).toBeVisible({ timeout: 15000 });
});
