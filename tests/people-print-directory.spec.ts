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

const withContact = (p: PersonInterface, contactInfo: PersonInterface["contactInfo"]): PersonInterface => ({ ...p, contactInfo });

test.describe("Print directory member order and contact lines", () => {
  test("orders members Head, Spouse, Child regardless of name or birth date", () => {
    const people = [
      person({ id: "c", first: "Amy", last: "Clark", householdId: "h", householdRole: "Child" }),
      person({ id: "s", first: "Carol", last: "Clark", householdId: "h", householdRole: "Spouse" }),
      person({ id: "h1", first: "Donald", last: "Clark", householdId: "h", householdRole: "Head" })
    ];
    const result = buildHouseholds(people);
    expect(result[0].members.map((m) => m.name?.first)).toEqual(["Donald", "Carol", "Amy"]);
  });

  test("names a couple Head & Spouse even when the spouse is older", () => {
    const people = [
      person({ id: "s", first: "Carol", last: "Clark", householdId: "h", householdRole: "Spouse", birthDate: "1960-01-01" }),
      person({ id: "h1", first: "Donald", last: "Clark", householdId: "h", householdRole: "Head", birthDate: "1980-01-01" })
    ];
    expect(buildHouseholds(people)[0].displayName).toBe("Donald & Carol Clark");
  });

  test("puts older children first", () => {
    const people = [
      person({ id: "a", first: "Young", last: "Clark", householdId: "h", householdRole: "Child", birthDate: "2015-01-01" }),
      person({ id: "b", first: "Old", last: "Clark", householdId: "h", householdRole: "Child", birthDate: "2010-01-01" })
    ];
    expect(buildHouseholds(people)[0].members.map((m) => m.name?.first)).toEqual(["Old", "Young"]);
  });

  test("lists each member's phones and emails once, shared values without a name", () => {
    const people = [
      withContact(person({ id: "h1", first: "Donald", last: "Clark", householdId: "h", householdRole: "Head" }), { homePhone: "(555) 010-1000", mobilePhone: "555-010-2000", email: "family@example.com" }),
      withContact(person({ id: "s", first: "Carol", last: "Clark", householdId: "h", householdRole: "Spouse" }), { homePhone: "555.010.1000", mobilePhone: "555-010-3000", email: "Family@Example.com " })
    ];
    const h = buildHouseholds(people)[0];
    expect(h.phones).toEqual([
      { value: "(555) 010-1000" },
      { name: "Donald", value: "555-010-2000" },
      { name: "Carol", value: "555-010-3000" }
    ]);
    expect(h.emails).toEqual([{ value: "family@example.com" }]);
  });

  test("a single-person household prints bare values", () => {
    const people = [withContact(person({ id: "x", first: "Jamie", last: "Solo" }), { mobilePhone: "555-010-4000", workPhone: "555-010-5000", email: "jamie@example.com" })];
    const h = buildHouseholds(people)[0];
    expect(h.phones).toEqual([{ value: "555-010-4000" }, { value: "555-010-5000" }]);
    expect(h.emails).toEqual([{ value: "jamie@example.com" }]);
  });
});

peopleTest.describe("Print directory per-member contact details", () => {
  peopleTest("prints every member's phone and email on its own line in household order", async ({ page }) => {
    await page.addInitScript(() => { window.print = () => {}; });
    const people = [
      withContact(person({ id: "p-carol", first: "Carol", last: "Clark", householdId: "h-clark", householdRole: "Spouse", birthDate: "1975-02-01T00:00:00.000Z" }), { homePhone: "555-010-1000", mobilePhone: "555-010-3000", email: "carol@example.com" }),
      withContact(person({ id: "p-donald", first: "Donald", last: "Clark", householdId: "h-clark", householdRole: "Head", birthDate: "1980-04-12T00:00:00.000Z" }), { homePhone: "555-010-1000", mobilePhone: "555-010-2000", email: "donald@example.com" })
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

    await page.goto("/people/print-directory");
    await expect(page.locator(".household-name")).toContainText("Clark", { timeout: 15000 });
    if (process.env.PR_SCREENSHOT) await page.screenshot({ path: process.env.PR_SCREENSHOT, fullPage: true });
    await expect(page.locator(".household-name")).toHaveText("Donald & Carol Clark");
    await expect(page.getByTestId("print-directory-phone-line")).toHaveText(["555-010-1000", "Donald: 555-010-2000", "Carol: 555-010-3000"]);
    await expect(page.getByTestId("print-directory-email-line")).toHaveText(["Donald: donald@example.com", "Carol: carol@example.com"]);
  });
});
