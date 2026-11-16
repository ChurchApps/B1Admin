import { DateHelper } from "@churchapps/apphelper";

// 2026-01-04 was a Sunday, so day i of that week is weekday i (0 = Sunday).
export const weekdayName = (day: number, locale?: string) => new Date(2026, 0, 4 + day).toLocaleDateString(locale || DateHelper.locale, { weekday: "long" });

// The church's main worship day (the public "worshipDay" setting, getDay() numbering). Absent or invalid means Sunday.
export class WorshipDayHelper {
  static day = 0;

  static parse(value?: string | number | null) {
    if (value === null || value === undefined || value === "") return 0;
    const n = Number(value);
    return Number.isInteger(n) && n >= 0 && n <= 6 ? n : 0;
  }

  static set(value?: string | number | null) {
    WorshipDayHelper.day = WorshipDayHelper.parse(value);
  }

  static name(locale?: string) {
    return weekdayName(WorshipDayHelper.day, locale);
  }
}
