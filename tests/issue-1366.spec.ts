import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// In dark mode a printed form answer box must print on a light fill, since print text is dark.
test("person form answers print on a light background in dark mode", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("b1admin-theme-mode", "dark"));
  await page.goto("/people/PER00000079?view=forms&form=FRM00000001");
  const answer = page.getByTestId("display-box-content").getByText("brian.harris@email.com");
  await expect(answer).toBeVisible({ timeout: 15000 });
  await page.emulateMedia({ media: "print" });

  const bg = await answer.evaluate((n) => getComputedStyle(n.parentElement as Element).backgroundColor);
  const [r, g, b] = (bg.match(/\d+/g) || []).map(Number);
  expect(Math.min(r, g, b), `answer box background ${bg}`).toBeGreaterThan(200);
});
