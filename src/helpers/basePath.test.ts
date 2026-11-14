import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { withBase } from "./basePath.ts";

// Issue #1569: the self-host image serves the app under /admin/, so root-relative print links opened B1App's 404.
describe("withBase", () => {
  it("leaves paths alone at the root base", () => {
    assert.equal(withBase("/serving/plans/print/abc", "/"), "/serving/plans/print/abc");
  });

  it("prefixes the self-host /admin/ base", () => {
    assert.equal(withBase("/serving/plans/print/abc", "/admin/"), "/admin/serving/plans/print/abc");
    assert.equal(withBase("groups/print-roster?groupId=1", "/admin/"), "/admin/groups/print-roster?groupId=1");
  });
});
