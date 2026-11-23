import { type APIRequestContext } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";

// Multi-campus churches get a campus chip row on the Groups page; single-campus churches don't see it.
// Grace starts with one campus, so the test adds a second campus and a group on it, then removes both.

const API_BASE = process.env.API_BASE || "http://localhost:8084";
const CHURCH_ID = "CHU00000001";

async function apiAuth(api: APIRequestContext) {
  const res = await api.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  const body = await res.json();
  const uc = (body.userChurches || []).find((c: any) => c.church?.id === CHURCH_ID) || body.userChurches?.[0];
  return { headers: { Authorization: "Bearer " + uc.jwt } };
}

test.describe("Groups campus filter", () => {
  test("is hidden for a single campus", async ({ page }) => {
    const auth = await apiAuth(page.request);
    const campuses = await (await page.request.get(`${API_BASE}/membership/campuses`, auth)).json();
    test.skip(campuses.length > 1, "another spec left an extra campus behind");
    await page.goto("/groups");
    await expect(page.getByTestId("groups-search")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("groups-campus-filter")).toHaveCount(0);
  });

  test("narrows the list to one campus's groups", async ({ page }) => {
    const auth = await apiAuth(page.request);
    const campusRes = await page.request.post(`${API_BASE}/membership/campuses`, { ...auth, data: [{ name: "Zebulun North Campus" }] });
    expect(campusRes.ok()).toBeTruthy();
    const campusId: string = (await campusRes.json())[0].id;
    let groupId = "";
    try {
      const groupRes = await page.request.post(`${API_BASE}/membership/groups`, { ...auth, data: [{ name: "Zebulun North Small Group", categoryName: "Small Groups", tags: "standard", campusId }] });
      expect(groupRes.ok()).toBeTruthy();
      groupId = (await groupRes.json())[0].id;

      await page.goto("/groups");
      const filter = page.getByTestId("groups-campus-filter");
      await expect(filter).toBeVisible({ timeout: 15000 });
      await expect(page.getByRole("link", { name: "Adult Bible Class" })).toBeVisible();

      await page.getByTestId(`groups-campus-${campusId}`).click();
      await expect(page.getByRole("link", { name: "Zebulun North Small Group" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Adult Bible Class" })).toHaveCount(0);

      await filter.getByRole("button", { name: "All campuses" }).click();
      await expect(page.getByRole("link", { name: "Adult Bible Class" })).toBeVisible();
    } finally {
      if (groupId) await page.request.delete(`${API_BASE}/membership/groups/${groupId}`, auth);
      await page.request.delete(`${API_BASE}/membership/campuses/${campusId}`, auth);
    }
  });
});
