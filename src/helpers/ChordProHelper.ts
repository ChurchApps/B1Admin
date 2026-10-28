export class ChordProHelper {
  // Map note names (both sharps and flats) to semitone numbers.
  static noteMap: { [key: string]: number } = {
    C: 0,
    "B#": 0,
    "C#": 1,
    Db: 1,
    D: 2,
    "D#": 3,
    Eb: 3,
    E: 4,
    Fb: 4,
    F: 5,
    "E#": 5,
    "F#": 6,
    Gb: 6,
    G: 7,
    "G#": 8,
    Ab: 8,
    A: 9,
    "A#": 10,
    Bb: 10,
    B: 11,
    Cb: 11
  };

  // Arrays to convert semitone numbers back to note names
  static noteNames = [
    "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"
  ];

  static flatNoteNames = [
    "C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"
  ];

  // Key names as musicians usually write them, for key pickers
  static keyNames = [
    "C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"
  ];

  // Keys whose signatures use flats (Db, Eb, F, Ab, Bb)
  static usesFlats = (keyIndex: number) => [1, 3, 5, 8, 10].includes(((keyIndex % 12) + 12) % 12);

  static replaceChords = (line: string) => {
    const l = line.replaceAll("[", "<sup>").replaceAll("]", "</sup>");
    return l;
  };

  static transposeChords = (line: string, halfSteps: number, useFlats?: boolean) => {
    return line.replace(/\[[A-G][#b]?[^/\]]*(\/[A-G][#b]?)?\]/g, (chord) => "[" + this.transposeChord(chord.substring(1, chord.length - 1), halfSteps, useFlats) + "]");
  };

  static transposeChord = (chord: string, steps: number, useFlats?: boolean) => {
    // Handle slash chords (e.g., "C/E")
    const parts = chord.split("/");
    const mainChord = parts[0];
    const bassPart = parts[1] || null;

    // Transpose the main chord.
    let newChord = this.transposeSingle(mainChord, steps, useFlats);

    // If there is a bass note (in a slash chord), transpose that as well.
    if (bassPart) {
      newChord += "/" + this.transposeSingle(bassPart, steps, useFlats);
    }

    return newChord;
  };

  // Function to transpose a single note chord (like "C", "C#", "Cm", etc.)
  // Without useFlats, a flat root stays flat and anything else is spelled with sharps.
  static transposeSingle = (chordStr: string, steps: number, useFlats?: boolean) => {
    // Extract the root note (first letter plus optional '#' or 'b')
    let root, modifier;
    if (chordStr.length > 1 && (chordStr[1] === "#" || chordStr[1] === "b")) {
      root = chordStr.slice(0, 2);
      modifier = chordStr.slice(2);
    } else {
      root = chordStr.slice(0, 1);
      modifier = chordStr.slice(1);
    }

    const originalIndex = this.noteMap[root];
    if (originalIndex === undefined) {
      throw new Error("Invalid chord: " + chordStr);
    }
    if (steps % 12 === 0) return chordStr;
    let newIndex = (originalIndex + steps) % 12;
    if (newIndex < 0) {
      newIndex += 12;
    }
    const flats = useFlats ?? root[1] === "b";
    const newRoot = (flats ? this.flatNoteNames : this.noteNames)[newIndex];

    return newRoot + modifier;
  };

  static escapeHtml = (s: string) => s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  static formatLyrics = (lyrics: string, keyOffset: number, useFlats?: boolean) => {
    const lines = lyrics.split("\n");
    const result: string[] = [];
    lines.forEach((line) => {
      let l = line.trim();
      let lineType = "line";
      if (/^\[[^[\]]*\]$/.test(l)) lineType = "header";
      else if (l.length === 0) lineType = "empty";
      switch (lineType) {
        case "header":
          result.push('<h3 style="margin-bottom:0px">' + this.escapeHtml(l.substring(1, l.length - 1)) + "</h3>");
          break;
        case "line":
          l = this.escapeHtml(l);
          l = this.transposeChords(l, keyOffset, useFlats);
          l = this.replaceChords(l);
          result.push('<div class="line">' + l + "</div>");
          break;
        case "empty": result.push("<br/>"); break;
      }
    });
    return result.join("\n");
  };
}
