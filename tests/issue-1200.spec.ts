import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// #1200: a "New Form Submission" notification sends B1 Admin to /forms/:id?tab=submissions.
// The form page ignored ?tab= and always opened on Questions, so the submission never showed.
test("a form link with ?tab=submissions opens on the submissions tab", async ({ page }) => {
  await page.goto("/forms/FRM00000001?tab=submissions");
  await expect(page.getByText("Form Submission Results")).toBeVisible({ timeout: 15000 });
});
