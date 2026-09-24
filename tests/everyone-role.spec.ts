import { loggedInTest as test, expect } from "./helpers/test-fixtures";

test("Everyone role shows the everyone message and loads its permissions", async ({ page }) => {
  await page.goto("/settings/role/everyone");
  await expect(page.getByText("This role applies to all the members of the church.")).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId("add-role-member-button")).toHaveCount(0);
  await expect(page.locator("#rolePermissionsBox .MuiAccordion-root").first()).toBeVisible({ timeout: 15000 });
});
