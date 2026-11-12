import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { batchOptionLabel, batchOptions } from "./batchOptions.ts";

describe("batchOptions", () => {
  const batches = [
    { id: "a", name: "Old", batchDate: "2025-01-05T00:00:00.000Z", status: "open" as const },
    { id: "b", name: "Closed", batchDate: "2025-03-01", status: "closed" as const },
    { id: "c", name: "New", batchDate: "2025-06-01", status: "open" as const }
  ];

  it("drops closed batches and lists newest first", () => {
    assert.deepEqual(batchOptions([...batches]).map((b) => b.id), ["c", "a"]);
  });

  it("keeps the gift's current batch even when it is closed", () => {
    assert.deepEqual(batchOptions([...batches], "b").map((b) => b.id), ["c", "b", "a"]);
  });
});

describe("batchOptionLabel", () => {
  it("shows the date and the name", () => {
    assert.equal(batchOptionLabel({ name: "Sunday", batchDate: "2025-11-01T00:00:00.000Z" }, (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`), "2025-11-1 – Sunday");
  });

  it("shows only the date when the batch has no name", () => {
    assert.equal(batchOptionLabel({ batchDate: "2025-11-01" }, (d) => `${d.getMonth() + 1}/${d.getDate()}`), "11/1");
  });
});
