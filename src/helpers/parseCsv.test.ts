import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseCsv } from "./parseCsv.ts";

describe("parseCsv", () => {
  it("handles quotes, embedded commas/newlines, CRLF, BOM and blank lines", () => {
    const text = String.fromCharCode(0xFEFF) + "name,amount,notes\r\n\"Smith, John\",\"1,250.00\",\"said \"\"thanks\"\"\nline 2\"\r\n\r\nJane Doe,50,\n";
    assert.deepEqual(parseCsv(text), [
      ["name", "amount", "notes"],
      ["Smith, John", "1,250.00", "said \"thanks\"\nline 2"],
      ["Jane Doe", "50", ""]
    ]);
  });
});
