import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrayHelper, DateHelper, Loading, Locale, Permissions, UserHelper } from "@churchapps/apphelper";
import { type GroupInterface, type PersonInterface, type ServiceInterface } from "@churchapps/helpers";
import { AttendanceNavigation, type AttendancePane } from "./AttendanceNavigation";
import { type HeadcountInterface } from "./HeadcountEntry";
import { addDays, isoDate, parseDate, startOfSundayWeek } from "../week";

interface TrendRow {
  week: string;
  visits: number;
}

interface GroupWeekRow {
  serviceName?: string;
  serviceTimeName?: string;
  groupId?: string;
  personId?: string;
}

interface VisitRow {
  id?: string;
  personId?: string;
  serviceId?: string;
  visitDate?: string;
  checkinType?: string;
}

const inWeek = (value: string | Date | undefined, start: Date, end: Date) => {
  const d = parseDate(value);
  if (!d) return false;
  return d >= start && d <= end;
};

export const useThisWeekAttendance = () => {
  const weekStart = useMemo(() => startOfSundayWeek(), []);
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);
  const weekStartIso = isoDate(weekStart);
  const weekEndIso = isoDate(weekEnd);
  const canView = UserHelper.checkAccess(Permissions.attendanceApi.attendance.view);
  const canViewSummary = UserHelper.checkAccess(Permissions.attendanceApi.attendance.viewSummary);

  const visits = useQuery<VisitRow[]>({
    queryKey: ["/attendancerecords/search?startDate=" + weekStartIso + "&endDate=" + weekEndIso, "AttendanceApi"],
    enabled: canView,
    placeholderData: []
  });

  const groupWeek = useQuery<GroupWeekRow[]>({
    queryKey: ["/attendancerecords/groups?serviceId=0&week=" + weekStartIso, "AttendanceApi"],
    enabled: canView,
    placeholderData: []
  });

  const headcounts = useQuery<HeadcountInterface[]>({
    queryKey: ["/headcounts", "AttendanceApi"],
    enabled: canView,
    placeholderData: []
  });

  const trend = useQuery<TrendRow[]>({
    queryKey: ["/attendancerecords/trend?campusId=0&serviceId=0&serviceTimeId=0&groupId=0", "AttendanceApi"],
    enabled: canViewSummary,
    placeholderData: []
  });

  const groups = useQuery<GroupInterface[]>({
    queryKey: ["/groups", "MembershipApi"],
    placeholderData: []
  });

  const services = useQuery<ServiceInterface[]>({
    queryKey: ["/services", "AttendanceApi"],
    placeholderData: []
  });

  const weekHeadcounts = useMemo(
    () => (headcounts.data || []).filter((h) => inWeek(h.headcountDate, weekStart, weekEnd)),
    [headcounts.data, weekStart, weekEnd]
  );

  const namedIds = useMemo(() => {
    const ids = new Set<string>();
    (visits.data || []).forEach((v) => { if (v.personId) ids.add(v.personId); });
    (groupWeek.data || []).forEach((r) => { if (r.personId) ids.add(r.personId); });
    return [...ids];
  }, [visits.data, groupWeek.data]);

  const guestIds = useMemo(() => {
    const ids = new Set<string>();
    (visits.data || []).forEach((v) => { if (v.checkinType === "guest" && v.personId) ids.add(v.personId); });
    return [...ids];
  }, [visits.data]);

  const people = useQuery<PersonInterface[]>({
    queryKey: ["/people/ids?ids=" + namedIds.join(","), "MembershipApi"],
    enabled: namedIds.length > 0,
    placeholderData: []
  });

  const namedCount = namedIds.length;
  const headcountTotal = weekHeadcounts.reduce((sum, h) => sum + (h.value || 0), 0);
  const inRoom = headcountTotal > 0 ? headcountTotal : namedCount;

  const rooms = useMemo(() => {
    const byGroup: Record<string, Set<string>> = {};
    (groupWeek.data || []).forEach((r) => {
      if (!r.groupId) return;
      (byGroup[r.groupId] ||= new Set()).add(r.personId || "");
    });
    return Object.keys(byGroup).map((id) => {
      const group = ArrayHelper.getOne(groups.data || [], "id", id) as GroupInterface | null;
      const count = [...byGroup[id]].filter(Boolean).length;
      return { id, name: group?.name || id, count, capacity: group?.capacity || 0 };
    }).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [groupWeek.data, groups.data]);

  const serviceSplit = useMemo(() => {
    const counts: Record<string, Set<string>> = {};
    (groupWeek.data || []).forEach((r) => {
      const name = r.serviceName || "";
      if (!name) return;
      (counts[name] ||= new Set()).add(r.personId || r.serviceTimeName || "");
    });
    if (Object.keys(counts).length === 0) {
      (visits.data || []).forEach((v) => {
        const service = ArrayHelper.getOne(services.data || [], "id", v.serviceId || "") as ServiceInterface | null;
        const name = service?.name;
        if (!name) return;
        (counts[name] ||= new Set()).add(v.personId || v.id || "");
      });
    }
    return Object.keys(counts).map((name) => ({ name, count: [...counts[name]].filter(Boolean).length }));
  }, [groupWeek.data, visits.data, services.data]);

  const sundays = useMemo(() => {
    const byWeek = new Map<string, number>();
    (trend.data || []).forEach((r) => {
      const d = parseDate(r.week);
      if (d) byWeek.set(isoDate(d), Number(r.visits) || 0);
    });
    return Array.from({ length: 13 }, (_, i) => {
      const day = addDays(weekStart, -7 * (12 - i));
      const key = isoDate(day);
      return { week: key, count: byWeek.get(key) || 0, isThis: i === 12 };
    });
  }, [trend.data, weekStart]);

  return {
    weekStart,
    weekEnd,
    namedCount,
    headcountTotal,
    inRoom,
    guestIds,
    weekHeadcounts,
    rooms,
    serviceSplit,
    sundays,
    people: people.data || [],
    loading: visits.isLoading || groupWeek.isLoading || headcounts.isLoading
  };
};

interface IdentityProps {
  pane: AttendancePane;
  onPane: (pane: AttendancePane) => void;
}

export const AttendanceIdentity = (props: IdentityProps) => {
  const data = useThisWeekAttendance();
  const range = DateHelper.prettyDate(data.weekStart) + " – " + DateHelper.prettyDate(data.weekEnd);
  const split = [
    data.namedCount ? Locale.label("attendance.attendancePage.att") + " " + data.namedCount : "",
    data.headcountTotal ? Locale.label("attendance.headcountEntry.count") + " " + data.headcountTotal : "",
    data.guestIds.length ? Locale.label("attendance.checkinType.guest") + " " + data.guestIds.length : "",
    ...data.serviceSplit.map((s) => s.name + " " + s.count)
  ].filter(Boolean);

  return (
    <>
      <p className="om-eyebrow">{range}</p>
      <h1>{Locale.label("attendance.attendancePage.att")}</h1>
      {data.loading ? <Loading /> : (
        <>
          <div className="om-in-room" style={{ marginTop: 24 }}>{data.inRoom}<span>in the room</span></div>
          {split.length > 0 && <p className="om-split">{split.join(" · ")}</p>}
        </>
      )}
      <AttendanceNavigation pane={props.pane} onPane={props.onPane} />
    </>
  );
};

interface SliceProps {
  onPane: (pane: AttendancePane) => void;
}

export const ThisWeekSlice = (props: SliceProps) => {
  const data = useThisWeekAttendance();
  const guestPeople = data.guestIds
    .map((id) => ArrayHelper.getOne(data.people, "id", id) as PersonInterface | null)
    .filter(Boolean) as PersonInterface[];

  if (data.loading) return <Loading />;

  return (
    <>
      <div>
        <h3>{Locale.label("attendance.attendancePage.groups")}</h3>
        {data.rooms.length === 0
          ? <p className="om-quiet">{Locale.label("attendance.attendancePage.groupAttMsg")}</p>
          : (
            <div className="om-rooms">
              {data.rooms.map((room) => {
                const cap = room.capacity > 0 ? room.capacity : 0;
                const pct = cap ? Math.min(100, Math.round((room.count / cap) * 100)) : Math.min(100, room.count * 8);
                return (
                  <div className="om-room" key={room.id}>
                    <Link to={"/groups/" + room.id}>{room.name}</Link>
                    <span>{cap ? room.count + " / " + cap : room.count}</span>
                    <div className="om-bar"><i style={{ width: pct + "%" }} /></div>
                  </div>
                );
              })}
            </div>
          )}
      </div>

      {guestPeople.length > 0 && (
        <div>
          <h3>{Locale.label("attendance.checkinType.guest")}</h3>
          <div className="om-guests">
            {guestPeople.map((p) => (
              <Link key={p.id} className="om-chip first" to={"/people/" + p.id}>{p.name?.display}</Link>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3>{Locale.label("attendance.tabs.attTrend")}</h3>
        <div className="om-sundays">
          {data.sundays.map((s) => (
            <span key={s.week} className={"om-sun" + (s.count > 0 ? " on" : "") + (s.isThis ? " today" : "")} title={s.week + " · " + s.count} />
          ))}
        </div>
        <p className="om-quiet">
          {data.inRoom}
          {" · "}
          <button type="button" className="om-back" onClick={() => props.onPane("years")}>{Locale.label("groups.groupSessions.allYears")}</button>
        </p>
      </div>

      {data.weekHeadcounts.length > 0 && (
        <div>
          <h3>{Locale.label("attendance.headcountEntry.recent")}</h3>
          {data.weekHeadcounts.map((h) => (
            <div className="om-person" key={h.id}>
              <span>{[h.serviceName, h.serviceTimeName].filter(Boolean).join(" · ")}</span>
              <span className="om-role">{h.value}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
};
