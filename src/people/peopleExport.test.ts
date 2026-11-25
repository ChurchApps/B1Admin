import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addCustomFieldColumns } from "./peopleExport.ts";

const options = {
  // Stands in for PersonFieldHelper.formatFieldValue, which needs the app's Locale.
  formatValue: (field: { fieldType?: string }, value: string) => (field.fieldType === "Yes/No" ? (value === "True" ? "Yes" : "No") : value),
  collisionHeader: (name: string) => name + " (custom)"
};

const rows = () => [{ "First Name": "Ann", Grade: "5" }, { "First Name": "Bo" }, { "First Name": "Cy" }];
const personIds = ["p1", "p2", undefined];

describe("addCustomFieldColumns", () => {
  it("adds a formatted column per field, blank for people with no value", () => {
    const fields = [{ id: "f1", name: "Baptized", fieldType: "Yes/No" }, { id: "f2", name: "Shirt Size", fieldType: "Textbox" }];
    const result = addCustomFieldColumns(rows(), personIds, fields, { f1: { p1: "True", p2: "False" }, f2: { p2: "Large" } }, options);
    assert.deepEqual(result, [
      { "First Name": "Ann", Grade: "5", Baptized: "Yes", "Shirt Size": "" },
      { "First Name": "Bo", Baptized: "No", "Shirt Size": "Large" },
      { "First Name": "Cy", Baptized: "", "Shirt Size": "" }
    ]);
  });

  it("keeps a column for a field nobody has filled in", () => {
    const result = addCustomFieldColumns(rows(), personIds, [{ id: "f1", name: "Allergies" }], { f1: {} }, options);
    assert.deepEqual(result.map((r) => r.Allergies), ["", "", ""]);
  });

  it("suffixes a field named like a built-in column instead of overwriting it", () => {
    const fields = [{ id: "f1", name: "grade" }, { id: "f2", name: " First Name " }];
    const result = addCustomFieldColumns(rows(), personIds, fields, { f1: { p1: "A+" }, f2: { p1: "Annie" } }, options);
    assert.deepEqual(result[0], { "First Name": "Ann", Grade: "5", "grade (custom)": "A+", "First Name (custom)": "Annie" });
    // Bo's row has no Grade key, but the header is still taken by Ann's row.
    assert.deepEqual(Object.keys(result[1]), ["First Name", "grade (custom)", "First Name (custom)"]);
  });

  it("never uses the keys the CSV link rewrites as dates", () => {
    const fields = [{ id: "f1", name: "birthDate" }, { id: "f2", name: "Anniversary" }];
    const result = addCustomFieldColumns(rows(), personIds, fields, { f1: { p1: "soon" }, f2: { p1: "June" } }, options);
    assert.deepEqual(result[0], { "First Name": "Ann", Grade: "5", "birthDate (custom)": "soon", "Anniversary (custom)": "June" });
  });

  it("gives fields that share a name their own columns", () => {
    const fields = [{ id: "f1", name: "Notes" }, { id: "f2", name: "Notes" }, { id: "f3", name: "Notes" }];
    const result = addCustomFieldColumns(rows(), personIds, fields, { f1: { p1: "a" }, f2: { p1: "b" }, f3: { p1: "c" } }, options);
    assert.deepEqual(result[0], { "First Name": "Ann", Grade: "5", Notes: "a", "Notes (custom)": "b", "Notes (custom) 2": "c" });
  });

  it("leaves out a field whose values did not load and returns the rows untouched when none did", () => {
    const fields = [{ id: "f1", name: "Baptized", fieldType: "Yes/No" }, { id: "f2", name: "Shirt Size" }, { name: "No id" }];
    const partial = addCustomFieldColumns(rows(), personIds, fields, { f2: { p1: "Small" } }, options);
    assert.deepEqual(partial[0], { "First Name": "Ann", Grade: "5", "Shirt Size": "Small" });

    const builtIn = rows();
    assert.equal(addCustomFieldColumns(builtIn, personIds, fields, {}, options), builtIn);
    assert.deepEqual(builtIn, rows());
  });

  it("doubles quotes in names and values, which the CSV writer does not escape", () => {
    const result = addCustomFieldColumns(rows(), personIds, [{ id: "f1", name: "Known as \"nick\"" }], { f1: { p1: "William \"Bill\"" } }, options);
    assert.equal(result[0]["Known as \"\"nick\"\""], "William \"\"Bill\"\"");
  });
});
