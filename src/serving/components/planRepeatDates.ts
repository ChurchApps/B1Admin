// Date math for the repeat setting on Add a Plan. No imports, so node:test can load it directly.

export type PlanRepeatFrequency = "day" | "week" | "month";
export type PlanRepeatMonthMode = "monthDay" | "nthWeekday";

export interface PlanRepeatOptions {
  interval: number;
  frequency: PlanRepeatFrequency;
  monthMode: PlanRepeatMonthMode;
  count: number;
}

const LAST_ORDINAL = 4;

const lastDayOfMonth = (year: number, month: number) => new Date(year, month + 1, 0, 12, 0, 0).getDate();

// A fifth weekday doesn't exist in every month, so ordinal 4 means the last one, as RRuleEditor does.
const nthWeekdayOfMonth = (year: number, month: number, weekday: number, ordinal: number) => {
  if (ordinal >= LAST_ORDINAL) {
    const last = lastDayOfMonth(year, month);
    return last - ((new Date(year, month, last, 12, 0, 0).getDay() - weekday + 7) % 7);
  }
  return 1 + ((weekday - new Date(year, month, 1, 12, 0, 0).getDay() + 7) % 7) + 7 * ordinal;
};

// Every date comes from `first`, never the date before it, so the 31st stays the 31st after a short month.
export const getPlanRepeatDates = (first: Date, opts: PlanRepeatOptions): Date[] => {
  const year = first.getFullYear();
  const month = first.getMonth();
  const day = first.getDate();
  const dates: Date[] = [];
  for (let i = 0; i < opts.count; i++) {
    if (opts.frequency === "month") {
      const target = new Date(year, month + opts.interval * i, 1, 12, 0, 0);
      const targetYear = target.getFullYear();
      const targetMonth = target.getMonth();
      const targetDay = opts.monthMode === "nthWeekday"
        ? nthWeekdayOfMonth(targetYear, targetMonth, first.getDay(), Math.floor((day - 1) / 7))
        : Math.min(day, lastDayOfMonth(targetYear, targetMonth));
      dates.push(new Date(targetYear, targetMonth, targetDay, 12, 0, 0));
    } else {
      const step = opts.frequency === "week" ? 7 : 1;
      dates.push(new Date(year, month, day + step * opts.interval * i, 12, 0, 0));
    }
  }
  return dates;
};
