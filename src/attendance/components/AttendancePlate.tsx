import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link as RouterLink } from "react-router-dom";
import { Box, Link, Stack, Typography } from "@mui/material";
import { ArrayHelper, DateHelper, Loading, Locale, Permissions, UserHelper } from "@churchapps/apphelper";
import { type GroupInterface, type PersonInterface, type ServiceInterface } from "@churchapps/helpers";
import { RecordHeading, TextAction, VerbRow, eyebrowSx, filterChipSx, numericCellSx, RecordActions } from "../../components/ui";
import { type HeadcountInterface } from "./HeadcountEntry";
import { addDays, isoDate, parseDate, startOfSundayWeek } from "../week";

const WEEKS = 13;

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
  checkinType?: string;
}

const inWeek = (value: string | Date | undefined, start: Date, end: Date) => {
  const d = parseDate(value);
  return !!d && d >= start && d <= end;
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
    enabled: canView
  });
  const groupWeek = useQuery<GroupWeekRow[]>({
    queryKey: ["/attendancerecords/groups?serviceId=0&week=" + weekStartIso, "AttendanceApi"],
    enabled: canView
  });
  const headcounts = useQuery<HeadcountInterface[]>({ queryKey: ["/headcounts", "AttendanceApi"], enabled: canView });
  const trend = useQuery<TrendRow[]>({
    queryKey: ["/attendancerecords/trend?campusId=0&serviceId=0&serviceTimeId=0&groupId=0", "AttendanceApi"],
    enabled: canViewSummary
  });
  const groups = useQuery<GroupInterface[]>({ queryKey: ["/groups", "MembershipApi"], placeholderData: [] });
  const services = useQuery<ServiceInterface[]>({ queryKey: ["/services", "AttendanceApi"], placeholderData: [] });

  const weekHeadcounts = useMemo(() => (headcounts.data || []).filter((h) => inWeek(h.headcountDate, weekStart, weekEnd)), [headcounts.data, weekStart, weekEnd]);

  // Visits are the source of truth for "this week"; /groups keys on session date, so drop rows whose person didn't visit this week.
  const namedIds = useMemo(() => [...new Set((visits.data || []).map((v) => v.personId).filter(Boolean) as string[])], [visits.data]);
  const weekRows = useMemo(() => {
    const present = new Set(namedIds);
    return (groupWeek.data || []).filter((r) => r.personId && present.has(r.personId));
  }, [groupWeek.data, namedIds]);

  const guestIds = useMemo(() => [...new Set((visits.data || []).filter((v) => v.checkinType === "guest" && v.personId).map((v) => v.personId!))], [visits.data]);

  const guests = useQuery<PersonInterface[]>({
    queryKey: ["/people/ids?ids=" + guestIds.join(","), "MembershipApi"],
    enabled: guestIds.length > 0
  });

  const headcountTotal = weekHeadcounts.reduce((sum, h) => sum + (h.value || 0), 0);
  const inRoom = headcountTotal > 0 ? headcountTotal : namedIds.length;

  const rooms = useMemo(() => {
    const byGroup: Record<string, Set<string>> = {};
    weekRows.forEach((r) => {
      if (r.groupId) (byGroup[r.groupId] ||= new Set()).add(r.personId || "");
    });
    return Object.keys(byGroup).map((id) => {
      const group = ArrayHelper.getOne(groups.data || [], "id", id) as GroupInterface | null;
      return {
        id,
        name: group?.name || "",
        count: [...byGroup[id]].filter(Boolean).length,
        capacity: Number((group as Record<string, any> | null)?.capacity) || 0
      };
    }).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [weekRows, groups.data]);

  const serviceSplit = useMemo(() => {
    const counts: Record<string, Set<string>> = {};
    weekRows.forEach((r) => {
      if (r.serviceName) (counts[r.serviceName] ||= new Set()).add(r.personId || "");
    });
    if (Object.keys(counts).length === 0) {
      (visits.data || []).forEach((v) => {
        const name = (ArrayHelper.getOne(services.data || [], "id", v.serviceId || "") as ServiceInterface | null)?.name;
        if (name) (counts[name] ||= new Set()).add(v.personId || v.id || "");
      });
    }
    return Object.keys(counts).map((name) => ({ name, count: [...counts[name]].filter(Boolean).length }));
  }, [weekRows, visits.data, services.data]);

  const trendByWeek = useMemo(() => {
    const byWeek = new Map<string, number>();
    (trend.data || []).forEach((r) => {
      const d = parseDate(r.week);
      if (d) byWeek.set(isoDate(startOfSundayWeek(d)), Number(r.visits) || 0);
    });
    return byWeek;
  }, [trend.data]);

  const sundays = useMemo(() => Array.from({ length: WEEKS }, (_, i) => {
    const day = addDays(weekStart, -7 * (WEEKS - 1 - i));
    return { day, count: trendByWeek.get(isoDate(day)) || 0 };
  }), [trendByWeek, weekStart]);

  const lastRecorded = useMemo(() => {
    const thisWeek = isoDate(weekStart);
    const weeks = [...trendByWeek.entries()].filter(([w, n]) => n > 0 && w < thisWeek).sort((a, b) => b[0].localeCompare(a[0]));
    return weeks[0] ? { day: parseDate(weeks[0][0])!, count: weeks[0][1] } : null;
  }, [trendByWeek, weekStart]);

  return {
    canView,
    canViewSummary,
    weekStart,
    weekEnd,
    namedCount: namedIds.length,
    headcountTotal,
    inRoom,
    guestIds,
    guests: guests.data || [],
    weekHeadcounts,
    rooms,
    serviceSplit,
    sundays,
    lastRecorded,
    loading: visits.isLoading || groupWeek.isLoading || headcounts.isLoading
  };
};

export type AttendanceView = "" | "setup" | "kiosk" | "headcount" | "years";

interface IdentityProps {
  view: AttendanceView;
  onView: (view: AttendanceView) => void;
  canSetup: boolean;
  canKiosk: boolean;
  canHeadcount: boolean;
  canYears: boolean;
}

export const AttendanceIdentity = (props: IdentityProps) => {
  const data = useThisWeekAttendance();
  const range = DateHelper.prettyDate(data.weekStart) + " – " + DateHelper.prettyDate(data.weekEnd);
  const split = [
    data.namedCount ? Locale.label("attendance.plate.checkedIn", "{count} checked in").replace("{count}", String(data.namedCount)) : "",
    data.headcountTotal ? Locale.label("attendance.plate.headcount", "{count} counted").replace("{count}", String(data.headcountTotal)) : "",
    data.guestIds.length ? Locale.label("attendance.plate.guests", "{count} guests").replace("{count}", String(data.guestIds.length)) : "",
    // One service would just repeat the total.
    ...(data.serviceSplit.length > 1 ? data.serviceSplit.map((s) => `${s.name} ${s.count}`) : [])
  ].filter(Boolean);
  const lastRecorded = data.lastRecorded && Locale.label("attendance.plate.lastRecorded", "Last recorded {date}: {count}")
    .replace("{date}", DateHelper.prettyDate(data.lastRecorded.day))
    .replace("{count}", String(data.lastRecorded.count));

  return (
    <Box component="aside" data-testid="attendance-identity" sx={{ minWidth: 0 }}>
      <Typography sx={eyebrowSx} data-testid="attendance-week-range">{Locale.label("attendance.plate.thisWeek", "This week") + " · " + range}</Typography>
      <Typography id="page-header-title" variant="h1" component="h1" sx={{ mt: 1 }}>{Locale.label("attendance.attendancePage.att")}</Typography>
      {data.canView && (
        data.loading ? <Box sx={{ mt: 3 }}><Loading size="sm" /></Box> : (
          <Box sx={{ mt: 3 }}>
            <Typography component="p" sx={{ typography: "h1", fontSize: 48, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }} data-testid="attendance-in-room">{data.inRoom}</Typography>
            <Typography variant="body1" color="text.secondary">{Locale.label("attendance.plate.inTheRoom", "in the room")}</Typography>
            {split.length > 0
              ? <VerbRow sx={{ mt: 1 }}>{split.map((item) => <Box component="span" key={item} sx={{ whiteSpace: "nowrap" }}>{item}</Box>)}</VerbRow>
              : (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }} data-testid="attendance-week-empty">
                  {Locale.label("attendance.plate.noCheckins", "No check-ins yet this week.")}
                  {lastRecorded && <Box component="span" sx={{ display: "block" }}>{lastRecorded}</Box>}
                </Typography>
              )}
          </Box>
        )
      )}
      <RecordActions>
        {props.canSetup && <TextAction small onClick={() => props.onView("setup")} data-testid="attendance-verb-setup">{Locale.label("attendance.tabs.setup")}</TextAction>}
        {props.canKiosk && <TextAction small onClick={() => props.onView("kiosk")} data-testid="attendance-verb-kiosk">{Locale.label("attendance.plate.kiosk", "Kiosk")}</TextAction>}
        {props.canHeadcount && <TextAction small onClick={() => props.onView("headcount")} data-testid="attendance-tab-headcounts">{Locale.label("attendance.tabs.headcounts")}</TextAction>}
        {props.canYears && <TextAction small onClick={() => props.onView("years")} data-testid="attendance-verb-years">{Locale.label("attendance.plate.allYears", "All years")}</TextAction>}
      </RecordActions>
    </Box>
  );
};

const Section = ({ id, title, children, verbs }: { id: string; title: string; children: React.ReactNode; verbs?: React.ReactNode }) => (
  <Box component="section" aria-labelledby={id} data-testid={id}>
    <RecordHeading id={id + "-title"} label={title}>{verbs}</RecordHeading>
    {children}
  </Box>
);

const Muted = ({ children }: { children: React.ReactNode }) => <Typography variant="body1" color="text.secondary">{children}</Typography>;

export const ThisWeekSlice = ({ onView, canYears }: { onView: (view: AttendanceView) => void; canYears: boolean }) => {
  const data = useThisWeekAttendance();
  if (!data.canView) return <Muted>{Locale.label("attendance.attendancePage.subtitle")}</Muted>;
  if (data.loading) return <Loading />;

  const guestPeople = data.guestIds.map((id) => ArrayHelper.getOne(data.guests, "id", id) as PersonInterface | null).filter(Boolean) as PersonInterface[];
  const weeksWith = data.sundays.filter((s) => s.count > 0).length;

  return (
    <>
      <Section id="attendance-rooms" title={Locale.label("attendance.plate.rooms", "Rooms")}>
        {data.rooms.length === 0 ? <Muted>{Locale.label("attendance.plate.noRooms", "No one has checked in to a group this week.")}</Muted> : (
          <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, columnGap: 4, rowGap: 1.5 }}>
            {data.rooms.map((room) => {
              const pct = room.capacity ? Math.min(100, Math.round((room.count / room.capacity) * 100)) : 0;
              return (
                <Box component="li" key={room.id} sx={{ minWidth: 0 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={2}>
                    {room.name
                      ? <Link component={RouterLink} to={"/groups/" + room.id} underline="hover" sx={{ fontWeight: 500, overflowWrap: "anywhere" }}>{room.name}</Link>
                      : <Typography variant="body1" color="text.secondary">{Locale.label("attendance.plate.unknownGroup", "Removed group")}</Typography>}
                    <Typography variant="body2" color="text.secondary" sx={numericCellSx}>{room.capacity ? `${room.count} / ${room.capacity}` : room.count}</Typography>
                  </Stack>
                  {room.capacity > 0 && (
                    <Box role="meter" aria-valuemin={0} aria-valuemax={room.capacity} aria-valuenow={room.count} aria-label={room.name} sx={{ mt: 0.5, height: 4, borderRadius: 2, bgcolor: "var(--b1-neutral-bg)", overflow: "hidden" }}>
                      <Box sx={{ width: pct + "%", height: "100%", bgcolor: pct >= 100 ? "warning.main" : "primary.main" }} />
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>
        )}
      </Section>

      {guestPeople.length > 0 && (
        <Section id="attendance-guests" title={Locale.label("attendance.plate.guestsTitle", "Guests")}>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {guestPeople.map((p) => (
              <Link key={p.id} component={RouterLink} to={"/people/" + p.id} underline="none" sx={{ ...filterChipSx(false), display: "inline-flex", alignItems: "center", minHeight: 36 }}>{p.name?.display}</Link>
            ))}
          </Stack>
        </Section>
      )}

      {data.canViewSummary && (
        <Section id="attendance-trend" title={Locale.label("attendance.plate.lastWeeks", "Last {weeks} weeks").replace("{weeks}", String(WEEKS))} verbs={canYears && <TextAction small onClick={() => onView("years")}>{Locale.label("attendance.plate.allYears", "All years")}</TextAction>}>
          <Stack spacing={1.5}>
            <Box component="ul" aria-label={Locale.label("attendance.plate.weeklyCheckins", "Weekly check-ins")} sx={{ display: "flex", alignItems: "flex-end", gap: { xs: 0.5, sm: 0.75 }, listStyle: "none", m: 0, p: 0, height: 56 }}>
              {(() => {
                const max = Math.max(1, ...data.sundays.map((s) => s.count));
                return data.sundays.map((s, i) => {
                  const label = Locale.label("attendance.plate.weekOf", "Week of {date}: {count}").replace("{date}", DateHelper.prettyDate(s.day)).replace("{count}", String(s.count));
                  return (
                    <Box
                      component="li"
                      key={s.day.getTime()}
                      aria-label={label}
                      title={label}
                      sx={{
                        width: { xs: 14, sm: 20 },
                        height: s.count ? `${Math.max(12, Math.round((s.count / max) * 100))}%` : "4px",
                        borderRadius: "3px",
                        bgcolor: s.count ? "primary.main" : "var(--b1-neutral-bg)",
                        ...(i === WEEKS - 1 ? { outline: "1px solid", outlineColor: "var(--b1-control-border)", outlineOffset: 1 } : {})
                      }}
                    />
                  );
                });
              })()}
            </Box>
            <VerbRow>
              <span>{Locale.label("attendance.plate.weeksWith", "{count} of the last {weeks} weeks had check-ins").replace("{count}", String(weeksWith)).replace("{weeks}", String(WEEKS))}</span>
              {data.lastRecorded && (
                <span>{Locale.label("attendance.plate.lastRecorded", "Last recorded {date}: {count}").replace("{date}", DateHelper.prettyDate(data.lastRecorded.day)).replace("{count}", String(data.lastRecorded.count))}</span>
              )}
            </VerbRow>
          </Stack>
        </Section>
      )}

      <Section id="attendance-headcounts" title={Locale.label("attendance.plate.headcountsTitle", "Headcounts this week")}>
        {data.weekHeadcounts.length === 0 ? <Muted>{Locale.label("attendance.plate.noHeadcounts", "No headcounts entered this week.")}</Muted> : (
          <Stack spacing={0.75}>
            {data.weekHeadcounts.map((h) => (
              <Stack key={h.id} direction="row" justifyContent="space-between" spacing={2}>
                <Typography variant="body1">{[h.serviceName, h.serviceTimeName].filter(Boolean).join(" · ")}</Typography>
                <Typography variant="body1" sx={numericCellSx}>{h.value}</Typography>
              </Stack>
            ))}
          </Stack>
        )}
      </Section>
    </>
  );
};
