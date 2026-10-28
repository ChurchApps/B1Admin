import { request as pwRequest, type APIRequestContext } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";
import { SEED_GROUP, openSeedGroup } from "./helpers/fixtures";

// ChurchAppsSupport#1384: text templates live in the email templates list under a "Text" category.
test.describe("Text templates", () => {
  test.describe.configure({ retries: 0 });
  const API = process.env.API_BASE || "http://localhost:8084";
  const suffix = Date.now().toString().slice(-6);
  const NAME = "Text Reminder " + suffix;
  const PICK_NAME = "Text Welcome " + suffix;
  const BODY = "Hi {{firstName}}, see you at {{groupName}} Sunday.\nBring a friend!";
  let ctx: APIRequestContext;
  let auth: { headers: { Authorization: string } };

  const deleteTemplate = async () => {
    const list = await (await ctx.get(`${API}/messaging/emailTemplates`, auth)).json();
    for (const t of (list || []).filter((t: any) => t.name === NAME || t.name === PICK_NAME)) await ctx.delete(`${API}/messaging/emailTemplates/CHU00000001/${t.id}`, auth);
  };

  test.beforeAll(async () => {
    ctx = await pwRequest.newContext();
    const loginRes = await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
    expect(loginRes.ok()).toBeTruthy();
    const body = await loginRes.json();
    const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
    auth = { headers: { Authorization: "Bearer " + uc.jwt } };
    await ctx.post(`${API}/messaging/emailTemplates`, { ...auth, data: [{ churchId: "CHU00000001", name: PICK_NAME, subject: "", htmlContent: BODY, category: "Text" }] });
  });

  test.afterAll(async () => {
    await deleteTemplate();
    await ctx.dispose();
  });

  test("a Text template is saved with a plain text body and no subject", async ({ page }) => {
    await page.goto("/settings/email-templates");
    await page.getByTestId("new-email-template-button").click();
    await page.getByLabel("Template Name").fill(NAME);
    await page.getByRole("combobox").filter({ hasText: "General" }).click();
    await page.getByRole("option", { name: "Text", exact: true }).click();
    await expect(page.getByLabel("Subject", { exact: true })).toHaveCount(0);
    await expect(page.locator(".editor-input[contenteditable='true']")).toHaveCount(0);
    await page.getByLabel("Text Message").fill(BODY);
    await page.locator("button").getByText("Save").click();
    await expect(page.getByRole("row", { name: new RegExp(NAME) })).toContainText("Text");

    const list = await (await ctx.get(`${API}/messaging/emailTemplates`, auth)).json();
    const saved = list.find((t: any) => t.name === NAME);
    const full = await (await ctx.get(`${API}/messaging/emailTemplates/${saved.id}`, auth)).json();
    expect(full.category).toBe("Text");
    expect(full.subject).toBe("");
    expect(full.htmlContent).toBe(BODY);
  });

  test("Send Text loads the template; Send Email does not list it", async ({ page }) => {
    await page.route("**/texting/send", (route) => route.fulfill({ json: { totalMembers: 2, recipientCount: 2, successCount: 2, failCount: 0, optedOutCount: 0, noPhoneCount: 0 } }));
    await openSeedGroup(page, SEED_GROUP);
    await page.getByTestId("text-group-button").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Load Template (optional)").click();
    await page.getByRole("option", { name: PICK_NAME }).click();
    await expect(dialog.getByLabel("Message")).toHaveValue(BODY);
    await expect(dialog.getByRole("link", { name: "Manage Templates" })).toHaveAttribute("href", "/settings/email-templates");
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toHaveCount(0);

    await page.route("**/emailTemplates/sendStatus", (route) => route.fulfill({ json: { approved: true, paused: false, remaining: 100 } }));
    await page.getByTestId("email-group-button").click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("combobox").first().click();
    const listbox = page.getByRole("listbox");
    await expect(listbox.getByRole("option").first()).toBeVisible();
    await expect(listbox.getByRole("option", { name: PICK_NAME })).toHaveCount(0);
  });
});
