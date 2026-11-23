import { request, type APIRequestContext } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";
import { personDetailsEditButton } from "./helpers/fixtures";

// How a person's record reads: phone numbers keep their usual format and the notes count agrees in number.
const API = process.env.API_BASE || "http://localhost:8084";

test.describe("Person record display", () => {
  let ctx: APIRequestContext;
  let auth: { headers: { Authorization: string } };
  let personId: string;
  const last = "Zzrecord" + Date.now();

  test.beforeAll(async () => {
    ctx = await request.newContext();
    const loginRes = await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
    const body = await loginRes.json();
    const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001");
    auth = { headers: { Authorization: "Bearer " + uc.jwt } };
    const household = (await (await ctx.post(`${API}/membership/households`, { ...auth, data: [{ name: last }] })).json())[0];
    const person = {
      householdId: household.id,
      name: { first: "Rhoda", last, display: "Rhoda " + last },
      contactInfo: { homePhone: "(217) 555-0188", workPhone: "+1 217 555 0189", mobilePhone: "(217) 555-0187" }
    };
    personId = (await (await ctx.post(`${API}/membership/people`, { ...auth, data: [person] })).json())[0].id;
  });

  test.afterAll(async () => {
    if (personId) await ctx.delete(`${API}/membership/people/${personId}`, auth);
    await ctx.dispose();
  });

  test("phone numbers show in one format, whatever style is stored", async ({ page }) => {
    await page.goto("/people/" + personId);
    const contact = page.getByTestId("person-contact");
    await expect(contact).toContainText("Home (217) 555-0188");
    await expect(contact).toContainText("Work (217) 555-0189");
  });

  // ChurchAppsSupport#1661: saving an unrelated field must not rewrite the phones as bare digits.
  test("saving only Marital Status leaves phone numbers formatted", async ({ page }) => {
    await page.goto("/people/" + personId);
    await personDetailsEditButton(page).first().click();
    await page.getByTestId("marital-status-select").click();
    await page.getByRole("option", { name: "Married" }).click();
    const saved = page.waitForResponse((r) => r.url().includes("/membership/people") && r.request().method() === "POST" && r.ok());
    await page.locator("button").getByText("Save").click();
    await saved;
    await page.reload();
    const contact = page.getByTestId("person-contact");
    await expect(contact).toContainText("Home (217) 555-0188");
    await expect(contact).toContainText("Work (217) 555-0189");
    await expect(contact).toContainText("(217) 555-0187");
  });

  test("a single note reads \"1 note\"", async ({ page }) => {
    await page.goto("/people/" + personId);
    await page.getByTestId("person-notes-all").click();
    const notesBox = page.getByTestId("notes-box");
    const composer = notesBox.locator('textarea[name="noteText"]').first();
    await composer.fill("Only note " + Date.now());
    const saved = page.waitForResponse((r) => r.url().includes("/messaging/messages") && r.request().method() === "POST" && r.ok());
    await notesBox.locator("button").filter({ has: page.locator('text="send"') }).last().click();
    await saved;
    await page.getByTestId("person-record-back").click();
    await expect(page.getByTestId("person-notes-section")).toContainText("1 note");
    await expect(page.getByTestId("person-notes-section")).not.toContainText("1 notes");
  });

  // ChurchAppsSupport#1600: staff who can send texts turn Text reminders on for the person from the record.
  test("Text reminders can be turned on from the record and stay on", async ({ page }) => {
    await page.goto("/people/" + personId);
    const line = page.getByTestId("person-text-reminders");
    await expect(line).toContainText("Text reminders Off", { timeout: 15000 });
    const saved = page.waitForResponse((r) => r.url().includes(`/messaging/notificationpreferences/person/${personId}/sms`) && r.request().method() === "POST" && r.ok());
    await line.getByRole("button", { name: "Turn on" }).click();
    await saved;
    await expect(line).toContainText("Text reminders On");
    await page.reload();
    await expect(page.getByTestId("person-text-reminders")).toContainText("Text reminders On", { timeout: 15000 });
    await expect(page.getByTestId("person-text-reminders").getByRole("button", { name: "Turn off" })).toBeVisible();
  });
});
