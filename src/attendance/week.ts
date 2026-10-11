import { DateHelper } from "@churchapps/apphelper";

export const startOfSundayWeek = (d = new Date()) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - x.getDay());
  return x;
};

export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export const isoDate = (d: Date) => DateHelper.formatHtml5Date(d) || "";

// The API sends dates as UTC midnight; read the date part as local so a Sunday doesn't slip to Saturday.
export const parseDate = (value?: string | Date | null) => {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  const d = new Date(value.split("T")[0] + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
};
