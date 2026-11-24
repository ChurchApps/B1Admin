import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getAdjacentPlans } from "./planNavigation.ts";

const plans = [
  { id: "p3", name: "Nov 15", serviceDate: "2026-11-15T00:00:00.000Z" },
  { id: "p1", name: "Nov 1", serviceDate: "2026-11-01T00:00:00.000Z" },
  { id: "p2", name: "Nov 8", serviceDate: "2026-11-08T00:00:00.000Z" }
];

describe("getAdjacentPlans", () => {
  it("steps by service date, not list order", () => {
    const { previous, next } = getAdjacentPlans(plans, "p2");
    assert.equal(previous?.id, "p1");
    assert.equal(next?.id, "p3");
  });

  it("has no previous for the first plan and no next for the last", () => {
    assert.equal(getAdjacentPlans(plans, "p1").previous, null);
    assert.equal(getAdjacentPlans(plans, "p3").next, null);
  });

  it("orders same-day plans by name so both are reachable", () => {
    const sameDay = [...plans, { id: "p2b", name: "Nov 8 Evening", serviceDate: "2026-11-08T00:00:00.000Z" }];
    assert.equal(getAdjacentPlans(sameDay, "p2").next?.id, "p2b");
    assert.equal(getAdjacentPlans(sameDay, "p2b").previous?.id, "p2");
  });

  it("returns nothing when the current plan is not in the list", () => {
    assert.deepEqual(getAdjacentPlans(plans, "x"), { previous: null, next: null });
  });
});
