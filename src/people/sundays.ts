import { type AttendanceRecordInterface } from "@churchapps/helpers";
import { DateHelper } from "@churchapps/apphelper";

export const lastSundays = (count: number): Date[] => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const back = d.getDay() === 0 ? 0 : d.getDay();
  d.setDate(d.getDate() - back);
  const out: Date[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const x = new Date(d);
    x.setDate(d.getDate() - i * 7);
    out.push(x);
  }
  return out;
};

export const dateKey = (value?: string | Date | null) => {
  if (!value) return "";
  if (typeof value === "string") return value.split("T")[0];
  return DateHelper.formatHtml5Date(value);
};

export const attendanceOn = (records: AttendanceRecordInterface[], day: Date) => {
  const key = DateHelper.formatHtml5Date(day);
  return records.filter((r) => dateKey(r.visitDate) === key);
};
