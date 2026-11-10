import { test, expect, openAndLoad } from "./fixtures";

// One read-only visit per primary section. The API path is the request that proves the
// section loaded its own data, not just the app shell.
const SECTIONS: { name: string; path: string; api: RegExp; url?: RegExp }[] = [
  { name: "Sunday dashboard", path: "/dashboard", api: /\/membership\/groups$/ },
  { name: "People", path: "/people", api: /\/membership\/people\/list/ },
  { name: "Groups", path: "/groups", api: /\/membership\/groups\/tag\// },
  { name: "Donations", path: "/donations", api: /\/giving\/funds/ },
  { name: "Serving", path: "/serving", api: /\/membership\/groups\/tag\/ministry/, url: /\/serving/ },
  { name: "Sermons", path: "/sermons", api: /\/content\/sermons/ },
  { name: "Website", path: "/site/pages", api: /\/content\/pages/ },
  { name: "Settings", path: "/settings", api: /\/membership\/churches\// }
];

for (const s of SECTIONS) {
  test(`${s.name} loads`, async ({ page }) => {
    await openAndLoad(page, s.path, s.api);
    await expect(page).toHaveURL(s.url ?? new RegExp(s.path));
    await expect(page.locator("h1").first()).toBeVisible();
  });
}
