type DateLike = string | Date | undefined | null;

// Date-only strings ("2026-01-01" or "2026-01-01T00:00:00Z") are read as local dates so Jan 1 doesn't slip to the prior year.
export const yearOf = (value: DateLike): number | null => {
  if (!value) return null;
  const year = value instanceof Date ? value.getFullYear() : new Date(value.toString().split("T")[0] + "T00:00:00").getFullYear();
  return Number.isNaN(year) ? null : year;
};

/** Distinct years present in the dates, newest first. */
export const yearsFromDates = (dates: DateLike[]): number[] => {
  const set = new Set<number>();
  dates.forEach((d) => {
    const y = yearOf(d);
    if (y !== null) set.add(y);
  });
  return Array.from(set).sort((a, b) => b - a);
};

export const withCurrentYear = (years: number[], current = new Date().getFullYear()): number[] => (years.includes(current) ? years : [current, ...years].sort((a, b) => b - a));

/** This year if it has data, else the newest year with data, else this year. */
export const pickDefaultYear = (years: number[], current = new Date().getFullYear()): number => (years.includes(current) ? current : years[0] ?? current);

/** The last `count` years, newest first. */
export const recentYears = (count = 10, current = new Date().getFullYear()): number[] => Array.from({ length: count }, (_, i) => current - i);
