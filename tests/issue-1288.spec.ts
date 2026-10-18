import { test, expect } from "@playwright/test";
import { createNamesOnlyRole, deleteRole, loginAsVolunteer } from "./helpers/names-only-role";

// ChurchAppsSupport#1288: a View People Names Only user still saw the group Email button and the church's email templates.
test.describe("View People Names Only email access", () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  // volunteer@b1.church is a plain member (not the leader) of Greeters Ministry.
  const GREETERS = "GRP00000025";
  let roleId = "";

  test.beforeAll(async () => { roleId = await createNamesOnlyRole("Issue 1288 Names Only"); });
  test.afterAll(async () => { await deleteRole(roleId); });

  test("group page hides Email and the templates page is not reachable", async ({ page }) => {
    await loginAsVolunteer(page);
    await page.goto(`/groups/${GREETERS}`);
    await expect(page.getByRole("heading", { name: "Greeters Ministry" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("email-group-button")).toHaveCount(0);

    await page.goto("/settings/email-templates");
    await page.waitForURL((url) => url.pathname === "/", { timeout: 15000 });
  });
});
