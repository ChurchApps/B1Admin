import type { Page } from "@playwright/test";
import { peopleTest as test, expect } from "./helpers/test-fixtures";
import { siblingNav } from "./helpers/navigation";
import { SEED_PEOPLE, openPersonRow } from "./helpers/fixtures";

// Notes page (ChurchAppsSupport#1334): one read-only list of notes across people, groups, events and
// workflow cards, each linking back to where the note lives.

async function addPersonNote(page: Page, text: string) {
  await openPersonRow(page, SEED_PEOPLE.DONALD);
  await page.getByTestId("person-notes-all").click();
  const notesBox = page.getByTestId("notes-box");
  const composer = notesBox.locator('textarea[name="noteText"]').first();
  await composer.fill(text);
  const saved = page.waitForResponse((r) => r.url().includes("/messaging/messages") && r.request().method() === "POST" && r.ok());
  await notesBox.locator("button").filter({ has: page.locator('text="send"') }).last().click();
  await saved;
  await expect(notesBox.getByText(text)).toBeVisible();
}

test.describe("People - Notes page", () => {
  test("lists a new person note with its author and links back to the person", async ({ page }) => {
    const text = `Hospital visit follow-up ${Date.now()}`;
    await addPersonNote(page, text);
    const personUrl = new URL(page.url()).pathname;

    await page.goto("/people");
    await (await siblingNav(page)).getByText("Notes", { exact: true }).first().click();
    await page.waitForURL(/\/people\/notes$/);

    await expect(page.getByRole("heading", { name: "Notes" })).toBeVisible();
    await expect(page.getByTestId("notes-tab-people")).toHaveAttribute("aria-selected", "true");
    const row = page.getByTestId("notes-list-people").locator("li").filter({ hasText: text });
    await expect(row).toBeVisible();
    await expect(row).toContainText(SEED_PEOPLE.DONALD);
    await expect(row).toContainText("By Demo User");

    await page.screenshot({ path: ".pr-screenshots/after.png" });

    await row.getByTestId("notes-source-link").click();
    await expect(page).toHaveURL(new RegExp(personUrl + "\\?view=notes"));
    await expect(page.getByTestId("notes-box").getByText(text)).toBeVisible();
  });

  test("has a tab per note section with an empty state", async ({ page }) => {
    await page.goto("/people/notes");
    for (const tab of ["groups", "events", "workflows"]) {
      await page.getByTestId("notes-tab-" + tab).click();
      await expect(page.getByTestId("notes-tab-" + tab)).toHaveAttribute("aria-selected", "true");
    }
    await expect(page.getByText("No workflow card notes you can view yet.")).toBeVisible();
  });
});
