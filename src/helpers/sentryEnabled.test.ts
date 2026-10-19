import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sentryEnabled } from "./sentryEnabled.ts";

// Sentry B1-ADMIN-2 (7,367 events), -HT, -JC, -JB: HeadlessChrome at 127.0.0.1:3101 and localhost:3101 — our own
// Playwright runs and dev servers — were the loudest "production" issues in the project.
describe("sentryEnabled", () => {
  it("is on for a real deployment", () => {
    assert.equal(sentryEnabled("prod", "admin.b1.church"), true);
    assert.equal(sentryEnabled("demo", "admin.demo.churchapps.org"), true);
  });

  it("is off for self-hosted builds", () => {
    assert.equal(sentryEnabled("selfhost", "admin.example.org"), false);
  });

  it("is off on localhost and loopback hosts, whatever the stage", () => {
    assert.equal(sentryEnabled("prod", "localhost"), false);
    assert.equal(sentryEnabled("demo", "127.0.0.1"), false);
    assert.equal(sentryEnabled("prod", "[::1]"), false);
    assert.equal(sentryEnabled("prod", "app.localhost"), false);
  });

  it("tolerates a missing hostname", () => {
    assert.equal(sentryEnabled("prod", undefined), true);
    assert.equal(sentryEnabled(undefined, "admin.b1.church"), true);
  });
});
