import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Box, Link, Stack, Typography } from "@mui/material";
import { DateHelper, Loading, Locale, Permissions, UserHelper } from "@churchapps/apphelper";
import { type EventInterface, type GroupInterface, type GroupJoinRequestInterface, type GroupMemberInterface } from "@churchapps/helpers";
import { RecordHeading, TextAction, VerbRow, filterChipSx } from "../../components/ui";

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
  onEnableAttendance: () => void;
}

const PREVIEW_COUNT = 6;

const prettyDate = (d?: string | Date) => {
  if (!d) return "";
  const date = typeof d === "string" ? DateHelper.toDate(d) : d;
  return Number.isNaN(date.getTime()) ? "" : DateHelper.prettyDate(date);
};

const Section = ({ id, title, children, testId }: { id: string; title: string; children: React.ReactNode; testId?: string }) => (
  <Box component="section" aria-labelledby={id} data-testid={testId}>
    <RecordHeading id={id} label={title} />
    {children}
  </Box>
);

const Muted = ({ children }: { children: React.ReactNode }) => <Typography variant="body1" color="text.secondary">{children}</Typography>;

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

// Default slice of the group record: one quiet summary per area, each with an "All …" verb into its slice.
export const GroupPlate = ({ group, onView, onEnableAttendance }: Props) => {
  const isStandard = (group?.tags?.indexOf("standard") ?? -1) > -1;
  const canViewMembers = UserHelper.checkAccess(Permissions.membershipApi.groupMembers.view);
  const canEditGroup = UserHelper.checkAccess(Permissions.membershipApi.groups.edit);
  const trackAttendance = !!group?.trackAttendance;

  const members = useQuery<GroupMemberInterface[]>({
    queryKey: [`/groupmembers?groupId=${group?.id}`, "MembershipApi"],
    enabled: !!group?.id && canViewMembers
  });

  const pending = useQuery<GroupJoinRequestInterface[]>({
    queryKey: [`/groupjoinrequests/group/${group?.id}`, "MembershipApi"],
    enabled: !!group?.id && canViewMembers
  });

  const sessions = useQuery<SessionRow[]>({
    queryKey: [`/sessions?groupId=${group?.id}`, "AttendanceApi"],
    enabled: !!group?.id && isStandard && trackAttendance
  });

  const events = useQuery<EventInterface[]>({
    queryKey: [`/events/group/${group?.id}`, "ContentApi"],
    enabled: !!group?.id && isStandard
  });

  const health = useQuery<GroupHealthData>({
    queryKey: [`/groups/${group?.id}/health`, "MembershipApi"],
    enabled: !!group?.id && isStandard && canViewMembers
  });

  const people = members.data || [];
  const leaders = people.filter((m) => m.leader);
  const pendingCount = (pending.data || []).length;

  const sessionRows = [...(sessions.data || [])].sort((a, b) => {
    const da = a.sessionDate ? new Date(a.sessionDate).getTime() : 0;
    const db = b.sessionDate ? new Date(b.sessionDate).getTime() : 0;
    return db - da;
  });
  const latestSession = sessionRows[0];

  const now = Date.now();
  const allEvents = (events.data || []).filter((e) => e.start);
  const upcoming = allEvents.filter((e) => new Date(e.start!).getTime() >= now).sort((a, b) => new Date(a.start!).getTime() - new Date(b.start!).getTime());
  const nextEvent = upcoming[0] || [...allEvents].sort((a, b) => new Date(b.start!).getTime() - new Date(a.start!).getTime())[0];

  const allMembers = <TextAction small onClick={() => onView("members")} data-testid="group-all-members">{Locale.label("groups.groupRecord.allMembers", "All members")}</TextAction>;
  const allSessions = <TextAction small onClick={() => onView("sessions")} data-testid="group-all-sessions">{Locale.label("groups.groupRecord.allSessions", "All sessions")}</TextAction>;
  const allEventsVerb = <TextAction small onClick={() => onView("calendar")} data-testid="group-all-events">{Locale.label("groups.groupRecord.allEvents", "All events")}</TextAction>;
  const healthVerb = <TextAction small onClick={() => onView("health")} data-testid="group-see-health">{Locale.label("groups.groupRecord.seeHealth", "See health")}</TextAction>;

  const membersBody = () => {
    if (members.isLoading) return <Loading size="sm" />;
    if (people.length === 0) {
      return (
        <Stack spacing={1}>
          <Muted>{Locale.label("groups.groupRecord.noMembers", "No members yet.")}</Muted>
          <VerbRow>{allMembers}</VerbRow>
        </Stack>
      );
    }
    return (
      <Stack spacing={1.5}>
        <Box component="ul" aria-label={Locale.label("groups.groupNavigation.members")} sx={{ display: "flex", flexWrap: "wrap", gap: 1, listStyle: "none", m: 0, p: 0 }}>
          {people.slice(0, PREVIEW_COUNT).map((m) => (
            <Box component="li" key={m.id}>
              <Link
                component={RouterLink}
                to={"/people/" + m.personId}
                underline="none"
                sx={{ ...filterChipSx(false), display: "inline-flex", alignItems: "center", gap: 0.75, minHeight: { xs: 36, md: 36 } }}>
                {m.person?.name?.display || Locale.label("groups.groupMembers.unknown")}
                {m.leader && <Typography component="span" variant="caption" color="text.secondary">{Locale.label("groups.groupMembers.leader")}</Typography>}
              </Link>
            </Box>
          ))}
        </Box>
        <VerbRow>
          <span>{plural(people.length, Locale.label("groups.groupMembers.member"), Locale.label("groups.groupMembers.members"))}</span>
          {leaders.length > 0 && <span>{plural(leaders.length, Locale.label("groups.groupMembers.leaderLower"), Locale.label("groups.groupMembers.leadersLower"))}</span>}
          {pendingCount > 0 && <span>{Locale.label("groups.groupRecord.pendingCount", "{count} pending").replace("{count}", String(pendingCount))}</span>}
          {allMembers}
        </VerbRow>
      </Stack>
    );
  };

  const sessionsBody = () => {
    if (!trackAttendance) {
      return (
        <Stack spacing={1}>
          <Muted>{Locale.label("groups.sessionsDisabled.description")}</Muted>
          <VerbRow>
            {canEditGroup && <TextAction small onClick={onEnableAttendance} data-testid="enable-attendance-button">{Locale.label("groups.sessionsDisabled.enable")}</TextAction>}
            {allSessions}
          </VerbRow>
        </Stack>
      );
    }
    if (sessions.isLoading) return <Loading size="sm" />;
    if (!latestSession) {
      return (
        <Stack spacing={1}>
          <Muted>{Locale.label("groups.groupRecord.noSessions", "No sessions yet.")}</Muted>
          <VerbRow>{allSessions}</VerbRow>
        </Stack>
      );
    }
    return (
      <Stack spacing={1}>
        <Typography variant="body1">
          {Locale.label("groups.groupRecord.latestSession", "Latest {date}").replace("{date}", prettyDate(latestSession.sessionDate) || latestSession.displayName || "")}
        </Typography>
        <VerbRow>
          <span>{sessionRows.length === 1 ? Locale.label("groups.groupRecord.sessionCountOne", "1 session") : Locale.label("groups.groupRecord.sessionCount", "{count} sessions").replace("{count}", String(sessionRows.length))}</span>
          {allSessions}
        </VerbRow>
      </Stack>
    );
  };

  const calendarBody = () => {
    if (events.isLoading) return <Loading size="sm" />;
    if (!nextEvent) {
      return (
        <Stack spacing={1}>
          <Muted>{Locale.label("groups.groupCalendar.noEvents")}</Muted>
          <VerbRow>{allEventsVerb}</VerbRow>
        </Stack>
      );
    }
    const isUpcoming = new Date(nextEvent.start!).getTime() >= now;
    return (
      <Stack spacing={1}>
        <Typography variant="body1">{nextEvent.title}</Typography>
        <VerbRow>
          <span>
            {(isUpcoming ? Locale.label("groups.groupRecord.nextEvent", "Next") : Locale.label("groups.groupRecord.lastEvent", "Last")) + " "}
            {new Date(nextEvent.start!).toLocaleString(DateHelper.locale, { dateStyle: "medium", timeStyle: "short" })}
          </span>
          {allEventsVerb}
        </VerbRow>
      </Stack>
    );
  };

  const healthBody = () => {
    if (health.isLoading) return <Loading size="sm" />;
    if (!health.data) return <VerbRow>{healthVerb}</VerbRow>;
    return (
      <VerbRow>
        <span>
          {Locale.label("groups.groupRecord.healthSummary", "{members} members · {joined} joined · {left} left in 90 days")
            .replace("{members}", String(health.data.memberCount))
            .replace("{joined}", String(health.data.joins90))
            .replace("{left}", String(health.data.leaves90))}
        </span>
        {healthVerb}
      </VerbRow>
    );
  };

  return (
    <>
      <Section id="group-plate-members" title={Locale.label("groups.groupNavigation.members")} testId="group-plate-members">
        {canViewMembers ? membersBody() : <VerbRow>{allMembers}</VerbRow>}
      </Section>
      {isStandard && (
        <Section id="group-plate-sessions" title={Locale.label("groups.groupNavigation.sessions")} testId="group-plate-sessions">
          {sessionsBody()}
        </Section>
      )}
      {isStandard && (
        <Section id="group-plate-calendar" title={Locale.label("groups.groupNavigation.calendar")} testId="group-plate-calendar">
          {calendarBody()}
        </Section>
      )}
      {isStandard && canViewMembers && (
        <Section id="group-plate-health" title={Locale.label("groups.groupNavigation.health")} testId="group-plate-health">
          {healthBody()}
        </Section>
      )}
    </>
  );
};
