import { test, expect, request } from "@playwright/test";

const API_BASE = "http://localhost:8084";

test.describe.serial("Event permission gate (POST /content/events)", () => {
  let ctx: Awaited<ReturnType<typeof request.newContext>>;
  let volunteerJwt: string;
  let staffJwt: string;
  let leaderEventId: string;
  let staffEventId: string;

  test.beforeAll(async () => {
    ctx = await request.newContext();

    const volRes = await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "volunteer@b1.church", password: "password" } });
    expect(volRes.ok()).toBeTruthy();
    const volBody = await volRes.json();
    volunteerJwt = volBody.userChurches?.[0]?.jwt as string;
    expect(volunteerJwt).toBeTruthy();

    const staffRes = await ctx.post(`${API_BASE}/membership/users/login`, { data: { email: "demo@b1.church", password: "password" } });
    expect(staffRes.ok()).toBeTruthy();
    const staffBody = await staffRes.json();
    staffJwt = staffBody.userChurches?.[0]?.jwt as string;
    expect(staffJwt).toBeTruthy();
  });

  test.afterAll(async () => {
    await ctx.dispose();
  });

  test("leader can create an event for a group they lead", async () => {
    const volAuth = { headers: { Authorization: "Bearer " + volunteerJwt } };
    const res = await ctx.post(`${API_BASE}/content/events`, {
      ...volAuth,
      data: [{ groupId: "GRP00000029", title: "Leader Permission Test Event", start: "2026-07-01T18:00:00", end: "2026-07-01T19:00:00", allDay: false, visibility: "public" }]
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body[0].id).toBeTruthy();
    leaderEventId = body[0].id as string;
  });

  test("leader cannot create an event for a group they do not lead", async () => {
    const volAuth = { headers: { Authorization: "Bearer " + volunteerJwt } };
    const res = await ctx.post(`${API_BASE}/content/events`, {
      ...volAuth,
      data: [{ groupId: "GRP00000001", title: "Leader Permission Test Event", start: "2026-07-01T18:00:00", end: "2026-07-01T19:00:00", allDay: false, visibility: "public" }]
    });
    expect(res.status()).toBe(401);
  });

  test("leader cannot create an event with no groupId", async () => {
    const volAuth = { headers: { Authorization: "Bearer " + volunteerJwt } };
    const res = await ctx.post(`${API_BASE}/content/events`, {
      ...volAuth,
      data: [{ title: "Test", start: "2026-07-01T18:00:00", end: "2026-07-01T19:00:00", allDay: false, visibility: "public" }]
    });
    expect(res.status()).toBe(401);
  });

  test("leader can update their own group event", async () => {
    const volAuth = { headers: { Authorization: "Bearer " + volunteerJwt } };
    const res = await ctx.post(`${API_BASE}/content/events`, {
      ...volAuth,
      data: [{ id: leaderEventId, groupId: "GRP00000029", title: "Leader Permission Test Event Updated", start: "2026-07-01T18:00:00", end: "2026-07-01T19:00:00", allDay: false, visibility: "public" }]
    });
    expect(res.status()).toBe(200);
  });

  test("leader cannot repoint an event to an unled group", async () => {
    const volAuth = { headers: { Authorization: "Bearer " + volunteerJwt } };
    const res = await ctx.post(`${API_BASE}/content/events`, {
      ...volAuth,
      data: [{ id: leaderEventId, groupId: "GRP00000001", title: "Leader Permission Test Event Updated", start: "2026-07-01T18:00:00", end: "2026-07-01T19:00:00", allDay: false, visibility: "public" }]
    });
    expect(res.status()).toBe(401);
  });

  test("staff can save an event with no groupId", async () => {
    const staffAuth = { headers: { Authorization: "Bearer " + staffJwt } };
    const res = await ctx.post(`${API_BASE}/content/events`, {
      ...staffAuth,
      data: [{ title: "Staff Test Event", start: "2026-07-02T18:00:00", end: "2026-07-02T19:00:00", allDay: false, visibility: "public" }]
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body[0].id).toBeTruthy();
    staffEventId = body[0].id as string;
  });

  test("pending-approval list is staff-only", async () => {
    const volAuth = { headers: { Authorization: "Bearer " + volunteerJwt } };
    const staffAuth = { headers: { Authorization: "Bearer " + staffJwt } };
    const volRes = await ctx.get(`${API_BASE}/content/events/pending`, volAuth);
    expect(volRes.status()).toBe(401);
    const staffRes = await ctx.get(`${API_BASE}/content/events/pending`, staffAuth);
    expect(staffRes.status()).toBe(200);
  });

  test("cleanup", async () => {
    const staffAuth = { headers: { Authorization: "Bearer " + staffJwt } };
    const del1 = await ctx.delete(`${API_BASE}/content/events/${leaderEventId}`, staffAuth);
    expect(del1.ok()).toBeTruthy();
    const del2 = await ctx.delete(`${API_BASE}/content/events/${staffEventId}`, staffAuth);
    expect(del2.ok()).toBeTruthy();
  });
});
