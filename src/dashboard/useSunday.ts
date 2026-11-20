import { ApiHelper, ArrayHelper, DateHelper, Permissions, UserHelper } from "@churchapps/apphelper";
import type { ApiListType, AssignmentInterface, GroupInterface, PersonInterface, PositionInterface, TimeInterface, VisitInterface } from "@churchapps/helpers";
import { useQuery } from "@tanstack/react-query";
import { type PlanInterface, type PlanItemInterface, hasPlansEditAccess } from "../helpers";
import { WorshipDayHelper } from "../helpers/WorshipDayHelper";
import type { HeadcountInterface } from "../attendance/components/HeadcountEntry";

export interface OrderItem {
  label: string;
  startSeconds: number;
  seconds: number;
  now: boolean;
}

export interface ServingPerson {
  personId: string;
  name: string;
  role: string;
}

export interface GuestChip {
  key: string;
  label: string;
  first: boolean;
  href?: string;
}

export interface RoomCount {
  groupId: string;
  name: string;
  count: number;
  capacity?: number;
}

export interface SundayData {
  plan?: PlanInterface | null;
  canOpenPlan?: boolean;
  planStart?: Date | null;
  focusDate?: Date | null;
  order: OrderItem[];
  inRoom: number;
  live: boolean;
  recap: boolean;
  isSunday: boolean; // today is the church's worship day
  split?: string;
  serving: ServingPerson[];
  guests: GuestChip[];
  rooms: RoomCount[];
}

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

const planTime = (p: PlanInterface) => {
  const t = p.serviceDate ? DateHelper.toDate(p.serviceDate).getTime() : NaN;
  return Number.isNaN(t) ? 0 : startOfDay(new Date(t)).getTime();
};

const inWindow = (p: PlanInterface, from: Date, to: Date) => {
  const t = planTime(p);
  return t >= from.getTime() && t <= to.getTime();
};

// Days since the church's worship day (Sunday unless the worshipDay setting says otherwise).
const daysSinceWorshipDay = (d: Date) => (d.getDay() - WorshipDayHelper.day + 7) % 7;

const worshipDayOnOrBefore = (d: Date) => addDays(d, -daysSinceWorshipDay(d));

const worshipDayAhead = (d: Date) => {
  const last = worshipDayOnOrBefore(d);
  return last.getTime() === d.getTime() ? last : addDays(last, 7);
};

const pickPlan = (plans: PlanInterface[], prefer: Date, planTimes?: Map<string, number>) => {
  if (!plans.length) return null;
  const preferT = prefer.getTime();
  const scored = [...plans].sort((a, b) => {
    const da = Math.abs(planTime(a) - preferT);
    const db = Math.abs(planTime(b) - preferT);
    if (da !== db) return da - db;
    if (!!a.serviceOrder !== !!b.serviceOrder) return a.serviceOrder ? -1 : 1;
    // When on same day, use earliest service time
    if (planTimes && a.id && b.id) {
      const ta = planTimes.get(a.id) ?? Infinity;
      const tb = planTimes.get(b.id) ?? Infinity;
      if (ta !== tb) return ta - tb;
    }
    return planTime(a) - planTime(b);
  });
  return scored[0];
};

const flattenOrder = (items: PlanItemInterface[], acc = 0): { label: string; startSeconds: number; seconds: number }[] => {
  const out: { label: string; startSeconds: number; seconds: number }[] = [];
  (items || []).forEach((item) => {
    const kids = item.children || [];
    if (item.itemType === "header" && kids.length > 0) {
      const child = flattenOrder(kids, acc);
      out.push(...child);
      acc += child.reduce((s, c) => s + (c.seconds || 0), 0);
    } else {
      const label = (item.label || item.description || "").trim();
      const seconds = item.seconds || 0;
      if (label) out.push({ label, startSeconds: acc, seconds });
      acc += seconds;
      if (kids.length > 0) {
        const child = flattenOrder(kids, acc);
        out.push(...child);
        acc += child.reduce((s, c) => s + (c.seconds || 0), 0);
      }
    }
  });
  return out;
};

const safeGet = async <T>(url: string, api: ApiListType, fallback: T): Promise<T> => {
  try {
    const data = await ApiHelper.get(url, api);
    return (data ?? fallback) as T;
  } catch {
    return fallback;
  }
};

const loadSunday = async (): Promise<SundayData> => {
  const today = startOfDay(new Date());
  const lastWorshipDay = worshipDayOnOrBefore(today);
  const comingWorshipDay = worshipDayAhead(today);
  const isWorshipDay = lastWorshipDay.getTime() === today.getTime();
  const from = lastWorshipDay;
  const to = comingWorshipDay;

  let plans = await safeGet<PlanInterface[]>("/plans/presenter", "DoingApi", []);
  if (!plans.length) {
    const all = await safeGet<PlanInterface[]>("/plans", "DoingApi", []);
    plans = all.filter((p) => inWindow(p, from, to));
  } else {
    plans = plans.filter((p) => inWindow(p, from, to));
  }

  // Load times for all plans to pick earliest service on same day
  const planTimes = new Map<string, number>();
  await Promise.all(plans.map(async (p) => {
    if (!p.id) return;
    const times = await safeGet<TimeInterface[]>("/times/plan/" + p.id, "DoingApi", []);
    const serviceTimes = times.filter((t) => (t.serviceTimeType ?? "service") === "service");
    if (serviceTimes.length > 0) {
      serviceTimes.sort((a, b) => new Date(a.startTime || 0).getTime() - new Date(b.startTime || 0).getTime());
      const earliest = serviceTimes[0].startTime;
      if (earliest) planTimes.set(p.id, new Date(earliest).getTime());
    }
  }));

  const upcoming = plans.filter((p) => planTime(p) >= today.getTime());
  const servingPlan = pickPlan(upcoming, comingWorshipDay, planTimes);
  const plan = servingPlan || pickPlan(plans, lastWorshipDay, planTimes);
  const attendanceDay = isWorshipDay ? today : lastWorshipDay;
  const dateStr = DateHelper.formatHtml5Date(attendanceDay);
  const canAttendance = UserHelper.checkAccess(Permissions.attendanceApi.attendance.view);
  const canPeople = UserHelper.checkAccess(Permissions.membershipApi.people.view);
  const assignPlan = servingPlan || (isWorshipDay ? plan : null);

  const [planItems, times, positions, assignments] = await Promise.all([
    plan?.id ? safeGet<PlanItemInterface[]>("/planItems/plan/" + plan.id, "DoingApi", []) : Promise.resolve([]),
    plan?.id ? safeGet<TimeInterface[]>("/times/plan/" + plan.id, "DoingApi", []) : Promise.resolve([]),
    assignPlan?.id ? safeGet<PositionInterface[]>("/positions/plan/" + assignPlan.id, "DoingApi", []) : Promise.resolve([]),
    assignPlan?.id ? safeGet<AssignmentInterface[]>("/assignments/plan/" + assignPlan.id, "DoingApi", []) : Promise.resolve([])
  ]);
  const [visits, groupRows, headcounts, groups] = await Promise.all([
    canAttendance ? safeGet<VisitInterface[]>(`/attendancerecords/search?startDate=${dateStr}&endDate=${dateStr}`, "AttendanceApi", []) : Promise.resolve([]),
    canAttendance ? safeGet<{ groupId?: string; groupName?: string }[]>(`/attendancerecords/groups?serviceId=0&week=${dateStr}`, "AttendanceApi", []) : Promise.resolve([]),
    canAttendance ? safeGet<HeadcountInterface[]>("/headcounts", "AttendanceApi", []) : Promise.resolve([]),
    safeGet<GroupInterface[]>("/groups", "MembershipApi", [])
  ]);

  const serviceTimes = (times || []).filter((t) => (t.serviceTimeType ?? "service") === "service");
  serviceTimes.sort((a, b) => new Date(a.startTime || 0).getTime() - new Date(b.startTime || 0).getTime());
  const planStart = serviceTimes[0]?.startTime ? new Date(serviceTimes[0].startTime) : (plan?.serviceDate ? DateHelper.toDate(plan.serviceDate) : null);

  const rawOrder = flattenOrder(planItems || []);
  const nowMs = Date.now();
  const startMs = planStart && !Number.isNaN(planStart.getTime()) ? planStart.getTime() : 0;
  const order: OrderItem[] = rawOrder.map((item) => {
    const itemStart = startMs + item.startSeconds * 1000;
    const itemEnd = itemStart + Math.max(item.seconds, 60) * 1000;
    const now = !!startMs && nowMs >= itemStart && nowMs < itemEnd;
    return { ...item, now };
  });

  const visitList = Array.isArray(visits) ? visits : [];
  const personIds = ArrayHelper.getUniqueValues(visitList, "personId").filter(Boolean) as string[];
  let inRoom = personIds.length;
  if (!inRoom && headcounts?.length) {
    inRoom = headcounts
      .filter((h) => DateHelper.formatHtml5Date(new Date(h.headcountDate || "")) === dateStr)
      .reduce((sum: number, h) => sum + (Number(h.value) || 0), 0);
  }

  const live = isWorshipDay && inRoom > 0;
  const recap = !isWorshipDay && inRoom > 0;

  const roomMap = new Map<string, { count: number; name?: string }>();
  (groupRows || []).forEach((row) => {
    if (!row.groupId) return;
    const cur = roomMap.get(row.groupId) || { count: 0, name: row.groupName };
    cur.count += 1;
    roomMap.set(row.groupId, cur);
  });
  const rooms: RoomCount[] = Array.from(roomMap.entries()).map(([groupId, v]) => {
    const group = ArrayHelper.getOne(groups || [], "id", groupId) as GroupInterface | null;
    return {
      groupId,
      name: group?.name || v.name || "Room",
      count: v.count,
      capacity: group?.capacity
    };
  }).sort((a, b) => b.count - a.count);

  const split = rooms.length ? rooms.map((r) => `${r.name} ${r.count}`).join(" · ") : undefined;

  const servingIds = ArrayHelper.getUniqueValues(assignments || [], "personId").filter(Boolean) as string[];
  const peopleIds = Array.from(new Set([...servingIds, ...personIds]));
  const people = (canPeople && peopleIds.length > 0)
    ? await safeGet<PersonInterface[]>("/people/ids?ids=" + peopleIds.join(","), "MembershipApi", [])
    : [];
  const rank = new Map(people.map((p, i) => [p.id, i]));

  const serving: ServingPerson[] = [];
  (assignments || []).forEach((a) => {
    if (!a.personId || a.status === "Declined") return;
    const person = ArrayHelper.getOne(people, "id", a.personId) as PersonInterface | null;
    const position = ArrayHelper.getOne(positions || [], "id", a.positionId) as PositionInterface | null;
    const name = person?.name?.display || "";
    if (!name) return;
    serving.push({
      personId: a.personId,
      name,
      role: position?.name || position?.categoryName || ""
    });
  });
  serving.sort((a, b) => (rank.get(a.personId) ?? Infinity) - (rank.get(b.personId) ?? Infinity));

  const guests: GuestChip[] = [];
  if (canPeople && personIds.length) {
    const byHousehold = new Map<string, PersonInterface[]>();
    [...personIds].sort((a, b) => (rank.get(a) ?? Infinity) - (rank.get(b) ?? Infinity)).forEach((id) => {
      const person = ArrayHelper.getOne(people, "id", id) as PersonInterface | null;
      if (!person) return;
      const visit = visitList.find((v) => v.personId === id);
      const status = (person.membershipStatus || "").toLowerCase();
      const first = status === "visitor" || status === "guest" || visit?.checkinType === "guest";
      if (!first) return;
      const hid = person.householdId || id;
      const list = byHousehold.get(hid) || [];
      list.push(person);
      byHousehold.set(hid, list);
    });
    byHousehold.forEach((members, hid) => {
      const last = members[0]?.name?.last || members[0]?.name?.display || "Guest";
      const href = members[0]?.id ? "/people/" + members[0].id : undefined;
      guests.push({
        key: hid,
        label: members.length > 1 ? `${last} · ${members.length}` : (members[0]?.name?.display || last),
        first: true,
        href
      });
    });
  }

  // Same rule as the Serving menu: plan editors, the plan's ministry, or people serving on it.
  const myPersonId = UserHelper.person?.id;
  const servingOnPlan = !!myPersonId && assignPlan?.id === plan?.id && (assignments || []).some((a) => a.personId === myPersonId);
  const canOpenPlan = !!plan?.id && (hasPlansEditAccess() || servingOnPlan
    || (!!plan.ministryId && (await safeGet<GroupInterface[]>("/groups/my/ministry", "MembershipApi", [])).some((g) => g.id === plan.ministryId)));

  const focusDate = plan?.serviceDate ? startOfDay(DateHelper.toDate(plan.serviceDate)) : comingWorshipDay;
  return { plan, canOpenPlan, planStart, focusDate, order, inRoom, live, recap, isSunday: isWorshipDay, split, serving, guests, rooms };
};

export const useSunday = () => {
  const churchId = UserHelper.currentUserChurch?.church?.id;
  return useQuery<SundayData>({
    queryKey: ["sunday-home", churchId, WorshipDayHelper.day],
    queryFn: loadSunday,
    enabled: !!churchId,
    placeholderData: { plan: null, planStart: null, focusDate: null, order: [], inRoom: 0, live: false, recap: false, isSunday: false, serving: [], guests: [], rooms: [] }
  });
};
