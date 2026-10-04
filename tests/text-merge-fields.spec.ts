import { peopleTest as test, expect } from "./helpers/test-fixtures";
import { SEED_PEOPLE, openPersonRow } from "./helpers/fixtures";

// The demo church has a seeded texting provider; the send itself is stubbed so no SMS leaves the machine.
test.describe("Text dialog merge fields", () => {
  test("inserts placeholders at the cursor and sends the template", async ({ page }) => {
    let payload: any = null;
    await page.route("**/texting/sendPerson", async (route) => {
      payload = route.request().postDataJSON();
      await route.fulfill({ json: { recipientCount: 1, successCount: 1, failCount: 0 } });
    });

    await openPersonRow(page, SEED_PEOPLE.DONALD);
    await page.getByRole("button", { name: "Send text message" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    const message = dialog.getByLabel("Message");
    await message.fill("Hi , see you Sunday at ");
    await message.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(3, 3));
    await dialog.getByRole("button", { name: "First Name" }).click();
    await expect(message).toHaveValue("Hi {{firstName}}, see you Sunday at ");

    await message.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(el.value.length, el.value.length));
    await dialog.getByRole("button", { name: "Church Name" }).click();
    await expect(message).toHaveValue("Hi {{firstName}}, see you Sunday at {{churchName}}");
    await expect(dialog.getByText("Click to insert a placeholder.", { exact: false })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Email" })).toHaveCount(0);

    await dialog.getByRole("button", { name: "Send" }).click();
    await expect(dialog.getByText("Sent to 1 of 1 recipient.")).toBeVisible();
    expect(payload?.message).toBe("Hi {{firstName}}, see you Sunday at {{churchName}}");
  });
});
