import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Issue #1092: Save on the B1 Mobile page could fire before the existing settings loaded,
// so every setting was posted without its id and created duplicate rows.

test("B1 Mobile Save stays disabled until the existing settings have loaded", async ({ page }) => {
  let release: () => void = () => { };
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route((url) => url.pathname.endsWith("/membership/settings"), async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    await held;
    await route.continue();
  });

  await page.goto("/mobile/b1-mobile");
  const save = page.getByRole("button", { name: /^Save$/ });
  await expect(save).toBeVisible({ timeout: 15000 });
  await expect(save).toBeDisabled();

  const loaded = page.waitForResponse((r) => r.url().endsWith("/membership/settings") && r.request().method() === "GET");
  release();
  await loaded;
  await expect(save).toBeEnabled();
});
