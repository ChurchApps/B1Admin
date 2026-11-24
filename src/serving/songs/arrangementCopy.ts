/** Name for a duplicated arrangement: "Name (copy)", then "Name (copy 2)" and so on, unused among the song's arrangements. */
export const copyArrangementName = (name: string | undefined, existingNames: (string | undefined)[], suffix = "copy") => {
  const base = (name || "").trim();
  const taken = new Set(existingNames.map((n) => (n || "").trim().toLowerCase()));
  for (let i = 1; ; i++) {
    const candidate = `${base} (${suffix}${i > 1 ? " " + i : ""})`.trim();
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
};
