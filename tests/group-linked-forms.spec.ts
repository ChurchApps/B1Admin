import { request as pwRequest, type APIRequestContext } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";
import { openSeedGroup } from "./helpers/fixtures";

// #1333: a group's page lists the stand-alone forms linked to it (#1309), each opening the form.
const API = process.env.API_BASE || "http://localhost:8084";
const GROUP_NAME = "Vacation Bible School";
const OPEN_FORM = "VBS Volunteer Check-in";
const CLOSED_FORM = "VBS Last Year Survey";

async function apiLogin(ctx: APIRequestContext): Promise<string> {
  const res = await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
  expect(uc?.jwt).toBeTruthy();
  return uc.jwt as string;
}

test.describe.configure({ mode: "serial" });

test.describe("Group linked forms", () => {
  let ctx: APIRequestContext;
  let auth: { headers: { Authorization: string } };
  const formIds: Record<string, string> = {};

  test.beforeAll(async () => {
    ctx = await pwRequest.newContext();
    auth = { headers: { Authorization: "Bearer " + (await apiLogin(ctx)) } };
    const groups = await (await ctx.get(`${API}/membership/groups`, auth)).json();
    const groupId = (groups || []).find((g: any) => g.name === GROUP_NAME)?.id;
    expect(groupId).toBeTruthy();
    const lastYear = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const res = await ctx.post(`${API}/membership/forms`, {
      ...auth,
      data: [
        { name: OPEN_FORM, contentType: "form", restricted: false, groupId },
        { name: CLOSED_FORM, contentType: "form", restricted: false, groupId, accessEndTime: lastYear }
      ]
    });
    expect(res.ok()).toBeTruthy();
    for (const f of await res.json()) formIds[f.name] = f.id;
    expect(formIds[OPEN_FORM]).toBeTruthy();
  });

  test.afterAll(async () => {
    for (const id of Object.values(formIds)) await ctx.delete(`${API}/membership/forms/${id}`, auth);
    await ctx.dispose();
  });

  test("lists the group's linked forms with open or closed, each opening the form", async ({ page }) => {
    await openSeedGroup(page, GROUP_NAME);
    const section = page.getByTestId("group-plate-forms");
    await expect(section).toBeVisible({ timeout: 15000 });
    await expect(section).toContainText("Linked forms");

    const openRow = section.getByTestId(`group-linked-form-${formIds[OPEN_FORM]}`);
    await expect(openRow).toContainText(OPEN_FORM);
    await expect(openRow).toContainText("Open");
    const closedRow = section.getByTestId(`group-linked-form-${formIds[CLOSED_FORM]}`);
    await expect(closedRow).toContainText(CLOSED_FORM);
    await expect(closedRow).toContainText("Closed");
    await expect(section).toContainText("2 forms");
    await expect(section.getByTestId("group-all-forms")).toHaveAttribute("href", "/forms");

    await openRow.getByRole("link", { name: OPEN_FORM }).click();
    await expect(page).toHaveURL(new RegExp(`/forms/${formIds[OPEN_FORM]}$`));
  });
});
