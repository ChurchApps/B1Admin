import { request as pwRequest, type APIRequestContext } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// ChurchAppsSupport#1554: a member asking to add a family member can include an email and a photo.
// Staff approving the request create the person with both, and the photo becomes their profile photo.
const API = process.env.API_BASE || "http://localhost:8084";
const CHURCH_ID = "CHU00000001";
const DEMO_PERSON_ID = "PER00000082"; // demo@b1.church
const FIRST = "Zeruiahfamily";
const PHOTO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAwCAIAAAAuKetIAAAAZElEQVR4nO3PUQkAIBTAwBfHOMY2liH8OITBAtzm7PV1wwUNaEEDWtCAFjSgBQ1oQQNa0IAWNKAFDWhBA1rQgBY0oAUNaEEDWtCAFjSgBQ1oQQNa0IAWNKAFDWhBA1rQgBY8dgGMoQDivq/y5gAAAABJRU5ErkJggg==";

const auth = (jwt: string) => ({ headers: { Authorization: "Bearer " + jwt } });

test.describe.serial("Directory update: family member with email and photo", () => {
  let ctx: APIRequestContext;
  let jwt = "";

  const findFamily = async () => ((await (await ctx.get(`${API}/membership/people/search?term=${FIRST}`, auth(jwt))).json()) as any[]) || [];
  const removeFamily = async () => { for (const p of await findFamily()) await ctx.delete(`${API}/membership/people/${p.id}`, auth(jwt)); };

  test.beforeAll(async () => {
    ctx = await pwRequest.newContext();
    const login = await (await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } })).json();
    jwt = (login.userChurches || []).find((c: any) => c.church?.id === CHURCH_ID)?.jwt;
    expect(jwt).toBeTruthy();
    await removeFamily();
  });

  test.afterAll(async () => {
    await removeFamily();
    await ctx.dispose();
  });

  test("shows the requested email and photo, and applies both to the new person", async ({ page }) => {
    const member = { first: FIRST, last: "Approvalson", email: "zeruiah.family@example.com", householdRole: "Child", photo: PHOTO };
    const taskRes = await ctx.post(`${API}/doing/tasks?type=directoryUpdate`, {
      ...auth(jwt),
      data: [
        {
          dateCreated: new Date(),
          associatedWithType: "person",
          associatedWithId: DEMO_PERSON_ID,
          associatedWithLabel: "Demo User",
          createdByType: "person",
          createdById: DEMO_PERSON_ID,
          createdByLabel: "Demo User",
          title: "Profile changes for Demo User",
          status: "Open",
          data: JSON.stringify([{ field: "familyMember", label: "Add Family Member", value: JSON.stringify(member) }])
        }
      ]
    });
    expect(taskRes.ok()).toBeTruthy();
    const task = (await taskRes.json())[0];

    await page.goto("/serving/tasks/" + task.id);
    await expect(page.getByText("Requested Changes", { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/zeruiah\.family@example\.com/)).toBeVisible();
    await expect(page.getByTestId("family-member-photo")).toBeVisible();
    await page.screenshot({ path: test.info().outputPath("after.png"), fullPage: true });

    await page.getByRole("button", { name: "Apply" }).click();
    await page.waitForURL(/\/serving\/tasks$/, { timeout: 20000 });

    const [created] = await findFamily();
    expect(created).toBeTruthy();
    const full = await (await ctx.get(`${API}/membership/people/${created.id}`, auth(jwt))).json();
    const me = await (await ctx.get(`${API}/membership/people/${DEMO_PERSON_ID}`, auth(jwt))).json();
    expect(full.householdId).toBe(me.householdId);
    expect(full.contactInfo.email).toBe("zeruiah.family@example.com");
    expect(full.photo).toContain("/membership/people/" + created.id + ".png?dt=");
    const file = await ctx.get(API + "/content" + full.photo);
    expect(file.status()).toBe(200);
  });
});
