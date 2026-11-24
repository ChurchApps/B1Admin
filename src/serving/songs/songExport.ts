// Pure helpers for the Songs page exports: the song library CSV and the song usage (CCLI) CSV.
// The front end joins plan items (DoingApi) to arrangement keys, arrangements and song details (ContentApi).

export interface ExportSongDetail { id?: string; songId?: string; title?: string; artist?: string }
export interface ExportArrangement { id?: string; songId?: string; songDetailId?: string; name?: string }
export interface ExportArrangementKey { id?: string; arrangementId?: string; keySignature?: string; shortDescription?: string }
export interface ExportLink { songDetailId?: string; serviceKey?: string; url?: string }
export interface SongPlanItem { planId?: string; relatedId?: string; label?: string; serviceDate?: Date | string }

export interface SongUsageRow { title: string; artist: string; ccliNumber: string; timesUsed: number; planDates: string }
export interface SongLibraryRow { title: string; artist: string; ccliNumber: string; ccliLink: string; keys: string }

export const ccliSongUrl = (ccliNumber: string) => ccliNumber ? "https://songselect.ccli.com/Songs/" + encodeURIComponent(ccliNumber) : "";

const pad = (n: number) => String(n).padStart(2, "0");
export const formatIsoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Default usage range: the last six months up to today (CCLI reports cover six-month periods). */
export const defaultUsageRange = (today: Date = new Date()) => {
  const start = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate());
  return { startDate: formatIsoDate(start), endDate: formatIsoDate(today) };
};

const ccliMap = (links: ExportLink[]) => {
  const map = new Map<string, string>();
  links.forEach((l) => { if (l.songDetailId && l.serviceKey && !map.has(l.songDetailId)) map.set(l.songDetailId, l.serviceKey); });
  return map;
};

const byTitle = <T extends { title: string; artist: string }>(a: T, b: T) => a.title.localeCompare(b.title) || a.artist.localeCompare(b.artist);

/** One row per song used on a plan in the range. A song counts once per plan; plan dates are listed oldest first. */
export const buildSongUsageRows = (
  items: SongPlanItem[],
  keys: ExportArrangementKey[],
  arrangements: ExportArrangement[],
  songDetails: ExportSongDetail[],
  links: ExportLink[],
  toDate: (d: Date | string) => Date = (d) => new Date(d)
): SongUsageRow[] => {
  const keyById = new Map(keys.map((k) => [k.id, k]));
  const arrangementById = new Map(arrangements.map((a) => [a.id, a]));
  const detailById = new Map(songDetails.map((sd) => [sd.id, sd]));
  const ccli = ccliMap(links);
  const groups = new Map<string, { title: string; artist: string; ccliNumber: string; plans: Map<string, string> }>();

  items.forEach((item) => {
    const arrangement = arrangementById.get(keyById.get(item.relatedId)?.arrangementId);
    const detail = detailById.get(arrangement?.songDetailId);
    // A song whose key was deleted since still shows, under the label it had on the plan.
    const groupKey = detail?.id ? "sd:" + detail.id : "label:" + (item.label || "").trim().toLowerCase();
    if (!detail && !item.label?.trim()) return;
    let group = groups.get(groupKey);
    if (!group) {
      group = { title: detail?.title || item.label?.trim() || "", artist: detail?.artist || "", ccliNumber: (detail?.id && ccli.get(detail.id)) || "", plans: new Map() };
      groups.set(groupKey, group);
    }
    const date = item.serviceDate ? formatIsoDate(toDate(item.serviceDate)) : "";
    group.plans.set(item.planId || date, date);
  });

  return [...groups.values()].map((g) => ({
    title: g.title,
    artist: g.artist,
    ccliNumber: g.ccliNumber,
    timesUsed: g.plans.size,
    planDates: [...g.plans.values()].filter(Boolean).sort().join("; ")
  })).sort(byTitle);
};

/** One row per song in the library, with every key it has (prefixed by arrangement when there are several). */
export const buildSongLibraryRows = (
  songDetails: ExportSongDetail[],
  arrangements: ExportArrangement[],
  keys: ExportArrangementKey[],
  links: ExportLink[]
): SongLibraryRow[] => {
  const ccli = ccliMap(links);
  const keysByArrangement = new Map<string, string[]>();
  keys.forEach((k) => {
    if (!k.arrangementId || !k.keySignature) return;
    const list = keysByArrangement.get(k.arrangementId) || [];
    if (!list.includes(k.keySignature)) list.push(k.keySignature);
    keysByArrangement.set(k.arrangementId, list);
  });

  const seen = new Set<string>();
  const rows: SongLibraryRow[] = [];
  songDetails.forEach((sd) => {
    const id = sd.songId || sd.id || "";
    if (!id || seen.has(id)) return;
    seen.add(id);
    const songArrangements = arrangements.filter((a) => (sd.songId ? a.songId === sd.songId : a.songDetailId === sd.id));
    const parts = songArrangements
      .map((a) => ({ name: a.name || "", list: keysByArrangement.get(a.id || "") || [] }))
      .filter((p) => p.list.length > 0)
      .map((p, _i, all) => (all.length > 1 ? `${p.name}: ${p.list.join(", ")}` : p.list.join(", ")));
    const ccliNumber = (sd.id && ccli.get(sd.id)) || "";
    rows.push({ title: sd.title || "", artist: sd.artist || "", ccliNumber, ccliLink: ccliSongUrl(ccliNumber), keys: parts.join("; ") });
  });
  return rows.sort(byTitle);
};

const csvValue = (value: unknown) => {
  let s = String(value ?? "");
  // A leading =, +, -, @ or control character runs as a formula in Excel/Sheets; a quote defuses it.
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, "\"\"")}"` : s;
};

export const toCsv = <T extends object>(headers: { label: string; key: keyof T & string }[], rows: T[]) =>
  [headers.map((h) => csvValue(h.label)).join(","), ...rows.map((r) => headers.map((h) => csvValue(r[h.key])).join(","))].join("\r\n");
