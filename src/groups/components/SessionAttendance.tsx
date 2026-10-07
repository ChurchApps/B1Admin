import React, { useCallback, memo, useMemo } from "react";
import { type GroupInterface, type GroupMemberInterface, type PersonInterface, type SessionInterface, type VisitInterface, type VisitSessionInterface } from "@churchapps/helpers";
import { Link } from "react-router-dom";
import { ApiHelper, ArrayHelper, Locale, PersonHelper, Permissions, UserHelper } from "@churchapps/apphelper";
import { Alert, Avatar, Box, Button, Checkbox, Chip, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { Print as PrintIcon } from "@mui/icons-material";
import { AppIconButton } from "../../components/ui/AppIconButton";
import { CountChip, ExportButton } from "../../components/ui";
import { SessionStatusDialog } from "./SessionStatusDialog";

interface Props {
  group: GroupInterface;
  session: SessionInterface | null;
  addedPerson?: PersonInterface;
  addedCallback?: (personId: string) => void;
  onSaved?: () => void;
}

type AttendanceMap = Record<string, boolean>;

const checkinTypeChip = (type?: string) => {
  if (type === "volunteer") return <Chip label={Locale.label("attendance.checkinType.volunteer")} color="info" size="small" variant="outlined" data-testid="checkin-type-chip" />;
  if (type === "guest") return <Chip label={Locale.label("attendance.checkinType.guest")} color="warning" size="small" variant="outlined" data-testid="checkin-type-chip" />;
  return null;
};

// Group member payloads only carry name.display, so fall back to its last word for the surname.
const sortKey = (p?: PersonInterface) => {
  const display = (p?.name?.display || "").trim();
  const last = (p?.name?.last || display.split(" ").pop() || "").toLowerCase();
  const first = (p?.name?.first || display).toLowerCase();
  return `${last}|${first}`;
};

const toDateParam = (date?: Date | string) => {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
};

export const SessionAttendance: React.FC<Props> = memo((props) => {
  const { group, session, addedPerson, addedCallback, onSaved } = props;
  const [members, setMembers] = React.useState<GroupMemberInterface[]>([]);
  const [visitSessions, setVisitSessions] = React.useState<VisitSessionInterface[]>([]);
  const [people, setPeople] = React.useState<PersonInterface[]>([]);
  const [extraPeople, setExtraPeople] = React.useState<PersonInterface[]>([]);
  const [attendance, setAttendance] = React.useState<AttendanceMap>({});
  const [originalAttendance, setOriginalAttendance] = React.useState<AttendanceMap>({});
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);
  const [downloadData, setDownloadData] = React.useState<any[]>([]);
  const [checkinTypes, setCheckinTypes] = React.useState<Record<string, string>>({});
  const [showStatus, setShowStatus] = React.useState(false);
  const loadSeqRef = React.useRef(0);

  const canEdit = useMemo(() => UserHelper.checkAccess(Permissions.attendanceApi.attendance.edit), []);

  React.useEffect(() => {
    if (!group?.id) return;
    let cancelled = false;
    ApiHelper.get("/groupmembers?groupId=" + group.id, "MembershipApi").then((data: GroupMemberInterface[]) => {
      if (!cancelled) setMembers(data || []);
    });
    return () => {
      cancelled = true;
    };
  }, [group?.id]);

  const loadAttendance = useCallback(() => {
    const seq = ++loadSeqRef.current;
    setExtraPeople([]);
    setMessage(null);
    if (session?.id) {
      ApiHelper.get("/visitsessions?sessionId=" + session.id, "AttendanceApi").then((vs: VisitSessionInterface[]) => {
        if (seq !== loadSeqRef.current) return;
        setVisitSessions(vs);
        const types: Record<string, string> = {};
        const present: AttendanceMap = {};
        vs.forEach((v) => {
          const personId = v.visit?.personId;
          if (!personId) return;
          present[personId] = true;
          if (v.visit?.checkinType) types[personId] = v.visit.checkinType;
        });
        setCheckinTypes(types);
        setAttendance(present);
        setOriginalAttendance(present);
        const peopleIds = ArrayHelper.getUniqueValues(vs, "visit.personId");
        if (peopleIds.length > 0) {
          ApiHelper.get("/people/ids?ids=" + escape(peopleIds.join(",")), "MembershipApi").then((data: any) => {
            if (seq === loadSeqRef.current) setPeople(data);
          });
        } else {
          setPeople([]);
        }
      });
    } else {
      setVisitSessions([]);
      setPeople([]);
      setCheckinTypes({});
      setAttendance({});
      setOriginalAttendance({});
    }
  }, [session?.id]);

  const loadDownloadData = useCallback(() => {
    if (session?.id) {
      ApiHelper.get("/visitsessions/download/" + session.id, "AttendanceApi").then((data: any) => setDownloadData(data));
    }
  }, [session?.id]);

  React.useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  React.useEffect(() => {
    loadDownloadData();
  }, [loadDownloadData]);

  // Full roster: every group member, plus anyone already marked present or added
  // from the search who isn't a member (visitors).
  const roster = useMemo(() => {
    const byId = new Map<string, PersonInterface>();
    members.forEach((gm) => { if (gm.person?.id) byId.set(gm.person.id, gm.person); });
    const memberIds = new Set(byId.keys());
    [...people, ...extraPeople].forEach((p) => { if (p?.id && !byId.has(p.id)) byId.set(p.id, p); });
    return Array.from(byId.values())
      .map((person) => ({ person, isMember: memberIds.has(person.id!) }))
      .sort((a, b) => sortKey(a.person).localeCompare(sortKey(b.person)));
  }, [members, people, extraPeople]);

  // A person picked from the search is ticked locally; the Save button records it.
  React.useEffect(() => {
    if (!addedPerson?.id) return;
    const person = addedPerson;
    setExtraPeople((prev) => (prev.some((p) => p.id === person.id) ? prev : [...prev, person]));
    setAttendance((prev) => ({ ...prev, [person.id!]: true }));
    addedCallback?.(person.id!);
  }, [addedPerson, addedCallback]);

  const toggle = useCallback((personId: string) => {
    setAttendance((prev) => ({ ...prev, [personId]: !prev[personId] }));
  }, []);

  const selectAll = useCallback(() => {
    setAttendance((prev) => {
      const next = { ...prev };
      roster.forEach((r) => { next[r.person.id!] = true; });
      return next;
    });
  }, [roster]);

  const selectNone = useCallback(() => setAttendance({}), []);

  const changes = useMemo(() => {
    const toAdd: string[] = [];
    const toRemove: string[] = [];
    const ids = new Set([...Object.keys(attendance), ...Object.keys(originalAttendance)]);
    ids.forEach((id) => {
      const now = !!attendance[id];
      const was = !!originalAttendance[id];
      if (now && !was) toAdd.push(id);
      else if (!now && was) toRemove.push(id);
    });
    return { toAdd, toRemove };
  }, [attendance, originalAttendance]);

  const hasChanges = changes.toAdd.length > 0 || changes.toRemove.length > 0;
  const presentCount = roster.filter((r) => attendance[r.person.id!]).length;

  const handleSave = useCallback(async () => {
    if (!session?.id) return;
    setSaving(true);
    setMessage(null);
    try {
      for (const personId of changes.toAdd) {
        const v = { checkinTime: new Date(), personId, visitSessions: [{ sessionId: session.id }] } as VisitInterface;
        await ApiHelper.post("/visitsessions/log", v, "AttendanceApi");
      }
      for (const personId of changes.toRemove) {
        await ApiHelper.delete("/visitsessions?sessionId=" + session.id + "&personId=" + personId, "AttendanceApi");
      }
      loadAttendance();
      loadDownloadData();
      onSaved?.();
      setMessage({ type: "success", text: Locale.label("groups.groupSessions.attendanceSaved") });
    } catch {
      setMessage({ type: "error", text: Locale.label("groups.groupSessions.attendanceSaveFailed") });
    } finally {
      setSaving(false);
    }
  }, [session?.id, changes, loadAttendance, loadDownloadData, onSaved]);

  const openRoster = useCallback(
    (query: string) => {
      const date = toDateParam(session?.sessionDate);
      window.open("/groups/print-roster?" + query + (date ? "&date=" + date : "") + "&autoprint=1", "_blank");
    },
    [session?.sessionDate]
  );

  const volunteerCount = useMemo(() => Object.values(checkinTypes).filter((t) => t === "volunteer").length, [checkinTypes]);

  const customHeaders = [
    { label: "id", key: "id" },
    { label: "sessionDate", key: "sessionDate" },
    { label: "personName", key: "personName" },
    { label: "status", key: "status" },
    { label: "personId", key: "personId" },
    { label: "visitId", key: "visitId" }
  ];

  if (!session) {
    return (
      <Paper sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="body1" color="text.secondary">
          {Locale.label("groups.groupSessions.selectSession")}
        </Typography>
      </Paper>
    );
  }

  const tableRows = roster.map(({ person, isMember }) => {
    const personId = person.id!;
    const checked = !!attendance[personId];
    return (
      <TableRow key={personId} data-testid="session-roster-row">
        <TableCell padding="checkbox">
          <Checkbox
            checked={checked}
            disabled={!canEdit || saving}
            onChange={() => toggle(personId)}
            inputProps={{ "aria-label": person.name?.display || "" }}
            data-testid={`attendance-checkbox-${personId}`}
          />
        </TableCell>
        <TableCell>
          <Avatar src={PersonHelper.getPhotoUrl(person)} sx={{ width: 40, height: 40 }} />
        </TableCell>
        <TableCell>
          <Link className="personName" to={"/people/" + personId}>
            {person.name?.display}
          </Link>
        </TableCell>
        <TableCell>
          {checkinTypeChip(checkinTypes[personId])}
          {!isMember && !checkinTypes[personId] && <Chip label={Locale.label("attendance.checkinType.guest")} size="small" variant="outlined" />}
        </TableCell>
      </TableRow>
    );
  });

  return (
    <Paper sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h6" component="div" data-cy="session-present-msg">
              {Locale.label("groups.groupSessions.attFor")} {group.name}
            </Typography>
            {visitSessions.length > 0 && <CountChip count={visitSessions.length} />}
            {volunteerCount > 0 && <Chip label={`${volunteerCount} ${Locale.label("attendance.checkinType.volunteers")}`} color="info" size="small" variant="outlined" data-testid="volunteer-count-chip" />}
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {Locale.label("groups.groupSessions.session")}: {session.displayName}
            {(session as any).serviceTime?.name && ` • ${(session as any).serviceTime.name}`}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <AppIconButton label={Locale.label("groups.printRoster.print")} icon={<PrintIcon />} tone="card" onClick={() => openRoster("groupId=" + group.id)} data-testid="session-print-roster-button" />
          {session.serviceTimeId && (
            <>
              <Button size="small" onClick={() => openRoster("serviceTimeId=" + session.serviceTimeId)} data-testid="session-print-all-rosters-button">
                {Locale.label("groups.printRoster.printAll")}
              </Button>
              <Button size="small" onClick={() => setShowStatus(true)} data-testid="session-attendance-status-button">
                {Locale.label("groups.groupSessions.statusButton")}
              </Button>
            </>
          )}
          {downloadData && downloadData.length > 0 && (
            <ExportButton data={downloadData} filename={`${group.name}_visits.csv`} customHeaders={customHeaders} text={Locale.label("groups.groupsPage.export")} />
          )}
        </Stack>
      </Stack>

      {roster.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
          {Locale.label("groups.groupSessions.noAttendance")}
        </Typography>
      ) : (
        <>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="body2" sx={{ flexGrow: 1 }} data-testid="session-present-count">
              {Locale.label("groups.groupSessions.presentOf").replace("{present}", String(presentCount)).replace("{total}", String(roster.length))}
            </Typography>
            {canEdit && (
              <>
                <Button size="small" onClick={selectAll} disabled={saving} data-testid="attendance-select-all">{Locale.label("groups.groupSessions.selectAll")}</Button>
                <Button size="small" onClick={selectNone} disabled={saving} data-testid="attendance-select-none">{Locale.label("groups.groupSessions.selectNone")}</Button>
              </>
            )}
          </Stack>
          <Table id="groupMemberTable" size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" />
                <TableCell />
                <TableCell>{Locale.label("common.name")}</TableCell>
                <TableCell>{Locale.label("attendance.checkinType.header")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>{tableRows}</TableBody>
          </Table>
        </>
      )}

      {showStatus && session.serviceTimeId && (
        <SessionStatusDialog serviceTimeId={session.serviceTimeId} sessionDate={toDateParam(session.sessionDate)} onClose={() => setShowStatus(false)} />
      )}

      {message && <Alert severity={message.type} sx={{ mt: 2 }} data-testid="attendance-save-message">{message.text}</Alert>}

      {canEdit && roster.length > 0 && (
        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
          <Button variant="contained" onClick={handleSave} disabled={!hasChanges || saving} data-testid="save-attendance-button">
            {saving ? Locale.label("common.saving") : Locale.label("groups.groupSessions.saveAttendance")}
          </Button>
        </Stack>
      )}
    </Paper>
  );
});
