import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// The Groups page shares the church's public /groups page, and each group's banner shares that
// group's public page (B1 site /mobile/groups/{slug}), where visitors join or ask to join.

const GROUP_ID = "GRP00000004"; // Adult Bible Class
const GROUP_SLUG = "adult-bible-class";

test.describe("Sharing group links", () => {
  test("the Groups page header shares the public groups page", async ({ page }) => {
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/groups");
    await page.getByTestId("share-groups-page-button").click();
    const dialog = page.getByTestId("groups-share-dialog");
    await expect(dialog).toBeVisible();
    await expect(page.getByTestId("groups-share-canvas")).toBeVisible();
    await expect(page.getByTestId("groups-share-url")).toHaveText(/^https?:\/\/grace\..+\/groups$/);
    await page.getByTestId("groups-share-copy").click();
    await expect(page.getByTestId("groups-share-copied")).toBeVisible();
    await page.getByTestId("groups-share-close").click();
    await expect(dialog).toBeHidden();
  });

  test("a group's banner shares that group's public page", async ({ page }) => {
    await page.goto(`/groups/${GROUP_ID}`);
    await page.getByTestId("share-group-button").click();
    const dialog = page.getByTestId("group-share-dialog");
    await expect(dialog).toContainText("Adult Bible Class");
    await expect(page.getByTestId("group-share-canvas")).toBeVisible();
    await expect(page.getByTestId("group-share-url")).toHaveText(new RegExp(`^https?://grace\\..+/mobile/groups/${GROUP_SLUG}$`));
    await page.screenshot({ path: ".pr-screenshots/after.png", animations: "disabled" });
  });
});
