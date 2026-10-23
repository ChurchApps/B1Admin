import { loggedInTest as test, expect } from "./helpers/test-fixtures";
import { SEED_PEOPLE, openPersonRow } from "./helpers/fixtures";
import { navigateToPeople } from "./helpers/navigation";

// Issue #1342: small wording and display fixes in B1Admin.

test.describe("Issue #1342", () => {
  test("search bar Create a group does not call it the first group", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("command-palette-open").click();
    const palette = page.getByTestId("command-palette");
    await palette.getByRole("textbox").fill("Create a group");
    await expect(palette.getByRole("button", { name: /Create a group/ })).toBeVisible();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Group Name").first()).toBeVisible({ timeout: 10000 });
    await expect(dialog).toContainText("Create a Group");
    await expect(dialog).not.toContainText("First Group");
  });

  test("one pending approval reads in the singular", async ({ page }) => {
    await page.route("**/events/pending", (route) => route.fulfill({ json: [{ id: "e1", title: "Pending event" }] }));
    await page.route("**/eventBookings/pending", (route) => route.fulfill({ json: [] }));
    await page.route("**/groupjoinrequests/pending", (route) => route.fulfill({ json: [{ id: "r1" }] }));
    await page.goto("/");
    const card = page.getByTestId("needs-attention");
    await expect(card).toContainText("1 pending calendar approval", { timeout: 15000 });
    await expect(card).not.toContainText("approvals");
    await expect(card).not.toContainText("requests");
  });

  test("subject hint uses the double-brace merge fields the sender fills in", async ({ page }) => {
    await page.goto("/settings/email-templates");
    await page.getByTestId("new-email-template-button").click();
    await expect(page.getByLabel("Subject")).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder("e.g. Hello {{firstName}}, welcome to {{churchName}}")).toBeVisible({ timeout: 10000 });
  });

  test("an unchecked switch track has at least 3:1 contrast on white", async ({ page }) => {
    await page.goto("/mobile/checkin");
    const track = page.locator(".MuiSwitch-root").first().locator(".MuiSwitch-track");
    await expect(track).toBeVisible({ timeout: 15000 });
    const checkbox = page.locator(".MuiSwitch-root").first().locator("input");
    if (await checkbox.isChecked()) await checkbox.click();
    await expect(checkbox).not.toBeChecked();
    const ratio = await track.evaluate((el) => {
      const s = getComputedStyle(el);
      const [r, g, b, a = 1] = (s.backgroundColor.match(/[\d.]+/g) || []).map(Number);
      const alpha = a * Number(s.opacity);
      const mix = (c: number) => (c * alpha + 255 * (1 - alpha)) / 255;
      const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
      const L = 0.2126 * lin(mix(r)) + 0.7152 * lin(mix(g)) + 0.0722 * lin(mix(b));
      return 1.05 / (L + 0.05);
    });
    expect(ratio).toBeGreaterThanOrEqual(3);
  });

  test("email window does not show the editor before the review check returns", async ({ page }) => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => { release = resolve; });
    await page.route("**/emailTemplates/sendStatus", async (route) => {
      await gate;
      await route.fulfill({ json: { approved: false, paused: false, remaining: 0 } });
    });
    await navigateToPeople(page);
    await openPersonRow(page, SEED_PEOPLE.DONALD);
    await page.locator('[data-testid="email-person-button"]').click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("dialog").getByLabel("Subject")).toHaveCount(0);
    release();
    await expect(page.getByTestId("request-email-review")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("dialog").getByLabel("Subject")).toHaveCount(0);
  });
});
