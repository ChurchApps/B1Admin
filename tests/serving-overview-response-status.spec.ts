import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// The serving overview grid marks names that have not answered yet and names that declined.
// A decline still shows, struck through, but its slot counts as open again.
const PLAN = "PLA_TEST_1";
const POS = "POS_TEST_1";
const DATE = (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split("T")[0]; })();

const overviewRow = (assignmentId: string | null, personId: string | null, status: string | null) => ({
  serviceDate: DATE + "T00:00:00.000Z",
  ministryId: "GRP_TEST",
  planId: PLAN,
  planName: "Test Plan",
  positionId: POS,
  categoryName: "Band",
  positionName: "Vocals",
  groupId: null,
  needed: 3,
  assignmentId,
  personId,
  status
});

test.describe("Serving overview response status", () => {
  test.beforeEach(async ({ page }) => {
    // /plans/overview leaves declined assignments out; the page loads them from /assignments/plan/ids.
    await page.route("**/plans/overview?*", (route) => route.fulfill({ json: [overviewRow("ASG1", "PER_A", "Accepted"), overviewRow("ASG2", "PER_P", "Unconfirmed")] }));
    await page.route("**/assignments/plan/ids?*", (route) => route.fulfill({
      json: [
        { id: "ASG1", positionId: POS, personId: "PER_A", status: "Accepted" },
        { id: "ASG2", positionId: POS, personId: "PER_P", status: "Unconfirmed" },
        { id: "ASG3", positionId: POS, personId: "PER_D", status: "Declined" }
      ]
    }));
    await page.route("**/people/ids?*", (route) => route.fulfill({
      json: [
        { id: "PER_A", name: { first: "Avery", last: "Accepts" } },
        { id: "PER_P", name: { first: "Parker", last: "Pends" } },
        { id: "PER_D", name: { first: "Dana", last: "Declines" } }
      ]
    }));
  });

  test("pending and declined names carry a labelled mark, and a decline is an open slot", async ({ page }) => {
    await page.goto("/serving/overview");
    const cell = page.locator(`td[data-testid="matrix-cell-Band: Vocals-${DATE}"]`);
    await expect(cell).toContainText("Dana D.", { timeout: 20000 });
    await expect(cell).toContainText("Avery A.");
    await expect(cell.getByRole("img", { name: "Pending" })).toHaveCount(1);
    await expect(cell.getByRole("img", { name: "Declined" })).toHaveCount(1);
    await expect(page.getByTestId("matrix-status-legend")).toContainText("Declined");

    // 3 needed, 2 still serving: the position is a gap, so "Unfilled only" keeps it.
    await page.getByTestId("gaps-only-toggle").click();
    await expect(page.getByRole("row").filter({ hasText: "Vocals" })).toBeVisible();
  });

  test("the cell editor names each status in text", async ({ page }) => {
    await page.goto("/serving/overview");
    const cell = page.locator(`td[data-testid="matrix-cell-Band: Vocals-${DATE}"]`);
    await expect(cell).toContainText("Dana D.", { timeout: 20000 });
    await cell.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByTestId("matrix-status-PER_D")).toHaveText("Declined");
    await expect(dialog.getByTestId("matrix-status-PER_P")).toHaveText("Pending");
    await expect(dialog.getByTestId("matrix-status-PER_A")).toHaveCount(0);
  });
});
