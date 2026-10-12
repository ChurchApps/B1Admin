import { servingTest as test, expect } from "./helpers/test-fixtures";

// Issue #1242: the Past tab on a plan type's Plans card listed upcoming plans too.

test("Past tab lists only plans dated before today", async ({ page }) => {
  await page.goto("/serving/planTypes/PLT00000001");
  await page.getByTestId("plans-past-pill").click();
  const region = page.getByRole("region", { name: "Plans" });
  await expect(region.getByRole("link", { name: "Last Week Worship Schedule" })).toBeVisible({ timeout: 15000 });
  await expect(region.getByRole("link", { name: "Lessons.church Test Plan" })).toHaveCount(0);
  await expect(region.getByRole("link", { name: "Upcoming Worship Schedule" })).toHaveCount(0);
});
