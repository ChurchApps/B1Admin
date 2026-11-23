import { request as pwRequest, type APIRequestContext } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// A household adult can send changes for a child in the household. Staff reviewing the request
// see who submitted it and for whom, since the requester is not the person being changed.
const API = process.env.API_BASE || "http://localhost:8084";
const CHURCH_ID = "CHU00000001";
const DEMO_PERSON_ID = "PER00000082"; // Demo User, Head of the User Family
const CHILD_ID = "PER00000084"; // Alex User

const auth = (jwt: string) => ({ headers: { Authorization: "Bearer " + jwt } });

async function apiLogin(ctx: APIRequestContext): Promise<string> {
  const res = await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const uc = (body.userChurches || []).find((c: { church?: { id?: string } }) => c.church?.id === CHURCH_ID) || body.userChurches?.[0];
  return uc.jwt as string;
}

async function fileRequest(ctx: APIRequestContext, jwt: string, associatedWithId: string, associatedWithLabel: string): Promise<string> {
  const task = {
    associatedWithType: "person",
    associatedWithId,
    associatedWithLabel,
    createdByType: "person",
    createdById: DEMO_PERSON_ID,
    createdByLabel: "Demo User",
    title: "Profile changes for " + associatedWithLabel,
    status: "Open",
    data: JSON.stringify([{ field: "birthDate", label: "Birth Date", value: "2015-08-21" }])
  };
  const res = await ctx.post(`${API}/doing/tasks?type=directoryUpdate`, { ...auth(jwt), data: [task] });
  expect(res.ok()).toBeTruthy();
  return (await res.json())[0].id as string;
}

test.describe("Requested changes submitted by", () => {
  let ctx: APIRequestContext;
  let jwt: string;
  const created: string[] = [];

  test.beforeAll(async () => {
    ctx = await pwRequest.newContext();
    jwt = await apiLogin(ctx);
  });

  test.afterAll(async () => {
    for (const id of created) await ctx.delete(`${API}/doing/tasks/${id}`, auth(jwt));
    await ctx.dispose();
  });

  test("a household member's request names the submitter and the person", async ({ page }) => {
    const id = await fileRequest(ctx, jwt, CHILD_ID, "Alex User");
    created.push(id);
    await page.goto("/serving/tasks/" + id);
    await expect(page.getByTestId("requested-changes-submitted-by")).toHaveText("Submitted by Demo User for Alex User", { timeout: 15000 });
  });

  test("a member's own request does not repeat the submitter", async ({ page }) => {
    const id = await fileRequest(ctx, jwt, DEMO_PERSON_ID, "Demo User");
    created.push(id);
    await page.goto("/serving/tasks/" + id);
    await expect(page.getByRole("heading", { name: "Requested Changes" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("requested-changes-submitted-by")).toHaveCount(0);
  });
});
