import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ApiHelper, DateHelper, Locale, Permissions, UserHelper } from "@churchapps/apphelper";
import { type EventInterface, type GroupInterface, type GroupJoinRequestInterface, type GroupMemberInterface } from "@churchapps/helpers";

interface SessionRow {
  id?: string;
  sessionDate?: string;
  displayName?: string;
}

interface GroupHealthData {
  memberCount: number;
  joins90: number;
  leaves90: number;
}

interface Props {
  group: GroupInterface;
  onView: (view: string) => void;
  onEnableAttendance?: () => void;
}

const fmt = (d?: string | Date) => {
  if (!d) return "";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return DateHelper.prettyDate(date);
};

export const GroupPlate = (props: Props) => {
  const { group } = props;
  const isStandard = (group?.tags?.indexOf("standard") ?? -1) > -1;
  const canViewMembers = UserHelper.checkAccess(Permissions.membershipApi.groupMembers.view);
  const canEditGroup = UserHelper.checkAccess(Permissions.membershipApi.groups.edit);
  const canViewHealth = UserHelper.checkAccess(Permissions.membershipApi.groupMembers.view);

  const members = useQuery<GroupMemberInterface[]>({
    queryKey: [`/groupmembers?groupId=${group?.id}`, "MembershipApi"],
    placeholderData: [],
    enabled: !!group?.id && canViewMembers
  });

  const pending = useQuery<GroupJoinRequestInterface[]>({
    queryKey: [`/groupjoinrequests/group/${group?.id}`, "MembershipApi"],
    placeholderData: [],
    enabled: !!group?.id && canViewMembers
  });

  const sessions = useQuery<SessionRow[]>({
    queryKey: [`/sessions?groupId=${group?.id}`, "AttendanceApi"],
    placeholderData: [],
    enabled: !!group?.id && isStandard && !!group.trackAttendance
  });

  const events = useQuery<EventInterface[]>({
    queryKey: [`/events/group/${group?.id}`, "ContentApi"],
    placeholderData: [],
    enabled: !!group?.id && isStandard
  });

  const health = useQuery<GroupHealthData>({
    queryKey: [`/groups/${group?.id}/health`, "MembershipApi"],
    enabled: !!group?.id && isStandard && canViewHealth
  });

  const enableAttendance = () => {
    if (props.onEnableAttendance) props.onEnableAttendance();
    else ApiHelper.post("/groups", [{ ...group, trackAttendance: true }], "MembershipApi").then(() => props.onView("sessions"));
  };

  const people = members.data || [];
  const leaders = people.filter((m) => m.leader);
  const preview = people.slice(0, 6);
  const pendingCount = (pending.data || []).length;

  const sessionRows = [...(sessions.data || [])].sort((a, b) => {
    const da = a.sessionDate ? new Date(a.sessionDate).getTime() : 0;
    const db = b.sessionDate ? new Date(b.sessionDate).getTime() : 0;
    return db - da;
  });
  const latestSession = sessionRows[0];

  const now = Date.now();
  const upcoming = [...(events.data || [])]
    .filter((e) => e.start && new Date(e.start).getTime() >= now)
    .sort((a, b) => new Date(a.start!).getTime() - new Date(b.start!).getTime());
  const nextEvent = upcoming[0] || [...(events.data || [])].sort((a, b) => new Date(b.start!).getTime() - new Date(a.start!).getTime())[0];

  return (
    <>
      {canViewMembers && (
        <div>
          <h3>
            <button type="button" className="og-back" onClick={() => props.onView("members")} style={{ textTransform: "none", letterSpacing: 0, fontSize: "0.72rem" }}>
              {Locale.label("groups.groupNavigation.members")}
            </button>
          </h3>
          {people.length === 0 ? (
            <p className="og-muted">No members yet.</p>
          ) : (
            <>
              <p className="og-muted">
                {people.length} {people.length === 1 ? "member" : "members"}
                {leaders.length > 0 ? ` · ${leaders.length} ${leaders.length === 1 ? "leader" : "leaders"}` : ""}
                {pendingCount > 0 ? ` · ${pendingCount} pending` : ""}
              </p>
              <div>
                {preview.map((m) => (
                  <Link key={m.id} className="og-gchip" to={"/people/" + m.personId}>
                    <b>{m.person?.name?.display || Locale.label("groups.groupMembers.unknown")}</b>
                    {m.leader && <span>{Locale.label("groups.groupMembers.leader")}</span>}
                  </Link>
                ))}
              </div>
            </>
          )}
          <p className="og-muted" style={{ marginTop: 10 }}>
            <button type="button" className="og-back" onClick={() => props.onView("members")}>All members</button>
          </p>
        </div>
      )}

      {isStandard && (
        <div>
          <h3>
            <button type="button" className="og-back" onClick={() => props.onView("sessions")} style={{ textTransform: "none", letterSpacing: 0, fontSize: "0.72rem" }}>
              {Locale.label("groups.groupNavigation.sessions")}
            </button>
          </h3>
          {!group.trackAttendance ? (
            <>
              <p className="og-muted">{Locale.label("groups.sessionsDisabled.description")}</p>
              {canEditGroup && (
                <p className="og-muted" style={{ marginTop: 8 }}>
                  <button type="button" className="og-back" onClick={enableAttendance} data-testid="enable-attendance-button">
                    {Locale.label("groups.sessionsDisabled.enable")}
                  </button>
                </p>
              )}
            </>
          ) : sessionRows.length === 0 ? (
            <>
              <p className="og-muted">No sessions yet.</p>
              <p className="og-muted" style={{ marginTop: 8 }}>
                <button type="button" className="og-back" onClick={() => props.onView("sessions")}>All sessions</button>
              </p>
            </>
          ) : (
            <>
              <p>
                {latestSession.displayName || fmt(latestSession.sessionDate) || "Latest session"}
              </p>
              <p className="og-muted">
                {sessionRows.length} {sessionRows.length === 1 ? "session" : "sessions"} ·{" "}
                <button type="button" className="og-back" onClick={() => props.onView("sessions")}>All sessions</button>
              </p>
            </>
          )}
        </div>
      )}

      {isStandard && (
        <div>
          <h3>
            <button type="button" className="og-back" onClick={() => props.onView("calendar")} style={{ textTransform: "none", letterSpacing: 0, fontSize: "0.72rem" }}>
              {Locale.label("groups.groupNavigation.calendar")}
            </button>
          </h3>
          {!nextEvent ? (
            <p className="og-muted">{Locale.label("groups.groupCalendar.noEvents")}</p>
          ) : (
            <>
              <p>{nextEvent.title}</p>
              <p className="og-muted">{nextEvent.start ? new Date(nextEvent.start).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : ""}</p>
            </>
          )}
          <p className="og-muted" style={{ marginTop: 8 }}>
            <button type="button" className="og-back" onClick={() => props.onView("calendar")}>All events</button>
          </p>
        </div>
      )}

      {isStandard && canViewHealth && health.data && (
        <div>
          <h3>
            <button type="button" className="og-back" onClick={() => props.onView("health")} style={{ textTransform: "none", letterSpacing: 0, fontSize: "0.72rem" }}>
              {Locale.label("groups.groupNavigation.health")}
            </button>
          </h3>
          <p className="og-muted">
            {health.data.memberCount} members · {health.data.joins90} joined · {health.data.leaves90} left in 90 days
          </p>
          <p className="og-muted" style={{ marginTop: 8 }}>
            <button type="button" className="og-back" onClick={() => props.onView("health")}>See health</button>
          </p>
        </div>
      )}
    </>
  );
};
