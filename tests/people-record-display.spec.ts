import { request, type APIRequestContext } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

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
      contactInfo: { homePhone: "(217) 555-0188", workPhone: "+1 217 555 0189" }
    };
    personId = (await (await ctx.post(`${API}/membership/people`, { ...auth, data: [person] })).json())[0].id;
  });

  test.afterAll(async () => {
    if (personId) await ctx.delete(`${API}/membership/people/${personId}`, auth);
    await ctx.dispose();
  });

  test("phone numbers keep their format: no dash after the area code's parenthesis", async ({ page }) => {
    await page.goto("/people/" + personId);
    const contact = page.getByTestId("person-contact");
    await expect(contact).toContainText("Home (217) 555-0188");
    await expect(contact).toContainText("Work +1-217-555-0189");
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
});
