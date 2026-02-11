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

  // Array to convert semitone numbers back to note names (using sharps here)
  static noteNames = [
    "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"
  ];

  static replaceChords = (line: string) => {
    const l = line.replaceAll("[", "<sup>").replaceAll("]", "</sup>");
    return l;
  };

  static transposeChords = (line: string, halfSteps: number) => {
    const chords = line.match(/\[[A-G][#bm]?(\/[A-G][#bm]?)?\]/g);
    if (chords) {
      chords.forEach((chord) => {
        const newChord = this.transposeChord(chord.substring(1, chord.length - 1), halfSteps);
        line = line.replace(chord, "[" + newChord + "]");
      });
    }
    return line;
  };

  static transposeChord = (chord: string, steps: number) => {
    // Handle slash chords (e.g., "C/E")
    const parts = chord.split("/");
    const mainChord = parts[0];
    const bassPart = parts[1] || null;

    // Transpose the main chord.
    let newChord = this.transposeSingle(mainChord, steps);

    // If there is a bass note (in a slash chord), transpose that as well.
    if (bassPart) {
      newChord += "/" + this.transposeSingle(bassPart, steps);
    }

    return newChord;
  };

  // Function to transpose a single note chord (like "C", "C#", "Cm", etc.)
  static transposeSingle = (chordStr: string, steps: number) => {
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
    let newIndex = (originalIndex + steps) % 12;
    if (newIndex < 0) {
      newIndex += 12;
    }
    const newRoot = this.noteNames[newIndex];

    return newRoot + modifier;
  };

  static transposeLyrics = () => {
    const result: string[] = [];

    return result.join("\n");
  };

  static formatLyrics = (lyrics: string, keyOffset: number) => {
    const lines = lyrics.split("\n");
    const result: string[] = [];
    lines.forEach((line) => {
      let l = line.trim();
      let lineType = "line";
      if (line.startsWith("[") && line.endsWith("]")) lineType = "header";
      else if (l.length === 0) lineType = "empty";
      switch (lineType) {
        case "header":
          result.push('<h3 style="margin-bottom:0px">' + l.substring(1, l.length - 1) + "</h3>");
          break;
        case "line":
          l = this.transposeChords(l, keyOffset);
          l = this.replaceChords(l);
          result.push('<div class="line">' + l + "</div>");
          break;
        case "empty": result.push("<br/>"); break;
      }
    });
    return result.join("\n");
  };
}
