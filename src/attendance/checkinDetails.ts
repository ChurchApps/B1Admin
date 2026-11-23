import { DateHelper, Locale } from "@churchapps/apphelper";

// What the Api returns about one check-in, on a session's visit and on a person's attendance record.
export interface CheckinDetails {
  checkinTime?: Date | string | null;
  checkoutTime?: Date | string | null;
  checkedOutBy?: string | null;
}

export const formatClockTime = (raw?: Date | string | null) => {
  if (!raw) return "";
  const d = raw instanceof Date ? raw : new Date(raw);
  if (isNaN(d.getTime())) return "";
  return DateHelper.prettyTime(d);
};

export interface CheckinDetailColumn {
  key: keyof CheckinDetails;
  label: () => string;
  // Header in the session CSV download.
  csvLabel: string;
  value: (details: CheckinDetails) => string;
  // Shown even when no row has a value; the others appear only once someone has one.
  always?: boolean;
}

// The check-in columns shown beside each other on the session roster and a person's attendance list.
export const checkinDetailColumns: CheckinDetailColumn[] = [
  { key: "checkinTime", csvLabel: "checkinTime", label: () => Locale.label("attendance.checkinDetails.checkedIn", "Checked In"), value: (d) => formatClockTime(d.checkinTime), always: true },
  { key: "checkoutTime", csvLabel: "checkoutTime", label: () => Locale.label("attendance.checkinDetails.checkedOut", "Checked Out"), value: (d) => formatClockTime(d.checkoutTime) },
  { key: "checkedOutBy", csvLabel: "pickedUpBy", label: () => Locale.label("attendance.checkinDetails.pickedUpBy", "Picked Up By"), value: (d) => d.checkedOutBy || "" }
];

export const visibleCheckinColumns = (rows: CheckinDetails[]) => checkinDetailColumns.filter((c) => c.always || rows.some((r) => c.value(r)));
