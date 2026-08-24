import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";
import { navigateTo } from "./helpers/navigation";

// Commons is a Domain Admin-only moderation tab. demo@b1.church (USR00000001) is a member of
// the "Domain Admins" role (Api/tools/dbScripts/membership/demo.sql, RME00000001 -> ROL00000001),
// which holds a MembershipApi/Domain/Admin rolePermission (RPM00000001). The server expands that
// into every permission — including Server/Admin — via replaceDomainAdminPermissions/addAllPermissions
// (Api/src/modules/membership/helpers/UserHelper.ts), so the demo user does have access to this tab.
test.describe("serverAdmin Commons tab", () => {
  test("shows the Commons section with its pending-assets and reports empty states", async ({ page }) => {
    await login(page);
    await navigateTo(page, "serverAdmin");

    const commonsSection = page.locator('[data-testid="settings-section-commons"]');
    await expect(commonsSection).toBeVisible();
    await commonsSection.click();

    await expect(page.locator("#commonsPendingAssetsTable")).not.toBeVisible();
    await expect(page.getByText("No assets are waiting for review.")).toBeVisible();
    await expect(page.getByText("No reports have been filed.")).toBeVisible();
  });
});
