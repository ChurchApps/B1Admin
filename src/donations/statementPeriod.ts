// Statement years follow the church's "Statement year starts in" setting (statementYearStartMonth, 1-12, blank = January).
// A statement year is named by the calendar year it starts in: with a July start, 2025 runs July 1, 2025 to June 30, 2026.
// With the default January start every helper here gives the plain calendar year, so nothing changes for those churches.

type DateLike = string | Date | null | undefined;

const pad = (n: number) => String(n).padStart(2, "0");

export const parseStartMonth = (raw: unknown): number => {
  const month = parseInt(String(raw ?? ""), 10);
  return month >= 1 && month <= 12 ? month : 1;
};

// The recorded day of a gift: date-only strings are read as written, never shifted by the viewer's time zone.
const yearMonthOf = (value: DateLike): { year: number; month: number } | null => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : { year: value.getFullYear(), month: value.getMonth() + 1 };
  const match = /^(\d{4})-(\d{2})/.exec(value.toString());
  return match ? { year: parseInt(match[1], 10), month: parseInt(match[2], 10) } : null;
};

export const statementYearOf = (value: DateLike, startMonth: number): number | null => {
  const ym = yearMonthOf(value);
  if (!ym) return null;
  return ym.month >= startMonth ? ym.year : ym.year - 1;
};

export const currentStatementYear = (startMonth: number, today = new Date()): number => statementYearOf(today, startMonth) as number;

/** First and last day of the statement year, as YYYY-MM-DD. */
export const statementRange = (year: number, startMonth: number) => {
  if (startMonth === 1) return { startDate: `${year}-01-01`, endDate: `${year}-12-31` };
  const lastDay = new Date(year + 1, startMonth - 1, 0); // the day before the next start
  return { startDate: `${year}-${pad(startMonth)}-01`, endDate: `${lastDay.getFullYear()}-${pad(lastDay.getMonth() + 1)}-${pad(lastDay.getDate())}` };
};

/** Short name for titles and pills: "2025", or "2025–2026" when the year does not start in January. */
export const statementYearLabel = (year: number, startMonth: number) => (startMonth === 1 ? String(year) : `${year}–${year + 1}`);

export const monthName = (month: number, locale?: string) => new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(Date.UTC(2000, month - 1, 1));

/** Name for a year picker: "2025", or "July 2025 – June 2026". */
export const statementPeriodLabel = (year: number, startMonth: number, locale?: string) => {
  if (startMonth === 1) return String(year);
  return `${monthName(startMonth, locale)} ${year} – ${monthName(startMonth - 1, locale)} ${year + 1}`;
};

/** Local-midnight Dates for the first and last day, for printing with DateHelper.prettyDate. */
export const statementRangeDates = (year: number, startMonth: number) => {
  const { startDate, endDate } = statementRange(year, startMonth);
  return { start: new Date(startDate + "T00:00:00"), end: new Date(endDate + "T00:00:00") };
};
