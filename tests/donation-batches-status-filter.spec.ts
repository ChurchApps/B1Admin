import { request } from "@playwright/test";
import { donationsTest as test, expect } from "./helpers/test-fixtures";
import { siblingNav } from "./helpers/navigation";

// The Batches page can be narrowed to open or closed batches, beside the year pills,
// so finished batches stay one click away without cluttering the working list.
const API_BASE = process.env.API_BASE || "http://localhost:8084";
const STAMP = Date.now();
const OPEN_NAME = `Status Filter Open ${STAMP}`;
const CLOSED_NAME = `Status Filter Closed ${STAMP}`;

const adminAuth = async (ctx: Awaited<ReturnType<typeof request.newContext>>) => {
  const login = await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
  const jwt = (await login.json()).userChurches?.find((uc: any) => uc.church?.id === "CHU00000001")?.jwt as string;
  return { headers: { Authorization: "Bearer " + jwt } };
};

const batchIds: string[] = [];

const batchCount = async (page: import("@playwright/test").Page) => {
  const text = (await page.getByTestId("batches-lede").textContent()) || "";
  return parseInt(text.match(/(\d+) batches/)?.[1] || "0", 10);
};

test.describe.serial("Batches status filter", () => {
  test.beforeAll(async () => {
    const ctx = await request.newContext();
    const auth = await adminAuth(ctx);
    const today = new Date().toISOString().split("T")[0];
    const res = await ctx.post(`${API_BASE}/giving/donationbatches`, { ...auth, data: [{ name: OPEN_NAME, batchDate: today }, { name: CLOSED_NAME, batchDate: today }] });
    const saved = (await res.json()) as { id: string; name: string }[];
    saved.forEach((b) => batchIds.push(b.id));
    const closedId = saved.find((b) => b.name === CLOSED_NAME)?.id;
    await ctx.post(`${API_BASE}/giving/donationbatches/${closedId}/close`, auth);
    await ctx.dispose();
  });

  test.afterAll(async () => {
    const ctx = await request.newContext();
    const auth = await adminAuth(ctx);
    for (const id of batchIds) await ctx.delete(`${API_BASE}/giving/donationbatches/${id}`, auth);
    await ctx.dispose();
  });

  test("Open and Closed pills narrow the list, All brings every batch back", async ({ page }) => {
    await (await siblingNav(page)).getByText("Batches").click();
    await expect(page).toHaveURL(/\/donations\/batches$/);
    await expect(page.getByTestId("batches-lede")).toBeVisible({ timeout: 10000 });

    const openRow = page.getByRole("link", { name: OPEN_NAME, exact: true });
    const closedRow = page.getByRole("link", { name: CLOSED_NAME, exact: true });
    const statusCells = page.getByTestId("batch-row-status");

    // All is the default, so nobody loses a batch they used to see.
    const pills = page.getByTestId("batch-status-pills");
    await expect(pills).toHaveAttribute("aria-label", "Status");
    await expect(page.getByTestId("batch-status-pill-all")).toHaveAttribute("aria-pressed", "true");
    await expect(openRow).toBeVisible();
    await expect(closedRow).toBeVisible();
    const allCount = await batchCount(page);

    await page.getByTestId("batch-status-pill-open").click();
    await expect(page.getByTestId("batch-status-pill-open")).toHaveAttribute("aria-pressed", "true");
    await expect(closedRow).toHaveCount(0);
    await expect(openRow).toBeVisible();
    for (const text of await statusCells.allTextContents()) expect(text).toBe("Open");
    expect(await batchCount(page)).toBeLessThan(allCount);

    await page.getByTestId("batch-status-pill-closed").click();
    await expect(openRow).toHaveCount(0);
    await expect(closedRow).toBeVisible();
    for (const text of await statusCells.allTextContents()) expect(text).toBe("Closed");

    await page.getByTestId("batch-status-pill-all").click();
    await expect(openRow).toBeVisible();
    await expect(closedRow).toBeVisible();
    expect(await batchCount(page)).toBe(allCount);
  });
});
