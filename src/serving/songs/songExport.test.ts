import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSongLibraryRows, buildSongUsageRows, ccliSongUrl, defaultUsageRange, toCsv } from "./songExport.ts";

const songDetails = [
  { id: "sd1", songId: "s1", title: "Amazing Grace", artist: "John Newton" },
  { id: "sd2", songId: "s2", title: "Build My Life", artist: "Housefires" }
];
const arrangements = [
  { id: "a1", songId: "s1", songDetailId: "sd1", name: "(Default)" },
  { id: "a2", songId: "s2", songDetailId: "sd2", name: "(Default)" },
  { id: "a3", songId: "s2", songDetailId: "sd2", name: "Acoustic" }
];
const keys = [
  { id: "k1", arrangementId: "a1", keySignature: "G" },
  { id: "k2", arrangementId: "a1", keySignature: "A" },
  { id: "k3", arrangementId: "a2", keySignature: "E" },
  { id: "k4", arrangementId: "a3", keySignature: "D" }
];
const links = [{ songDetailId: "sd1", serviceKey: "22025" }];
const local = (d: Date | string) => (d instanceof Date ? d : new Date(d + "T12:00:00"));

describe("buildSongUsageRows", () => {
  it("joins plan items to songs, counts each plan once and lists its dates", () => {
    const items = [
      { planId: "p2", relatedId: "k2", serviceDate: "2026-11-08" },
      { planId: "p1", relatedId: "k1", serviceDate: "2026-11-01" },
      { planId: "p1", relatedId: "k1", serviceDate: "2026-11-01" },
      { planId: "p1", relatedId: "k3", serviceDate: "2026-11-01" }
    ];
    const rows = buildSongUsageRows(items, keys, arrangements, songDetails, links, local);
    assert.deepEqual(rows, [
      { title: "Amazing Grace", artist: "John Newton", ccliNumber: "22025", timesUsed: 2, planDates: "2026-11-01; 2026-11-08" },
      { title: "Build My Life", artist: "Housefires", ccliNumber: "", timesUsed: 1, planDates: "2026-11-01" }
    ]);
  });

  it("keeps a song whose key was deleted, under its plan label", () => {
    const rows = buildSongUsageRows([{ planId: "p1", relatedId: "gone", label: "Old Hymn", serviceDate: "2026-11-01" }], keys, arrangements, songDetails, links, local);
    assert.deepEqual(rows, [{ title: "Old Hymn", artist: "", ccliNumber: "", timesUsed: 1, planDates: "2026-11-01" }]);
  });

  it("skips an item with nothing to name it by", () => {
    assert.deepEqual(buildSongUsageRows([{ planId: "p1", relatedId: "gone" }], keys, arrangements, songDetails, links, local), []);
  });
});

describe("buildSongLibraryRows", () => {
  it("lists every song once with its CCLI number, link and keys", () => {
    const rows = buildSongLibraryRows([...songDetails, songDetails[0]], arrangements, keys, links);
    assert.deepEqual(rows, [
      { title: "Amazing Grace", artist: "John Newton", ccliNumber: "22025", ccliLink: "https://songselect.ccli.com/Songs/22025", keys: "G, A" },
      { title: "Build My Life", artist: "Housefires", ccliNumber: "", ccliLink: "", keys: "(Default): E; Acoustic: D" }
    ]);
  });
});

describe("toCsv", () => {
  it("quotes commas and quotes and defuses formulas", () => {
    const csv = toCsv([{ label: "Title", key: "title" }, { label: "Artist", key: "artist" }], [{ title: "Hello, \"World\"", artist: "=HYPERLINK(1)" }]);
    assert.equal(csv, "Title,Artist\r\n\"Hello, \"\"World\"\"\",'=HYPERLINK(1)");
  });
});

describe("defaultUsageRange", () => {
  it("covers the six months up to today", () => {
    assert.deepEqual(defaultUsageRange(new Date(2026, 10, 23)), { startDate: "2026-05-23", endDate: "2026-11-23" });
  });
});

describe("ccliSongUrl", () => {
  it("is empty without a number", () => assert.equal(ccliSongUrl(""), ""));
});
