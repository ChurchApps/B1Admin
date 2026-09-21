import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";
import { STORAGE_STATE_PATH } from "./global-setup";

// Issue #1045: a Service Order heading carries one position for the whole plan, so a plan that
// runs two services from one order shows the same volunteer beside the heading in both views.
// Churches split the role per service ("Worship Leader AM" / "Worship Leader PM"), so the
// heading needs to resolve a position per service time — the one the "Viewing as" picker selects.
const DEMO_PLAN = "/serving/plans/PLA00000001";

// Demo seed: POS00000001 "Worship Leader" is filled by Michael Davis, POS00000002
// "Acoustic Guitar" by David Lopez. Two positions, two people, one shared "Worship" heading.
const DEFAULT_POSITION = "Worship - Worship Leader";
const DEFAULT_VOLUNTEER = "Michael Davis";
const PER_SERVICE_POSITION = "Worship - Acoustic Guitar";
const PER_SERVICE_VOLUNTEER = "David Lopez";

test.describe("issue-1045 per-service position on a Service Order heading", () => {
  test.describe.configure({ retries: 0 });

  test("the heading shows each service's own volunteer as Viewing as changes", async ({ browser }) => {
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const page = await context.newPage();
    try {
      await login(page);
      await page.goto(DEMO_PLAN);

      // The demo plan ships with one service time; a second one is what makes the
      // per-service choice meaningful (and is what the "Include in services" list needs).
      const addTime = page.locator('[data-testid="add-time-button"]');
      await expect(addTime).toBeVisible({ timeout: 15000 });
      await addTime.click();
      await page.locator('[name="displayName"]').fill("Second Service");
      await page.locator("button").getByText("Save").last().click();
      await expect(page.locator("td button").getByText("Second Service")).toHaveCount(1, { timeout: 15000 });

      const serviceOrderTab = page.locator('[role="tab"]').getByText("Service Order");
      await expect(serviceOrderTab).toBeVisible({ timeout: 15000 });
      await serviceOrderTab.click();

      const worshipHeader = page.locator(".planItemHeader").filter({ hasText: "Worship" }).first();
      await expect(worshipHeader).toBeVisible({ timeout: 15000 });
      await worshipHeader.getByLabel("Edit section").click();

      const dialog = page.getByRole("dialog");
      await expect(dialog.getByText("Include in services")).toBeVisible({ timeout: 15000 });

      // Default position for the heading, used by any service without its own override.
      await dialog.locator('[data-testid="plan-item-position-select"]').click();
      await page.getByRole("option", { name: DEFAULT_POSITION, exact: true }).click();

      // Override just the second service's position.
      const secondServiceRow = dialog.locator(".serviceTimeSettingRow").filter({ hasText: "Second Service" });
      await expect(secondServiceRow).toHaveCount(1, { timeout: 15000 });
      await secondServiceRow.getByRole("combobox").click();
      await page.getByRole("option", { name: PER_SERVICE_POSITION, exact: true }).click();

      await dialog.getByRole("button", { name: /^Save$/ }).click();
      await expect(dialog).toHaveCount(0, { timeout: 15000 });

      // Role-scoped: a closed MUI menu stays mounted, so the label alone also matches its listbox.
      const viewingAs = page.getByRole("combobox", { name: /Viewing as/ });

      await viewingAs.click();
      await page.getByRole("option", { name: /Second Service/ }).click();
      await expect(worshipHeader.locator(".planItemPosition")).toHaveText(PER_SERVICE_VOLUNTEER, { timeout: 15000 });

      await viewingAs.click();
      await page.getByRole("option", { name: /Sunday Service/ }).click();
      await expect(worshipHeader.locator(".planItemPosition")).toHaveText(DEFAULT_VOLUNTEER, { timeout: 15000 });
    } finally {
      await context.close();
    }
  });
});
