import { memo } from "react";
import { UserHelper, Permissions, Locale } from "@churchapps/apphelper";

export type AttendancePane = "" | "setup" | "kiosk" | "headcount" | "years";
export type LedgerKind = "attendance" | "headcount" | "groups";

interface Verb {
  value: AttendancePane;
  label: string;
  testId?: string;
}

export const attendanceVerbs = (): Verb[] => {
  const verbs: Verb[] = [{ value: "setup", label: Locale.label("attendance.tabs.setup") }];
  if (UserHelper.checkAccess(Permissions.membershipApi.settings.edit) || UserHelper.checkAccess(Permissions.attendanceApi.attendance.edit)) {
    verbs.push({ value: "kiosk", label: Locale.label("mobile.checkInPage.kiosk.sectionTitle") });
  }
  if (UserHelper.checkAccess(Permissions.attendanceApi.attendance.edit)) {
    verbs.push({ value: "headcount", label: Locale.label("attendance.tabs.headcounts"), testId: "attendance-tab-headcounts" });
  }
  if (UserHelper.checkAccess(Permissions.attendanceApi.attendance.view)) {
    verbs.push({ value: "years", label: Locale.label("groups.groupSessions.allYears") });
  }
  return verbs;
};

interface Props {
  pane: AttendancePane;
  onPane: (pane: AttendancePane) => void;
}

export const AttendanceNavigation = memo((props: Props) => {
  const verbs = attendanceVerbs();
  return (
    <div className="om-verbs">
      {verbs.map((v) => (
        <button key={v.value} type="button" data-testid={v.testId} onClick={() => props.onPane(props.pane === v.value ? "" : v.value)}>
          {v.label}
        </button>
      ))}
    </div>
  );
});
