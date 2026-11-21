import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formattedPhoneNumber, normalizePhone } from "./PhoneFormatHelper.ts";

describe("normalizePhone", () => {
  it("turns stored US and + numbers into E.164 and leaves local numbers alone", () => {
    assert.equal(normalizePhone("(555) 123-4567"), "+15551234567");
    assert.equal(normalizePhone("+61 412 345 678"), "+61412345678");
    assert.equal(normalizePhone("(555) 123-4567x12"), "+15551234567x12");
    assert.equal(normalizePhone("(555) 123-4567", true), "(555) 123-4567");
    assert.equal(normalizePhone(null), "");
  });
});

describe("formattedPhoneNumber", () => {
  it("shows every stored US shape as (AAA) BBB-CCCC", () => {
    assert.equal(formattedPhoneNumber("(555) 123-4567"), "(555) 123-4567");
    assert.equal(formattedPhoneNumber("+1 555 123 4567"), "(555) 123-4567");
    assert.equal(formattedPhoneNumber("+15551234567"), "(555) 123-4567");
    assert.equal(formattedPhoneNumber("555-123-4567x89"), "(555) 123-4567");
  });

  it("keeps international spacing and separates a bare country code", () => {
    assert.equal(formattedPhoneNumber("+61 412 345 678"), "+61 412 345 678");
    assert.equal(formattedPhoneNumber("+61412345678"), "+61 412345678");
    assert.equal(formattedPhoneNumber("+447946095800"), "+44 7946095800");
  });

  it("leaves other shapes and local-format churches as stored", () => {
    assert.equal(formattedPhoneNumber("555-1234"), "555-1234");
    assert.equal(formattedPhoneNumber("+15551234567", true), "+15551234567");
    assert.equal(formattedPhoneNumber(""), "");
  });
});
