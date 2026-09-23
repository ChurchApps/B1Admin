import { ApiHelper } from "@churchapps/apphelper";

// Client-side helpers for AI page generation: church records for the request, and stock photos for the result.

const FALLBACK_PHOTO = "/tempLibrary/backgrounds/worship.jpg";

/** Generated trees reference photos as "pexels:<search term>"; swap each for a real stock photo URL. */
export const resolvePhotos = async (sections: any[]): Promise<any[]> => {
  let json = JSON.stringify(sections);
  const terms = [...new Set([...json.matchAll(/pexels:([a-z ]+)/g)].map((m) => m[1]))];
  const used = new Set<string>();
  const urls = await Promise.all(terms.map(async (term) => {
    try {
      const results: { large?: string }[] = await ApiHelper.post("/stock/search", { term }, "ContentApi");
      // vary the pick so every church doesn't get the same first result, and never repeat a photo on one page
      const pool = (results || []).slice(0, 8).filter((r) => r.large && !used.has(r.large));
      const pick = pool[Math.floor(Math.random() * pool.length)]?.large;
      if (pick) used.add(pick);
      return pick || FALLBACK_PHOTO;
    } catch {
      return FALLBACK_PHOTO;
    }
  }));
  json = json.replace(/pexels:([a-z ]+)/g, (match, term) => urls[terms.indexOf(term)] ?? match);
  return JSON.parse(json);
};

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** "Sunday Morning Service" + "9:00 AM Service" -> { dayOfWeek: 0, time: "09:00" }; undefined when the names don't say. */
export const parseNextService = (services: { serviceName?: string; times?: { name?: string }[] }[]) => {
  const parsed: { dayOfWeek: number; time: string }[] = [];
  (services || []).forEach((s) => {
    const dayOfWeek = DAYS.findIndex((d) => (s.serviceName || "").toLowerCase().includes(d));
    (s.times || []).forEach((t) => {
      const m = (t.name || "").match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
      if (dayOfWeek < 0 || !m) return;
      const hour = (Number(m[1]) % 12) + (m[3].toLowerCase() === "pm" ? 12 : 0);
      parsed.push({ dayOfWeek, time: `${String(hour).padStart(2, "0")}:${m[2]}` });
    });
  });
  // the main weekly gathering: prefer Sunday, then the earliest time
  parsed.sort((a, b) => (a.dayOfWeek - b.dayOfWeek) || a.time.localeCompare(b.time));
  return parsed[0];
};

/** Facts the church already keeps in B1, so generated copy can use them without the user retyping them. */
export const gatherChurchFacts = async (churchId: string) => {
  const [services, groups] = await Promise.all([
    ApiHelper.getAnonymous(`/servicetimes/public/${churchId}`, "AttendanceApi").catch((): any[] => []),
    ApiHelper.getAnonymous(`/groups/public/${churchId}/list`, "MembershipApi").catch((): any[] => [])
  ]);
  const serviceList: any[] = Array.isArray(services) ? services : [];
  const groupList: any[] = Array.isArray(groups) ? groups : [];
  const facts: string[] = [];
  if (serviceList.length > 0) facts.push("Service times: " + serviceList.map((s) => `${s.serviceName}${s.campusName ? ` (${s.campusName})` : ""}: ${(s.times || []).map((t: any) => t.name).join(", ")}`).join("; ") + ".");
  if (groupList.length > 0) facts.push("Groups people can join: " + groupList.slice(0, 10).map((g) => g.name).filter(Boolean).join(", ") + ".");
  return { facts: facts.join(" "), hasServiceTimes: serviceList.length > 0, hasGroups: groupList.length > 0, nextService: parseNextService(serviceList) };
};
