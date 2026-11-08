import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseTitleOptions, TITLE_SUGGESTIONS } from "./PersonConstants.ts";

describe("parseTitleOptions", () => {
  it("falls back to the default titles when the setting is missing, malformed or empty", () => {
    assert.deepEqual(parseTitleOptions(undefined), TITLE_SUGGESTIONS);
    assert.deepEqual(parseTitleOptions("not json"), TITLE_SUGGESTIONS);
    assert.deepEqual(parseTitleOptions("{\"a\":1}"), TITLE_SUGGESTIONS);
    assert.deepEqual(parseTitleOptions("[]"), TITLE_SUGGESTIONS);
  });

  it("trims, caps at ten characters and drops case-insensitive duplicates", () => {
    assert.deepEqual(parseTitleOptions(JSON.stringify([" Deacon ", "Elder", "elder", "", "Evangelistic", 5])), ["Deacon", "Elder", "Evangelist"]);
    assert.deepEqual(parseTitleOptions(["Mr", "Bishop"]), ["Mr", "Bishop"]);
  });
});
