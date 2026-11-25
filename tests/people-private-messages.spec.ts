import { test, expect, request as pwRequest, type APIRequestContext } from "@playwright/test";
import { SEED_PEOPLE, openPersonRow, personDetailsEditButton } from "./helpers/fixtures";

// ChurchAppsSupport#1680: an admin can turn off private messages for one person from Personal Details.
// The Api then reports allowDirectMessages=false for that person, which is what hides the Message
// button in the member app, and refuses a new private conversation in either direction.
const API = process.env.API_BASE || "http://localhost:8084";
const DONALD_ID = "PER00000080"; // Donald Clark, demo seed adult (b. 1975)

async function adminHeaders(ctx: APIRequestContext) {
  const login = await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  const body = await login.json();
  const uc = (body.userChurches || []).find((c: { church?: { id?: string } }) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
  const jwt = uc?.apis?.find((a: { keyName?: string }) => a.keyName === "MembershipApi")?.jwt || uc?.jwt;
  return { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" };
}

async function loadDonald(ctx: APIRequestContext, headers: Record<string, string>) {
  const res = await ctx.get(`${API}/membership/people/${DONALD_ID}`, { headers });
  expect(res.ok()).toBeTruthy();
  return res.json();
}

async function setFlag(ctx: APIRequestContext, headers: Record<string, string>, value: boolean) {
  const person = await loadDonald(ctx, headers);
  person.disablePrivateMessages = value;
  const res = await ctx.post(`${API}/membership/people/`, { headers, data: [person] });
  expect(res.ok()).toBeTruthy();
}

test.describe.serial("People - Disable private messages", () => {
  test.afterAll(async () => {
    const ctx = await pwRequest.newContext();
    await setFlag(ctx, await adminHeaders(ctx), false);
    await ctx.dispose();
  });

  test("admin checks Disable private messages on Personal Details and the Api stops the person's messaging", async ({ page }) => {
    await page.goto("/people");
    await page.waitForSelector("table", { state: "visible" });
    await openPersonRow(page, SEED_PEOPLE.DONALD);
    await personDetailsEditButton(page).click();
    const form = page.locator("#personDetailsBox");
    const checkbox = form.getByLabel("Disable private messages");
    await expect(checkbox).toBeVisible({ timeout: 10000 });
    await expect(checkbox).not.toBeChecked();

    const saved = page.waitForResponse((r) => r.url().includes("/membership/people") && r.request().method() === "POST" && r.status() === 200, { timeout: 10000 });
    await checkbox.check();
    await form.getByRole("button", { name: "Save" }).click();
    await saved;

    // The profile tags the person so staff can see why messaging is off.
    await expect(page.getByTestId("person-no-private-messages")).toBeVisible({ timeout: 10000 });

    // The Api stores the flag and derives allowDirectMessages=false, which hides the Message button in the app.
    const ctx = await pwRequest.newContext();
    const headers = await adminHeaders(ctx);
    const donald = await loadDonald(ctx, headers);
    expect(donald.disablePrivateMessages).toBeTruthy();
    expect(donald.allowDirectMessages).toBe(false);
    await ctx.dispose();
  });

  test("the tag survives a reload and unchecking turns messaging back on", async ({ page }) => {
    await page.goto("/people");
    await page.waitForSelector("table", { state: "visible" });
    await openPersonRow(page, SEED_PEOPLE.DONALD);
    await expect(page.getByTestId("person-no-private-messages")).toBeVisible({ timeout: 10000 });

    await personDetailsEditButton(page).click();
    const form = page.locator("#personDetailsBox");
    const checkbox = form.getByLabel("Disable private messages");
    await expect(checkbox).toBeChecked();
    const saved = page.waitForResponse((r) => r.url().includes("/membership/people") && r.request().method() === "POST" && r.status() === 200, { timeout: 10000 });
    await checkbox.uncheck();
    await form.getByRole("button", { name: "Save" }).click();
    await saved;

    await expect(page.getByTestId("person-no-private-messages")).toHaveCount(0);
    const ctx = await pwRequest.newContext();
    const headers = await adminHeaders(ctx);
    const donald = await loadDonald(ctx, headers);
    expect(donald.disablePrivateMessages).toBeFalsy();
    expect(donald.allowDirectMessages).toBe(true);
    await ctx.dispose();
  });
});
