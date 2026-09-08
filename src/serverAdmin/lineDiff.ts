// Line diff for the Commons review drawer (ChordPro and long text fields).
// ponytail: plain O(n·m) LCS over lines — charts are a few hundred lines, so no need for Myers.
// Ceiling: above LIMIT cells we fall back to "all removed / all added"; upgrade path is a Myers diff if charts ever get that long.

export type DiffLine = { kind: "same" | "add" | "del"; text: string };

const LIMIT = 4_000_000;

export const lineDiff = (from: string, to: string): DiffLine[] => {
  const a = from.split(/\r?\n/);
  const b = to.split(/\r?\n/);
  const n = a.length;
  const m = b.length;
  if (n * m > LIMIT) return [...a.map((text) => ({ kind: "del" as const, text })), ...b.map((text) => ({ kind: "add" as const, text }))];

  const lcs: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { out.push({ kind: "same", text: a[i] }); i++; j++; } else if (lcs[i + 1][j] >= lcs[i][j + 1]) { out.push({ kind: "del", text: a[i] }); i++; } else { out.push({ kind: "add", text: b[j] }); j++; }
  }
  while (i < n) out.push({ kind: "del", text: a[i++] });
  while (j < m) out.push({ kind: "add", text: b[j++] });
  return out;
};

export const hasChanges = (lines: DiffLine[]): boolean => lines.some((l) => l.kind !== "same");
