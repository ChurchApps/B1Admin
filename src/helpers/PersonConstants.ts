export const TITLE_SUGGESTIONS = [
  "Mr", "Mrs", "Miss", "Ms", "Dr", "Prof", "Rev", "Pastor"
];

// Public membership setting holding the church's own title list (JSON array of strings).
export const TITLE_OPTIONS_KEY = "titleOptions";
export const TITLE_MAX_LENGTH = 10;

// Cleans a stored title list; falls back to TITLE_SUGGESTIONS when missing, malformed or empty.
export function parseTitleOptions(raw: unknown): string[] {
  let list: unknown = raw;
  if (typeof raw === "string") {
    try { list = JSON.parse(raw); } catch { list = null; }
  }
  if (!Array.isArray(list)) return [...TITLE_SUGGESTIONS];
  const seen = new Set<string>();
  const result: string[] = [];
  list.forEach((item) => {
    if (typeof item !== "string") return;
    const title = item.trim().slice(0, TITLE_MAX_LENGTH).trim();
    if (!title || seen.has(title.toLowerCase())) return;
    seen.add(title.toLowerCase());
    result.push(title);
  });
  return result.length > 0 ? result : [...TITLE_SUGGESTIONS];
}

export const HOUSEHOLD_ROLES = ["Head", "Spouse", "Child", "Other"] as const;
