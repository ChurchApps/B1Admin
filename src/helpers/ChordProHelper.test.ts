import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ChordProHelper } from "./ChordProHelper.ts";

describe("ChordProHelper.transposeChords", () => {
  it("transposes basic chords", () => {
    assert.equal(ChordProHelper.transposeChords("[C] hello", 2), "[D] hello");
    assert.equal(ChordProHelper.transposeChords("[Am] world", 2), "[Bm] world");
  });

  it("transposes extended chords", () => {
    assert.equal(ChordProHelper.transposeChords("[A7] chord", 2), "[B7] chord");
    assert.equal(ChordProHelper.transposeChords("[Gmaj7] chord", 2), "[Amaj7] chord");
    assert.equal(ChordProHelper.transposeChords("[Csus4] chord", 2), "[Dsus4] chord");
    assert.equal(ChordProHelper.transposeChords("[Dadd9] chord", 2), "[Eadd9] chord");
    assert.equal(ChordProHelper.transposeChords("[Cm7] chord", 2), "[Dm7] chord");
  });

  it("transposes slash chords, preserving the bass note interval", () => {
    assert.equal(ChordProHelper.transposeChords("[C/E] chord", 2), "[D/F#] chord");
    assert.equal(ChordProHelper.transposeChords("[G/B] chord", -2), "[F/A] chord");
  });

  it("transposes sharps and flats", () => {
    assert.equal(ChordProHelper.transposeChords("[F#] chord", 1), "[G] chord");
    assert.equal(ChordProHelper.transposeChords("[Bb] chord", 1), "[B] chord");
  });

  it("leaves section header lines untouched", () => {
    assert.equal(ChordProHelper.transposeChords("[Verse 1]", 2), "[Verse 1]");
  });

  it("wraps around the octave in both directions", () => {
    assert.equal(ChordProHelper.transposeChords("[B]", 1), "[C]");
    assert.equal(ChordProHelper.transposeChords("[C]", -1), "[B]");
  });
});

describe("ChordProHelper.formatLyrics", () => {
  it("renders section header lines as headers", () => {
    const html = ChordProHelper.formatLyrics("[Verse 1]", 0);
    assert.equal(html, '<h3 style="margin-bottom:0px">Verse 1</h3>');
  });

  it("renders lyric lines with chords as superscript", () => {
    const html = ChordProHelper.formatLyrics("[G]Amazing [C]grace", 0);
    assert.equal(html, '<div class="line"><sup>G</sup>Amazing <sup>C</sup>grace</div>');
  });

  it("renders blank lines as line breaks", () => {
    assert.equal(ChordProHelper.formatLyrics("", 0), "<br/>");
  });

  it("transposes chords by the given key offset", () => {
    const html = ChordProHelper.formatLyrics("[C]hello", 2);
    assert.equal(html, '<div class="line"><sup>D</sup>hello</div>');
  });

  it("escapes html in lyric lines", () => {
    const html = ChordProHelper.formatLyrics("<script>", 0);
    assert.equal(html, '<div class="line">&lt;script&gt;</div>');
  });
});

// Issue #1406: flat chords and keys were respelled as sharps.
describe("ChordProHelper flat spelling", () => {
  it("leaves chords untouched when not transposing", () => {
    assert.equal(ChordProHelper.transposeChords("[Eb] [Ab] [Bb/D] [Gbmaj7]", 0), "[Eb] [Ab] [Bb/D] [Gbmaj7]");
    assert.equal(ChordProHelper.formatLyrics("[Eb]When peace", 0), '<div class="line"><sup>Eb</sup>When peace</div>');
  });

  it("keeps flat chords flat when transposing", () => {
    assert.equal(ChordProHelper.transposeChords("[Eb]", 5), "[Ab]");
    assert.equal(ChordProHelper.transposeChords("[Ab/C]", 2), "[Bb/D]");
  });

  it("spells with flats when the target key is a flat key", () => {
    assert.equal(ChordProHelper.transposeChords("[D] [A]", 1, true), "[Eb] [Bb]");
    assert.equal(ChordProHelper.transposeChords("[Bb]", 1, false), "[B]");
  });

  it("lists keys the way musicians name them", () => {
    assert.deepEqual(ChordProHelper.keyNames, [
      "C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"
    ]);
    assert.equal(ChordProHelper.usesFlats(ChordProHelper.noteMap.Eb), true);
    assert.equal(ChordProHelper.usesFlats(ChordProHelper.noteMap.F), true);
    assert.equal(ChordProHelper.usesFlats(ChordProHelper.noteMap.G), false);
  });
});
