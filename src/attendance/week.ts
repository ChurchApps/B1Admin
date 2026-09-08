import { DateHelper } from "@churchapps/apphelper";

export const startOfSundayWeek = (d = new Date()) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - x.getDay());
  return x;
};

export const addDays = (d: Date, n: number) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  return x;
};

export const isoDate = (d: Date) => DateHelper.formatHtml5Date(d) || "";

export const parseDate = (value?: string | Date | null) => {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  const d = new Date(value.length <= 10 ? value + "T00:00:00" : value);
  return isNaN(d.getTime()) ? null : d;
};

export const yearOf = (value?: string | Date | null) => {
  const d = parseDate(value);
  return d ? d.getFullYear() : 0;
};
