import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { type AttendanceRecordInterface, type ConversationInterface, type DonationInterface, type GroupInterface, type GroupMemberInterface, type PersonInterface } from "@churchapps/helpers";
import { ApiHelper, ArrayHelper, CurrencyHelper, DateHelper, Locale, Permissions, UniqueIdHelper, UserHelper } from "@churchapps/apphelper";
import { useQuery } from "@tanstack/react-query";
import { attendanceOn, dateKey, lastSundays } from "../sundays";
import { type PersonFormOption } from "./PersonForms";

interface Props {
  person: PersonInterface;
  householdPeople?: PersonInterface[];
  forms: PersonFormOption[];
  onView: (view: string) => void;
}

const fmtDay = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

export const PersonPlate = (props: Props) => {
  const { person } = props;
  const canViewAttendance = UserHelper.checkAccess(Permissions.attendanceApi.attendance.view);
  const canViewGiving = UserHelper.checkAccess(Permissions.givingApi.donations.view);
  const canEdit = UserHelper.checkAccess(Permissions.membershipApi.people.edit);
  const [currency, setCurrency] = React.useState("usd");

  React.useEffect(() => {
    CurrencyHelper.loadCurrency().then((result) => setCurrency(result));
  }, []);

  const attendanceRecords = useQuery<AttendanceRecordInterface[]>({
    queryKey: ["/attendancerecords?personId=" + person.id, "AttendanceApi"],
    enabled: canViewAttendance && !UniqueIdHelper.isMissing(person.id),
    placeholderData: []
  });

  const groupsCatalog = useQuery<GroupInterface[]>({
    queryKey: ["/groups", "MembershipApi"],
    placeholderData: []
  });

  const groupMembers = useQuery<GroupMemberInterface[]>({
    queryKey: ["/groupmembers?personId=" + person.id, "MembershipApi"],
    enabled: !UniqueIdHelper.isMissing(person.id),
    placeholderData: []
  });

  const notesQuery = useQuery<ConversationInterface[]>({
    queryKey: ["/conversations/messages/person/" + person.id + "?limit=5", "MessagingApi"],
    enabled: canEdit && !UniqueIdHelper.isMissing(person.id),
    placeholderData: []
  });

  const donorIds = useMemo(() => {
    const ids = (props.householdPeople || [person]).map((p) => p.id).filter(Boolean) as string[];
    return ids.length ? ids : (person.id ? [person.id] : []);
  }, [props.householdPeople, person]);

  const donationsQuery = useQuery<DonationInterface[]>({
    queryKey: ["/donations?personId=" + person.id, "GivingApi"],
    enabled: canViewGiving && !UniqueIdHelper.isMissing(person.id),
    placeholderData: []
  });

  const [householdGifts, setHouseholdGifts] = React.useState<DonationInterface[]>([]);
  React.useEffect(() => {
    if (!canViewGiving || donorIds.length === 0) return;
    let cancelled = false;
    Promise.all(donorIds.map((id) => ApiHelper.get("/donations?personId=" + id, "GivingApi").catch(() => []))).then((all) => {
      if (cancelled) return;
      const merged = (all as DonationInterface[][]).flat();
      merged.sort((a, b) => dateKey(b.donationDate as any).localeCompare(dateKey(a.donationDate as any)));
      setHouseholdGifts(merged);
    });
    return () => { cancelled = true; };
  }, [canViewGiving, donorIds]);

  const weeks = lastSundays(13);
  const records = attendanceRecords.data || [];
  const here = weeks.map((d) => attendanceOn(records, d).length > 0);
  const hereCount = here.filter(Boolean).length;
  const todayIndex = here.length - 1;
  const thisSunday = weeks[todayIndex];
  const todayRecords = attendanceOn(records, thisSunday);
  const firstTime = person.membershipStatus === "Visitor" && records.length <= hereCount;

  let sundayText = "Not here this Sunday.";
  if (todayRecords.length > 0) {
    const where = todayRecords.map((r) => {
      const group = ArrayHelper.getOne(groupsCatalog.data || [], "id", r.groupId);
      return group?.name || r.service?.name || r.serviceTime?.name || "";
    }).filter(Boolean);
    if (firstTime) sundayText = "Here for the first time." + (where.length ? " " + where.join(", ") + "." : "");
    else sundayText = "Here." + (where.length ? " " + where.join(" · ") + "." : "");
  } else if (records.length > 0) {
    const latest = records.slice().sort((a, b) => dateKey(b.visitDate).localeCompare(dateKey(a.visitDate)))[0];
    if (latest?.visitDate) sundayText = "Last here " + DateHelper.prettyDate(new Date(dateKey(latest.visitDate) + "T00:00:00")) + ".";
  }

  const lastRows = records
    .slice()
    .sort((a, b) => dateKey(b.visitDate).localeCompare(dateKey(a.visitDate)))
    .slice(0, 3);

  const year = new Date().getFullYear();
  const gifts = (householdGifts.length ? householdGifts : (donationsQuery.data || []));
  const yearGifts = gifts.filter((d) => new Date((dateKey(d.donationDate as any) || "2000-01-01") + "T00:00:00").getFullYear() === year);
  const ytd = yearGifts.reduce((sum, d) => sum + (d.fund?.amount || d.amount || 0), 0);
  const recentGifts = gifts.slice(0, 4);

  const latestConv = (notesQuery.data || [])[0];
  const latestMsg = latestConv?.messages?.[0] || (latestConv as any)?.messages?.slice?.(-1)?.[0];
  const noteCount = (notesQuery.data || []).reduce((n, c) => n + ((c.messages || []).length || 0), 0) || (notesQuery.data || []).length;

  const submissions = person.formSubmissions || [];
  const submittedIds = new Set(submissions.map((fs) => fs.formId));

  return (
    <>
      <div>
        <h3 style={{ marginTop: 0 }}>This Sunday</h3>
        <p>{sundayText}</p>
      </div>

      {canViewAttendance && (
        <div>
          <h3><button type="button" className="back" role="tab" onClick={() => props.onView("sundays")} style={{ textTransform: "none", letterSpacing: 0, fontSize: "0.72rem" }}>Attendance</button></h3>
          <div className="sundays">
            {here.map((v, i) => (
              <span key={i} className={`sun${v ? " on" : ""}${i === todayIndex ? " today" : ""}`} title={fmtDay(weeks[i])} />
            ))}
          </div>
          <p className="muted">
            {hereCount} of the last 13 Sundays ·{" "}
            <button type="button" className="back" onClick={() => props.onView("sundays")}>All years</button>
            {" · "}
            <button type="button" className="back" onClick={() => window.print()}>{Locale.label("common.print")}</button>
          </p>
          {lastRows.length > 0 && (
            <table className="plain">
              <thead><tr><th>Date</th><th>Service</th><th>Where</th></tr></thead>
              <tbody>
                {lastRows.map((r, i) => {
                  const group = ArrayHelper.getOne(groupsCatalog.data || [], "id", r.groupId);
                  const day = r.visitDate ? DateHelper.prettyDate(new Date(dateKey(r.visitDate) + "T00:00:00")) : "";
                  return (
                    <tr key={i}>
                      <td>{day}</td>
                      <td>{r.service?.name || r.serviceTime?.name || ""}</td>
                      <td>{group ? <Link to={"/groups/" + group.id}>{group.name}</Link> : ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {canViewGiving && (
        <div>
          <h3><button type="button" className="back" onClick={() => props.onView("gifts")} style={{ textTransform: "none", letterSpacing: 0, fontSize: "0.72rem" }}>Donations</button></h3>
          {gifts.length === 0 ? (
            <>
              <p className="muted">No gifts yet.</p>
              <p className="muted" style={{ marginTop: 8 }}>
                <button type="button" className="back" onClick={() => props.onView("log")}>Log a gift</button>
              </p>
            </>
          ) : (
            <>
              <p className="muted">{CurrencyHelper.formatCurrencyWithLocale(ytd, currency)} this year</p>
              <table className="plain">
                <thead><tr><th>Date</th><th>Fund</th><th>Amount</th></tr></thead>
                <tbody>
                  {recentGifts.map((g, i) => (
                    <tr key={g.id || i}>
                      <td>{g.donationDate ? DateHelper.prettyDate(new Date(dateKey(g.donationDate as any) + "T00:00:00")) : ""}</td>
                      <td>{g.fund?.name || ""}</td>
                      <td className="amt">{CurrencyHelper.formatCurrencyWithLocale(g.fund?.amount || g.amount || 0, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="muted" style={{ marginTop: 10 }}>
                <button type="button" className="back" onClick={() => props.onView("log")}>Log a gift</button>
                {" · "}
                <button type="button" className="back" onClick={() => props.onView("gifts")}>All years</button>
                {" · "}
                <a className="back" href={"/donations/print/" + person.id + "?year=" + year}>Statement</a>
              </p>
            </>
          )}
        </div>
      )}

      <div>
        <h3><button type="button" className="back" onClick={() => props.onView("groups")} style={{ textTransform: "none", letterSpacing: 0, fontSize: "0.72rem" }}>Groups</button></h3>
        {(groupMembers.data || []).length === 0 ? (
          <p className="muted">{Locale.label("people.groups.notMemMsg")}</p>
        ) : (
          <div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {(groupMembers.data || []).map((gm) => (
                <li key={gm.id} style={{ display: "inline" }}>
                  <Link className="gchip" to={"/groups/" + gm.groupId}>
                    <b>{gm.group?.name || Locale.label("people.groups.unknownGroup")}</b>
                    <span>{gm.group?.categoryName || ""}{gm.leader ? " · leader" : ""}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {canEdit && (
        <div>
          <h3><button type="button" className="back" role="tab" onClick={() => props.onView("notes")} style={{ textTransform: "none", letterSpacing: 0, fontSize: "0.72rem" }}>Notes</button></h3>
          {latestMsg ? (
            <>
              <div className="note">
                <div className="by">{latestMsg.timeSent ? DateHelper.prettyDate(new Date(latestMsg.timeSent)) : ""} · {latestMsg.displayName || ""}</div>
                <p className="note-preview">{latestMsg.content}</p>
              </div>
              <p className="muted">
                {noteCount} notes · <button type="button" className="back" onClick={() => props.onView("notes")}>All notes</button>
              </p>
            </>
          ) : (
            <>
              <p className="muted">No notes yet.</p>
              <p className="muted"><button type="button" className="back" onClick={() => props.onView("notes")}>All notes</button></p>
            </>
          )}
        </div>
      )}

      {props.forms.length > 0 && (
        <div>
          <h3><button type="button" className="back" onClick={() => props.onView("forms")} style={{ textTransform: "none", letterSpacing: 0, fontSize: "0.72rem" }}>Forms</button></h3>
          {props.forms.map((f) => (
            <button key={f.id} type="button" className="form-row" onClick={() => props.onView("forms")}>
              <span>{f.name}</span>
              <span className={submittedIds.has(f.id) ? "ok" : "muted"}>{submittedIds.has(f.id) ? "complete" : "open"}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
};
