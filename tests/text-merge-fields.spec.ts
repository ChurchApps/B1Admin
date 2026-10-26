import { peopleTest as test, expect } from "./helpers/test-fixtures";
import { SEED_PEOPLE, SEED_GROUP, openPersonRow, openSeedGroup } from "./helpers/fixtures";

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
    await expect(dialog.getByRole("button", { name: "Group Name" })).toHaveCount(0);

    await dialog.getByRole("button", { name: "Send" }).click();
    await expect(dialog.getByText("Sent to 1 of 1 recipient.")).toBeVisible();
    expect(payload?.message).toBe("Hi {{firstName}}, see you Sunday at {{churchName}}");
  });

  test("group text fills in the group name before sending", async ({ page }) => {
    let payload: any = null;
    await page.route("**/texting/send", async (route) => {
      payload = route.request().postDataJSON();
      await route.fulfill({ json: { totalMembers: 2, recipientCount: 2, successCount: 2, failCount: 0, optedOutCount: 0, noPhoneCount: 0 } });
    });

    await openSeedGroup(page, SEED_GROUP);
    await page.getByTestId("text-group-button").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    const message = dialog.getByLabel("Message");
    await message.fill("Reminder for ");
    await dialog.getByRole("button", { name: "Group Name" }).click();
    await expect(message).toHaveValue("Reminder for {{groupName}}");
    await dialog.getByRole("button", { name: "First Name" }).click();
    await expect(message).toHaveValue("Reminder for {{groupName}}{{firstName}}");

    await dialog.getByRole("button", { name: "Send" }).click();
    await expect(dialog.getByText("Sent to 2 of 2 recipients.")).toBeVisible();
    expect(payload?.groupId).toBeTruthy();
    expect(payload?.message).toBe(`Reminder for ${SEED_GROUP}{{firstName}}`);
  });

  test("group email fills in the group name in subject and body", async ({ page }) => {
    let payload: any = null;
    await page.route("**/emailTemplates/sendStatus", (route) => route.fulfill({ json: { approved: true, paused: false, remaining: 100 } }));
    await page.route("**/emailTemplates/send", async (route) => {
      payload = route.request().postDataJSON();
      await route.fulfill({ json: { totalMembers: 2, recipientCount: 2, successCount: 2, failCount: 0, noEmailCount: 0 } });
    });

    await openSeedGroup(page, SEED_GROUP);
    await page.getByTestId("email-group-button").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    const subject = dialog.getByLabel("Subject");
    await subject.fill("News for ");
    await dialog.getByRole("button", { name: "Group Name" }).first().click();
    await expect(subject).toHaveValue("News for {{groupName}}");
    await dialog.getByRole("button", { name: "Group Name" }).nth(1).click();

    await dialog.getByRole("tab", { name: "Preview" }).click();
    await expect(dialog.getByText(`News for ${SEED_GROUP}`)).toBeVisible();

    await dialog.getByRole("button", { name: "Send" }).click();
    await expect(dialog.getByText("Sent to 2 of 2 recipients.")).toBeVisible();
    expect(payload?.subject).toBe(`News for ${SEED_GROUP}`);
    expect(payload?.htmlContent).toContain(SEED_GROUP);
    expect(payload?.htmlContent).not.toContain("{{groupName}}");
  });
});
