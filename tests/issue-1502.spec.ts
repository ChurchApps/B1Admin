import { request as pwRequest, test, expect } from "@playwright/test";
import { login } from "./helpers/auth";
import { navigateToAttendance } from "./helpers/navigation";
import { STORAGE_STATE_PATH } from "./global-setup";

// Issue #1502: on Attendance > Setup a campus with no services showed its name on one row and
// the add-service "+" alone on the next row, so the button looked offset by one line.
const API = process.env.API_BASE || "http://localhost:8084";
const CAMPUS_NAME = "Zebedee Empty Campus 1502";

test.describe("issue-1502 empty campus add-service button", () => {
  test.describe.configure({ retries: 0 });

  test("the add-service button sits on the campus's own row", async ({ browser }) => {
    const api = await pwRequest.newContext();
    const loginRes = await api.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
    const body = await loginRes.json();
    const uc = (body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches?.[0];
    const headers = { Authorization: "Bearer " + uc.jwt };
    const created = await api.post(`${API}/membership/campuses`, { headers, data: [{ name: CAMPUS_NAME }] });
    const campusId = (await created.json())[0].id;

    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    const page = await context.newPage();
    try {
      await login(page);
      await navigateToAttendance(page);
      await page.getByTestId("attendance-verb-setup").click();

      const addButton = page.getByTestId("add-service-button-" + campusId);
      await expect(addButton).toBeVisible({ timeout: 15000 });
      await expect(page.locator("tr", { hasText: CAMPUS_NAME }).getByTestId("add-service-button-" + campusId)).toHaveCount(1);
    } finally {
      await context.close();
      await api.delete(`${API}/membership/campuses/${campusId}`, { headers });
      await api.dispose();
    }
  });
});
