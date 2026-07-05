import { DateHelper } from "@churchapps/apphelper";

// Null/NaN-safe display formatter. DateHelper.prettyDate/getShortDate throw on invalid input,
// so the many local `if (!value) return ""` guards funnel through here instead.
// For `datetime-local` / date inputs use DateHelper.formatHtml5DateTime / formatHtml5Date directly.
export const formatDateSafe = (value: Date | string | null | undefined, fallback = ""): string => {
  if (!value) return fallback;
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? fallback : DateHelper.prettyDate(d);
};
