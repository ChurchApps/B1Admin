import { loggedInTest as test, expect } from "./helpers/test-fixtures";

test.describe("Code review fixes - settings and donations", () => {
  test.use({ timezoneId: "America/Chicago" });

  test("Everyone role shows the everyone message and loads its permissions", async ({ page }) => {
    await page.goto("/settings/role/everyone");
    await expect(page.getByText("This role applies to all the members of the church.")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("add-role-member-button")).toHaveCount(0);
    await expect(page.locator("#rolePermissionsBox .MuiAccordion-root").first()).toBeVisible({ timeout: 15000 });
  });

  test("fund page date filter keeps the picked day and links to the batch page", async ({ page }) => {
    await page.goto("/donations/funds/FUN00000001");
    const start = page.locator('input[name="startDate"]');
    const end = page.locator('input[name="endDate"]');
    await expect(start).toBeVisible({ timeout: 15000 });
    await start.fill("2020-01-01");
    await end.fill("2030-12-31");
    await expect(start).toHaveValue("2020-01-01");
    await expect(end).toHaveValue("2030-12-31");
    const batchLink = page.locator('[data-cy^="batchId-"]').first();
    await expect(batchLink).toBeVisible({ timeout: 15000 });
    await expect(batchLink).toHaveAttribute("href", /\/donations\/batches\/.+/);
  });
});
