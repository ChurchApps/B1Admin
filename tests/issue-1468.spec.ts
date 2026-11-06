import fs from "fs";
import { type Page } from "@playwright/test";
import { groupsTest as test, expect } from "./helpers/test-fixtures";
import { openSeedGroup, SESSION_GROUP } from "./helpers/fixtures";

// Issue #1468: the Export on a group attendance session leaves out the Session Notes.

async function selectSession(page: Page, date: string) {
  const [y, m, d] = date.split("-");
  await page.getByTestId("session-year-pills").getByRole("button", { name: y, exact: true }).click({ timeout: 10000 });
  const item = page.getByRole("button").filter({ hasText: `${m}/${d}/${y}` }).first();
  await item.click({ timeout: 10000 });
  await expect(item).toContainText("Active", { timeout: 10000 });
}

test("session export CSV includes the session notes", async ({ page }) => {
  const date = "2025-09-05";
  await openSeedGroup(page, SESSION_GROUP);
  await page.getByTestId("group-all-sessions").click();
  await page.locator("button").getByText("New").first().click();
  const box = page.locator('[data-cy="add-session-box"]');
  await box.locator('[data-testid="session-date-input"] input').fill(date);
  await box.locator(".editor-input[contenteditable='true']").first().click();
  await page.keyboard.type("Topic Romans 9 and prayer for Donald Clark");
  await box.getByRole("button", { name: "Save", exact: true }).click();
  await selectSession(page, date);
  await expect(page.getByTestId("session-notes")).toContainText("Romans 9", { timeout: 10000 });

  // The export only appears once someone has been marked present.
  await page.getByTestId("attendance-select-all").click();
  await page.getByTestId("save-attendance-button").click();
  await expect(page.getByTestId("attendance-save-message")).toHaveText("Attendance saved.", { timeout: 10000 });

  // ExportLink lazy-loads react-csv; wait for the real <a download> wrapper.
  const exportLink = page.locator('a[download$="_visits.csv"]');
  await expect(exportLink).toBeVisible({ timeout: 15000 });
  const [download] = await Promise.all([page.waitForEvent("download", { timeout: 15000 }), exportLink.click()]);
  const content = fs.readFileSync((await download.path())!, "utf-8").replace(/^\uFEFF/, "");
  const header = content.split("\n")[0];
  expect(header).toContain("sessionNotes");
  expect(content).toContain("Topic Romans 9 and prayer for Donald Clark");
});
