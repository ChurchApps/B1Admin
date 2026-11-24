import type { Page } from "@playwright/test";
import { peopleTest as test, expect } from "./helpers/test-fixtures";

// Advanced search "has not donated": the donors in the date range are excluded and everyone else is kept.
// The Member Donations filter loads the range's donations, then asks the Api for people whose id is not among the donors.
const FROM = "2000-01-01";

interface Donation { donation?: { personId?: string | null } }
interface Person { id: string }

async function addNotDonatedFilter(page: Page, typeLabel: string, fundName?: string) {
  await page.locator("#peopleSearch").getByRole("button", { name: "Advanced", exact: true }).click();
  const activity = page.locator(".MuiAccordion-root").filter({ hasText: "Activity" });
  await activity.getByText("Activity", { exact: true }).click();
  const donations = activity.getByText("Member Donations", { exact: true }).locator('xpath=preceding-sibling::span//input[@type="checkbox"]');
  await expect(donations).toBeVisible({ timeout: 10000 });
  await donations.check();

  const dialog = page.getByRole("dialog").filter({ hasText: "Member Donations" });
  await expect(dialog).toBeVisible({ timeout: 10000 });
  await dialog.getByRole("combobox", { name: "Type" }).click();
  await page.getByRole("option", { name: typeLabel, exact: true }).click();
  if (fundName) {
    await dialog.getByRole("combobox", { name: "Fund" }).click();
    await page.getByRole("option", { name: fundName, exact: true }).click();
  }
  await dialog.getByLabel("From").fill(FROM);

  const donationsLoaded = page.waitForResponse((r) => r.url().includes("/giving/funddonations") && r.status() === 200, { timeout: 15000 });
  const searched = page.waitForResponse((r) => r.url().includes("/people/advancedSearch") && r.status() === 200, { timeout: 15000 });
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  const donors = new Set(((await (await donationsLoaded).json()) as Donation[]).map((d) => d.donation?.personId).filter(Boolean) as string[]);
  const searchResponse = await searched;
  return { donors, request: searchResponse.request().postDataJSON() as { field: string; operator: string; value: string }[], people: (await searchResponse.json()) as Person[] };
}

test.describe("People search: has not donated", () => {
  test("excludes everyone who gave in the range and keeps the people who did not", async ({ page }) => {
    const { donors, request, people } = await addNotDonatedFilter(page, "has not donated (in general)");
    expect(donors.size).toBeGreaterThan(0);
    const condition = request.find((c) => c.field === "id");
    expect(condition?.operator).toBe("notIn");
    expect(people.length).toBeGreaterThan(0);
    expect(people.filter((p) => donors.has(p.id))).toEqual([]);
    await expect(page.locator("#peopleSearch").getByRole("button", { name: "Not donated: Any" })).toBeVisible();
  });

  test("limits the exclusion to one fund", async ({ page }) => {
    const { donors, request, people } = await addNotDonatedFilter(page, "has not donated to", "Building Fund");
    expect(request.find((c) => c.field === "id")?.operator).toBe("notIn");
    expect(people.filter((p) => donors.has(p.id))).toEqual([]);
    await expect(page.locator("#peopleSearch").getByRole("button", { name: "Not donated: Building Fund" })).toBeVisible();
  });
});
