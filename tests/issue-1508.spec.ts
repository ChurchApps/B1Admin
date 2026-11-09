import type { APIRequestContext, Page } from "@playwright/test";
import { loggedInTest as test, expect } from "./helpers/test-fixtures";
import { navigateToRoomsResources, navigateToApprovals } from "./helpers/navigation";
import { login } from "./helpers/auth";
import { STORAGE_STATE_PATH } from "./global-setup";
import { confirmDelete } from "./helpers/fixtures";

// #1508: a room can go back to "No approval needed", and room-less event requests can be edited and deleted from Approvals.
test.describe("Issue 1508: rooms and event requests", () => {
  const API = process.env.API_BASE || "http://localhost:8084";
  const stamp = Date.now();
  const groupName = `Zacchaeus 1508 Approvers ${stamp}`;
  const roomName = `Zacchaeus 1508 Room ${stamp}`;
  const eventTitle = `Zacchaeus 1508 Request ${stamp}`;
  let ctx: APIRequestContext;
  let jwt: string;
  let groupId: string;
  let roomId: string;
  let eventId: string;
  let page: Page;

  const auth = () => ({ headers: { Authorization: "Bearer " + jwt } });

  test.beforeAll(async ({ browser, playwright }) => {
    ctx = await playwright.request.newContext();
    const body = await (await ctx.post(`${API}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } })).json();
    jwt = ((body.userChurches || []).find((c: any) => c.church?.id === "CHU00000001") || body.userChurches[0]).jwt;
    groupId = (await (await ctx.post(`${API}/membership/groups`, { ...auth(), data: [{ name: groupName, categoryName: "Approvals Test", tags: "standard" }] })).json())[0].id;
    roomId = (await (await ctx.post(`${API}/content/rooms`, { ...auth(), data: [{ name: roomName, approvalGroupId: groupId }] })).json())[0].id;
    const start = new Date();
    start.setDate(start.getDate() + 10);
    start.setHours(18, 0, 0, 0);
    const end = new Date(start);
    end.setHours(19);
    eventId = (await (await ctx.post(`${API}/content/events/request`, { ...auth(), data: { title: eventTitle, start: start.toISOString(), end: end.toISOString(), allDay: false } })).json()).event.id;
    const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    page = await context.newPage();
    await login(page);
  });

  test.afterAll(async () => {
    try {
      await ctx.delete(`${API}/content/events/${eventId}`, auth());
      await ctx.delete(`${API}/content/rooms/${roomId}`, auth());
      await ctx.delete(`${API}/membership/groups/${groupId}`, auth());
    } catch { /* best effort */ }
    await ctx?.dispose();
    await page?.context().close();
  });

  test("editing a room back to No approval needed clears its approval group", async () => {
    await navigateToRoomsResources(page);
    const row = page.locator('[data-testid="rooms-table"] tbody tr').filter({ hasText: roomName });
    await expect(row).toContainText(groupName, { timeout: 15000 });
    await page.locator(`[data-testid="edit-room-${roomId}"]`).click();
    await page.locator('[data-testid="room-approval-group-select"] [role="combobox"]').click();
    await page.getByRole("option", { name: "No approval needed" }).click();
    await page.locator('[data-testid="save-room-button"]').click();
    await expect(page.locator('[data-testid="rooms-table"] tbody tr').filter({ hasText: roomName })).not.toContainText(groupName, { timeout: 15000 });
    await page.reload();
    await expect(page.locator('[data-testid="rooms-table"] tbody tr').filter({ hasText: roomName })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="rooms-table"] tbody tr').filter({ hasText: roomName })).not.toContainText(groupName);
  });

  test("a pending event request with no room can be edited and deleted", async () => {
    await navigateToApprovals(page);
    const row = page.locator('[data-testid="pending-events-table"] tbody tr').filter({ hasText: eventTitle });
    await expect(row).toBeVisible({ timeout: 15000 });
    await row.locator(`[data-testid="edit-event-${eventId}"]`).click();
    await expect(page.locator('[data-testid="new-event-title-input"] input')).toHaveValue(eventTitle, { timeout: 15000 });
    await page.locator('[data-testid="new-event-cancel-button"]').click();
    await row.locator(`[data-testid="delete-event-${eventId}"]`).click();
    await confirmDelete(page);
    await expect(page.locator('[data-testid="pending-events-table"] tbody tr').filter({ hasText: eventTitle })).toHaveCount(0, { timeout: 15000 });
  });
});
