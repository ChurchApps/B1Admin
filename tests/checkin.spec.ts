import { groupsTest as test, expect } from "./helpers/test-fixtures";
import { editIconButton } from "./helpers/fixtures";

test.describe("Check-in: group configuration", () => {
  test("opens a seeded group detail page from the list", async ({ page }) => {
    await page.getByRole("link", { name: "Sunday Morning Service", exact: true }).click();
    await page.waitForURL(/\/groups\/(?!health(?:\/|$))[^/?#]+/, { timeout: 10000, waitUntil: "commit" });
  });

  test("displays Track Attendance, Parent Pickup, Print Nametag from seed", async ({ page }) => {
    await page.getByRole("link", { name: "Sunday Morning Service", exact: true }).click();
    await page.waitForURL(/\/groups\/(?!health(?:\/|$))[^/?#]+/, { timeout: 10000, waitUntil: "commit" });

    await expect(page.getByText("Track Attendance").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Parent Pickup").first()).toBeVisible();
    await expect(page.getByText(/Print Nametag|Print Name Tag/i).first()).toBeVisible();
  });

  test("edit form exposes Track Attendance, Parent Pickup, Print Nametag selects", async ({ page }) => {
    await page.getByRole("link", { name: "Sunday Morning Service", exact: true }).click();
    await page.waitForURL(/\/groups\/(?!health(?:\/|$))[^/?#]+/, { timeout: 10000, waitUntil: "commit" });

    await editIconButton(page).first().click();

    await expect(page.locator('[data-cy="select-attendance-type"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[name="parentPickup"]')).toBeVisible();
    await expect(page.locator('[name="printNametag"]')).toBeVisible();

    // Cancel out without mutating — other tests share this seed group.
    await page.locator("button").getByText("Cancel").click();
  });

  test("shows assigned service times for the group", async ({ page }) => {
    await page.getByRole("link", { name: "Sunday Morning Service", exact: true }).click();
    await page.waitForURL(/\/groups\/(?!health(?:\/|$))[^/?#]+/, { timeout: 10000, waitUntil: "commit" });

    await expect(page.getByText("9:00 AM Service").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("10:30 AM Service").first()).toBeVisible();
  });

  test("edit form lists available service times for assignment", async ({ page }) => {
    await page.getByRole("link", { name: "Sunday Morning Service", exact: true }).click();
    await page.waitForURL(/\/groups\/(?!health(?:\/|$))[^/?#]+/, { timeout: 10000, waitUntil: "commit" });

    await editIconButton(page).first().click();

    const select = page.locator('[data-cy="choose-service-time"]');
    await expect(select).toBeVisible({ timeout: 10000 });
    await select.click();

    const options = page.getByRole("option");
    await expect(options.first()).toBeVisible({ timeout: 10000 });
    await expect(options.filter({ hasText: "9:00 AM Service" }).first()).toBeVisible();

    await page.keyboard.press("Escape");
    await page.locator("button").getByText("Cancel").click();
  });

  test("saves a Parent Pickup toggle and reflects it in the display", async ({ page }) => {
    await page.getByRole("link", { name: "Sunday Morning Service", exact: true }).click();
    await page.waitForURL(/\/groups\/(?!health(?:\/|$))[^/?#]+/, { timeout: 10000, waitUntil: "commit" });

    // Target role=combobox, not [name="parentPickup"] (hidden native input).
    const parentPickupCombo = page.locator("#mui-component-select-parentPickup");

    await editIconButton(page).first().click();
    await expect(parentPickupCombo).toBeVisible({ timeout: 10000 });
    await parentPickupCombo.click();
    await page.getByRole("option", { name: "Yes", exact: true }).click();

    const groupSavePromise = page.waitForResponse(
      (r) => r.url().includes("/groups") && r.request().method() === "POST",
      { timeout: 10000 }
    );
    await page.locator("button").getByText("Save").click();
    await groupSavePromise;

    await expect(parentPickupCombo).toHaveCount(0, { timeout: 10000 });

    const parentPickupRow = page.getByText("Parent Pickup", { exact: true }).locator("..");
    await expect(parentPickupRow.locator('svg[data-testid="CheckCircleIcon"]')).toBeVisible({ timeout: 10000 });

    // Restore seed state for parallel/subsequent runs.
    await editIconButton(page).first().click();
    await expect(parentPickupCombo).toBeVisible({ timeout: 10000 });
    await parentPickupCombo.click();
    await page.getByRole("option", { name: "No", exact: true }).click();
    const revertPromise = page.waitForResponse(
      (r) => r.url().includes("/groups") && r.request().method() === "POST",
      { timeout: 10000 }
    );
    await page.locator("button").getByText("Save").click();
    await revertPromise;
    await expect(parentPickupCombo).toHaveCount(0, { timeout: 10000 });
    await expect(parentPickupRow.locator('svg[data-testid="CancelIcon"]')).toBeVisible({ timeout: 10000 });
  });
});
