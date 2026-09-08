import React from "react";
import { Link } from "react-router-dom";
import { Locale } from "@churchapps/apphelper";
import { PlatedRecord, type PlatedSlice } from "../omarchy";
import { AttendanceSetup } from "./components/AttendanceSetup";
import { HeadcountEntry } from "./components/HeadcountEntry";
import { AttendanceIdentity, ThisWeekSlice } from "./components/AttendancePlate";
import { AttendanceYearLedger } from "./components/AttendanceYearLedger";
import { type AttendancePane, type LedgerKind } from "./components/AttendanceNavigation";
import { KioskThemeEdit } from "../mobile/KioskThemeEdit";
import "./attendance.css";

export const AttendancePage = () => {
  const [pane, setPane] = React.useState<AttendancePane>("");
  const [ledgerKind, setLedgerKind] = React.useState<LedgerKind>("attendance");

  const slice: PlatedSlice = pane === "years" ? "archive" : pane ? "edit" : "live";

  const back = (
    <button type="button" className="om-back" onClick={() => setPane("")}>← {Locale.label("attendance.attendancePage.att")}</button>
  );

  let edit: React.ReactNode = null;
  if (pane === "setup") {
    edit = <>{back}<AttendanceSetup /></>;
  } else if (pane === "kiosk") {
    edit = (
      <>
        {back}
        <KioskThemeEdit />
        <p className="om-quiet">
          <Link to="/mobile/checkin">{Locale.label("settings.checkinSettingsEdit.kioskLink")}</Link>
        </p>
      </>
    );
  } else if (pane === "headcount") {
    edit = <>{back}<HeadcountEntry /></>;
  }

  return (
    <PlatedRecord
      slice={slice}
      identity={<AttendanceIdentity pane={pane} onPane={setPane} />}
      live={<ThisWeekSlice onPane={setPane} />}
      archive={<>{back}<AttendanceYearLedger kind={ledgerKind} onKind={setLedgerKind} /></>}
      edit={edit}
    />
  );
};
