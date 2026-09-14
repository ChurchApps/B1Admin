export interface PlacementWeek {
  week?: number;
  lessonId?: string;
  lessonName?: string;
  studyId?: string;
  studyName?: string;
  programId?: string;
  venueId?: string;
  venueName?: string;
  externalProviderId?: string;
  anchor?: string;
}

export interface PlacementRow {
  week: PlacementWeek;
  date: Date;
  included: boolean;
  skipReason?: string;
  note?: string;
  path?: string;
}

export interface PlacementReasons {
  externalSkipped: string;
  missingVenue: string;
  dateTaken: string;
  anchoredEaster: string;
  anchoredChristmas: string;
  shiftedWeek: string;
  segmentOverflow: string;
}

export interface PlaceYearPlanArgs {
  weeks: PlacementWeek[];
  startMonth?: number | null;
  startDate: Date;
  endDate?: Date;
  weekCount?: number;
  occupiedDates: Set<string>;
  excluded: Set<number>;
  reasons: PlacementReasons;
}

const noon = (year: number, monthIndex: number, day: number) => new Date(year, monthIndex, day, 12, 0, 0);

export const addWeeks = (start: Date, weeks: number) => {
  const d = noon(start.getFullYear(), start.getMonth(), start.getDate());
  d.setDate(d.getDate() + (weeks * 7));
  return d;
};

export const dateKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const venuePath = (week: PlacementWeek) => {
  if (!week.programId || !week.studyId || !week.lessonId || !week.venueId) return "";
  return `/lessons/${week.programId}/${week.studyId}/${week.lessonId}/${week.venueId}`;
};

/** Anonymous Gregorian computus. */
export const easterSunday = (year: number) => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return noon(year, month - 1, day);
};

export const sundayOnOrBefore = (d: Date) => {
  const result = noon(d.getFullYear(), d.getMonth(), d.getDate());
  result.setDate(result.getDate() - result.getDay());
  return result;
};

export const sundayOnOrAfter = (d: Date) => {
  const result = noon(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = result.getDay();
  if (dow !== 0) result.setDate(result.getDate() + (7 - dow));
  return result;
};

export const christmasSunday = (year: number) => sundayOnOrBefore(noon(year, 11, 25));

export const firstSundayOfMonth = (year: number, month: number) => sundayOnOrAfter(noon(year, month - 1, 1));

export const defaultRange = (startMonth: number, targetYear: number) => {
  const start = firstSundayOfMonth(targetYear, startMonth);
  const endYear = startMonth === 1 ? targetYear : targetYear + 1;
  const endMonth = startMonth === 1 ? 12 : startMonth - 1;
  const lastDay = noon(endYear, endMonth, 0);
  return { start, end: sundayOnOrBefore(lastDay) };
};

export const sundaysInRange = (start: Date, end: Date) => {
  const sundays: Date[] = [];
  let cursor = sundayOnOrAfter(start);
  const last = sundayOnOrBefore(end);
  while (cursor.getTime() <= last.getTime()) {
    sundays.push(new Date(cursor.getTime()));
    cursor = addWeeks(cursor, 1);
  }
  return sundays;
};

const resolveAnchorDate = (anchor: string, start: Date, end: Date) => {
  const years = Array.from(new Set([start.getFullYear(), end.getFullYear(), start.getFullYear() + 1]));
  for (const year of years) {
    const date = anchor === "easter" ? easterSunday(year) : christmasSunday(year);
    if (date.getTime() >= sundayOnOrAfter(start).getTime() && date.getTime() <= sundayOnOrBefore(end).getTime()) return date;
  }
  const year = start.getFullYear();
  return anchor === "easter" ? easterSunday(year) : christmasSunday(year);
};

const sequentialPlace = (args: PlaceYearPlanArgs): PlacementRow[] => {
  const weeks = args.weeks.slice(0, Math.max(1, args.weekCount || args.weeks.length));
  return weeks.map((week, i) => {
    const date = addWeeks(args.startDate, i);
    const path = venuePath(week);
    let skipReason = "";
    if (week.externalProviderId) skipReason = args.reasons.externalSkipped;
    else if (!path) skipReason = args.reasons.missingVenue;
    else if (args.occupiedDates.has(dateKey(date))) skipReason = args.reasons.dateTaken;
    return { week, date, path: path || undefined, included: !skipReason, skipReason: skipReason || undefined };
  });
};

interface Pin {
  index: number;
  runStart: number;
  date: Date;
}

const buildPins = (weeks: PlacementWeek[], start: Date, end: Date): Pin[] => {
  const pins: Pin[] = [];
  for (let i = 0; i < weeks.length; i++) {
    const anchor = weeks[i].anchor;
    if (anchor !== "easter" && anchor !== "christmas") continue;
    const studyId = weeks[i].studyId;
    let runStart = i;
    while (runStart > 0 && !weeks[runStart - 1].anchor && studyId && weeks[runStart - 1].studyId === studyId) {
      runStart--;
    }
    pins.push({ index: i, runStart, date: resolveAnchorDate(anchor, start, end) });
  }
  return pins;
};

const buildRow = (week: PlacementWeek, date: Date | undefined, args: PlaceYearPlanArgs, extras: { overflow?: boolean; shifted?: boolean; fallbackDate: Date }): PlacementRow => {
  const path = venuePath(week);
  const displayDate = date || extras.fallbackDate;
  let skipReason: string | undefined;
  let note: string | undefined;
  if (week.externalProviderId) skipReason = args.reasons.externalSkipped;
  else if (!path) skipReason = args.reasons.missingVenue;
  else if (extras.overflow || !date) skipReason = args.reasons.segmentOverflow;
  else if (args.occupiedDates.has(dateKey(date))) skipReason = args.reasons.dateTaken;
  if (!skipReason && week.anchor === "easter") note = args.reasons.anchoredEaster;
  else if (!skipReason && week.anchor === "christmas") note = args.reasons.anchoredChristmas;
  else if (!skipReason && extras.shifted) note = args.reasons.shiftedWeek;
  return {
    week,
    date: displayDate,
    path: path || undefined,
    included: !skipReason,
    skipReason,
    note
  };
};

const calendarPlace = (args: PlaceYearPlanArgs): PlacementRow[] => {
  const weeks = args.weeks;
  const start = sundayOnOrAfter(args.startDate);
  const end = sundayOnOrBefore(args.endDate || addWeeks(start, Math.max(weeks.length, 1) - 1));
  const allSundays = sundaysInRange(start, end);
  const assigned: Array<Date | undefined> = new Array(weeks.length);
  const overflow = new Array(weeks.length).fill(false);
  const shifted = new Array(weeks.length).fill(false);
  const reserved = new Set<string>();
  const inPinnedRun = new Array(weeks.length).fill(false);

  const pins = buildPins(weeks, start, end);
  for (const pin of pins) {
    const runLen = pin.index - pin.runStart + 1;
    for (let k = 0; k < runLen; k++) {
      const date = addWeeks(pin.date, k - (runLen - 1));
      const idx = pin.runStart + k;
      assigned[idx] = date;
      inPinnedRun[idx] = true;
      reserved.add(dateKey(date));
      if (date.getTime() < start.getTime() || date.getTime() > end.getTime()) overflow[idx] = true;
    }
  }

  let i = 0;
  while (i < weeks.length) {
    if (inPinnedRun[i]) { i++; continue; }
    const segStart = i;
    while (i < weeks.length && !inPinnedRun[i]) i++;
    const segEnd = i;

    const prevPin = [...pins].reverse().find(p => p.index < segStart);
    const nextPin = pins.find(p => p.runStart >= segEnd);
    const windowStart = prevPin ? addWeeks(prevPin.date, 1) : start;
    const windowEnd = nextPin ? addWeeks(assigned[nextPin.runStart] || nextPin.date, -1) : end;

    const windowSundays = allSundays.filter(d => d.getTime() >= windowStart.getTime() && d.getTime() <= windowEnd.getTime() && !reserved.has(dateKey(d)));
    let sundayIdx = 0;
    let skippedOccupied = false;
    for (let w = segStart; w < segEnd; w++) {
      const week = weeks[w];
      const path = venuePath(week);
      const unschedulable = !!(week.externalProviderId || !path);
      if (unschedulable || args.excluded.has(w)) {
        assigned[w] = windowSundays[sundayIdx] || windowSundays[windowSundays.length - 1] || windowEnd;
        continue;
      }
      while (sundayIdx < windowSundays.length && args.occupiedDates.has(dateKey(windowSundays[sundayIdx]))) {
        skippedOccupied = true;
        sundayIdx++;
      }
      if (sundayIdx >= windowSundays.length) {
        overflow[w] = true;
        assigned[w] = windowEnd;
        continue;
      }
      assigned[w] = windowSundays[sundayIdx];
      if (skippedOccupied) shifted[w] = true;
      sundayIdx++;
    }
  }

  return weeks.map((week, idx) => buildRow(week, overflow[idx] ? undefined : assigned[idx], args, {
    overflow: overflow[idx],
    shifted: shifted[idx],
    fallbackDate: assigned[idx] || end
  }));
};

export const placeYearPlanWeeks = (args: PlaceYearPlanArgs): PlacementRow[] => {
  if (!args.startMonth) return sequentialPlace(args);
  return calendarPlace(args);
};
