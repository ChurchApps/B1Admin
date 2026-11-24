import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// The Api writes "security" audit rows for two-factor, password and email changes and for
// logging in as another user. The Audit Log can filter to them and names each action plainly.
const securityLog = (id: string, action: string) => ({
  id,
  churchId: "CHU00000001",
  userId: "USR00000001",
  category: "security",
  action,
  entityType: "user",
  entityId: "USR00000001",
  details: "{}",
  ipAddress: "127.0.0.1",
  module: "",
  batchId: "",
  created: new Date().toISOString()
});

test.describe("Audit log security category", () => {
  test("filters to security rows and shows readable action names", async ({ page }) => {
    const logs = [
      securityLog("a1", "mfa_enabled"),
      securityLog("a2", "mfa_disabled"),
      securityLog("a3", "mfa_reset"),
      securityLog("a4", "password_changed"),
      securityLog("a5", "email_changed"),
      securityLog("a6", "impersonate")
    ];
    const categories: string[] = [];
    await page.route("**/auditlogs?*", (route) => {
      const category = new URL(route.request().url()).searchParams.get("category") || "";
      categories.push(category);
      route.fulfill({ json: { logs: category === "security" ? logs : [], count: category === "security" ? logs.length : 0, limit: 50, offset: 0 } });
    });

    await page.goto("/settings/audit-log");
    await page.locator(".MuiFormControl-root").filter({ hasText: "Category" }).locator(".MuiSelect-select").click();
    await page.getByRole("option", { name: "Security", exact: true }).click();
    const searched = page.waitForRequest((r) => r.url().includes("/auditlogs?") && r.url().includes("category=security"));
    await page.getByRole("button", { name: "Search" }).click();
    await searched;

    const body = page.locator("table tbody");
    for (const label of ["Two-factor sign-in turned on", "Two-factor sign-in turned off", "Two-factor sign-in reset", "Password changed", "Email changed", "Logged in as another user"]) {
      await expect(body.getByRole("cell", { name: label, exact: true })).toBeVisible({ timeout: 10000 });
    }
    await expect(body.getByText("security").first()).toBeVisible();
    expect(categories).toContain("security");
  });
});
