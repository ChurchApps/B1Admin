import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// ChurchAppsSupport#1178: "Print All Classes" showed "No classes found to print."
// /groups/search joins attendance tables from the membership module, which fails
// in production where each module has its own database. Locally one shared DB hides
// that, so answer the cross-module search the way production does.
test("print all classes for a service time prints every group in it", async ({ page }) => {
  await page.route("**/membership/groups/search**", (route) =>
    route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Table 'membership.groupServiceTimes' doesn't exist" }) }));
  // Demo seed: five groups meet at the Wednesday 7:00 PM service time.
  await page.goto("/groups/print-roster?serviceTimeId=SST00000004&date=2025-12-03");
  await expect(page.locator("h1.roster-title")).toHaveText(
    ["Elementary (3-5)", "Elementary (K-2)", "Nursery (0-2)", "Preschool (3-5)", "Wednesday Prayer Service"],
    { timeout: 15000 }
  );
});
