import { type Page } from "@playwright/test";

// The demo church has no logo. Answer this page's public-settings lookup with one,
// so the shared demo data (and parallel specs that print the church name) stay untouched.
export const DEMO_LOGO = "/images/logo.png";

export async function mockChurchLogo(page: Page) {
  await page.route("**/settings/public/**", async (route) => {
    const response = await route.fetch();
    const settings = await response.json();
    await route.fulfill({ response, json: { ...settings, logoLight: DEMO_LOGO } });
  });
}
