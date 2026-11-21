import { test, expect } from "@playwright/test";
import { peopleTest } from "./helpers/test-fixtures";
import { type PersonInterface } from "@churchapps/helpers";
import { buildHouseholds } from "../src/people/buildHouseholds";

const person = (opts: { id: string; first: string; last: string; householdId?: string; householdRole?: string; birthDate?: string; membershipStatus?: string }): PersonInterface => ({
  id: opts.id,
  householdId: opts.householdId,
  householdRole: opts.householdRole,
  birthDate: opts.birthDate,
  membershipStatus: opts.membershipStatus || "Member",
  name: { first: opts.first, last: opts.last, display: `${opts.first} ${opts.last}` },
  contactInfo: {}
});

const blendedFamily = () => [
  person({ id: "p-abe", first: "Alex", last: "Abrahams", householdId: "h-blend" }),
  person({ id: "p-pat", first: "Pat", last: "Crouch", householdId: "h-blend", householdRole: "Head" }),
  person({ id: "p-sam", first: "Sam", last: "Crouch", householdId: "h-blend" })
];

test.describe("Issue 983: print directory household names", () => {
  test("uses the stored household name for a blended family", () => {
    const result = buildHouseholds(blendedFamily(), new Map([["h-blend", "Crouch"]]));
    expect(result).toHaveLength(1);
    expect(result[0].displayName).toBe("The Crouch Family");
    expect(result[0].sortName).toBe("crouch");
    expect(result[0].letter).toBe("C");
  });

  test("does not pick the alphabetically-first surname when a stored name exists", () => {
    const people = [
      person({ id: "p-abe", first: "Alex", last: "Abrahams", householdId: "h-blend" }),
      person({ id: "p-pat", first: "Pat", last: "Crouch", householdId: "h-blend" }),
      person({ id: "p-sam", first: "Sam", last: "Crouch", householdId: "h-blend" })
    ];
    const withoutStored = buildHouseholds(people);
    expect(withoutStored[0].displayName).toBe("The Abrahams Family");

    const withStored = buildHouseholds(people, new Map([["h-blend", "Crouch"]]));
    expect(withStored[0].displayName).toBe("The Crouch Family");
  });

  test("falls back to the Head member surname when the stored name is blank", () => {
    const result = buildHouseholds(blendedFamily(), new Map([["h-blend", "   "]]));
    expect(result[0].displayName).toBe("The Crouch Family");
  });

  test("falls back to the oldest-member surname when there is no Head and no stored name", () => {
    const people = [
      person({ id: "1", first: "Alex", last: "Abrahams", householdId: "h1", birthDate: "2010-01-01" }),
      person({ id: "2", first: "Pat", last: "Crouch", householdId: "h1", birthDate: "1975-01-01" })
    ];
    const result = buildHouseholds(people);
    expect(result[0].displayName).toBe("Pat & Alex Crouch");
  });

  test("uses a solo person's own name when householdId is missing", () => {
    const people = [person({ id: "solo1", first: "Jamie", last: "Solo" })];
    const result = buildHouseholds(people, new Map([["other", "Crouch"]]));
    expect(result).toHaveLength(1);
    expect(result[0].displayName).toBe("Jamie Solo");
  });
});

peopleTest.describe("Issue 983: print directory page", () => {
  peopleTest("renders the stored household name on the print directory", async ({ page }) => {
    await page.addInitScript(() => { window.print = () => {}; });

    const people = blendedFamily();
    await page.route("**/membership/people", async (route) => {
      if (route.request().method() !== "GET") return route.continue();
      const url = route.request().url();
      if (/\/people\/.+/.test(url)) return route.continue();
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(people) });
    });
    await page.route("**/membership/households", async (route) => {
      if (route.request().method() !== "GET") return route.continue();
      const url = route.request().url();
      if (/\/households\/.+/.test(url)) return route.continue();
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ id: "h-blend", name: "Crouch" }]) });
    });

    await page.goto("/people/print-directory");
    await expect(page.locator(".household-name")).toContainText("The Crouch Family", { timeout: 15000 });
    await expect(page.locator(".household-name")).not.toContainText("Abrahams");
  });
});

const stubDirectory = async (page: import("@playwright/test").Page) => {
  const people = [
    person({ id: "p-donald", first: "Donald", last: "Clark", householdId: "h-clark", householdRole: "Head", birthDate: "1980-04-12T00:00:00.000Z" }),
    person({ id: "p-carol", first: "Carol", last: "Clark", householdId: "h-clark" })
  ];
  await page.route("**/membership/people", async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    if (/\/people\/.+/.test(route.request().url())) return route.continue();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(people) });
  });
  await page.route("**/membership/households", async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    if (/\/households\/.+/.test(route.request().url())) return route.continue();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ id: "h-clark", name: "Clark" }]) });
  });
};

peopleTest.describe("Print directory field options", () => {
  peopleTest("unchecking Birthdays hides them and remembers the choice", async ({ page }) => {
    await page.addInitScript(() => { window.print = () => {}; });
    await stubDirectory(page);

    await page.goto("/people/print-directory");
    await expect(page.locator(".household-name")).toContainText("Clark", { timeout: 15000 });
    const birthdays = page.getByTestId("print-directory-option-birthdays");
    await expect(birthdays).toBeChecked();
    await expect(page.locator(".detail-label", { hasText: "Birthdays" })).toHaveCount(1);

    await birthdays.click();
    await expect(birthdays).not.toBeChecked();
    await expect(page.locator(".detail-label", { hasText: "Birthdays" })).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem("printDirectoryOptions"))).toContain("\"birthdays\":false");
  });

  peopleTest("does not print on its own; the Print button prints", async ({ page }) => {
    await page.addInitScript(() => { (window as unknown as { __printed: boolean }).__printed = false; window.print = () => { (window as unknown as { __printed: boolean }).__printed = true; }; });
    await stubDirectory(page);

    await page.goto("/people/print-directory");
    await expect(page.locator(".household-name")).toContainText("Clark", { timeout: 15000 });
    // The old page printed itself 1.5 s after loading; give it longer than that.
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 2500)));
    expect(await page.evaluate(() => (window as unknown as { __printed: boolean }).__printed)).toBe(false);
    await expect(page).toHaveURL(/print-directory/);

    await page.getByTestId("print-directory-print-button").click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { __printed: boolean }).__printed)).toBe(true);
  });

  peopleTest("restores saved choices on reload", async ({ page }) => {
    await page.addInitScript(() => {
      window.print = () => {};
      localStorage.setItem("printDirectoryOptions", JSON.stringify({ birthdays: false }));
    });
    await stubDirectory(page);

    await page.goto("/people/print-directory");
    await expect(page.locator(".household-name")).toContainText("Clark", { timeout: 15000 });
    await expect(page.getByTestId("print-directory-option-birthdays")).not.toBeChecked();
    await expect(page.getByTestId("print-directory-option-photos")).toBeChecked();
    await expect(page.locator(".detail-label", { hasText: "Birthdays" })).toHaveCount(0);
    await expect(page.locator(".member-photos")).toHaveCount(1);
  });
});
