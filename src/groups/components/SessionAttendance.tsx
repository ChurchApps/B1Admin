import React, { useCallback, memo, useMemo } from "react";
import { type GroupInterface, type PersonInterface, type SessionInterface, type VisitInterface, type VisitSessionInterface } from "@churchapps/helpers";
import { ApiHelper, ArrayHelper, ExportLink, Locale, PersonHelper, Permissions, UserHelper } from "@churchapps/apphelper";
import { Avatar, Box, Icon, IconButton, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";

interface Props {
  group: GroupInterface;
  session: SessionInterface | null;
  addedPerson?: PersonInterface;
  addedCallback?: (personId: string) => void;
  setHiddenPeople?: (peopleIds: string[]) => void;
}

export const SessionAttendance: React.FC<Props> = memo((props) => {
  const { group, session, addedPerson, addedCallback, setHiddenPeople } = props;
  const [visitSessions, setVisitSessions] = React.useState<VisitSessionInterface[]>([]);
  const [people, setPeople] = React.useState<PersonInterface[]>([]);
  const [downloadData, setDownloadData] = React.useState<any[]>([]);

  const loadAttendance = useCallback(() => {
    if (session?.id) {
      ApiHelper.get("/visitsessions?sessionId=" + session.id, "AttendanceApi").then((vs: VisitSessionInterface[]) => {
        setVisitSessions(vs);
        const peopleIds = ArrayHelper.getUniqueValues(vs, "visit.personId");
        if (peopleIds.length > 0) {
          ApiHelper.get("/people/ids?ids=" + escape(peopleIds.join(",")), "MembershipApi").then((data) => setPeople(data));
        } else {
          setPeople([]);
        }
        setHiddenPeople?.(peopleIds);
      });
    } else {
      setVisitSessions([]);
      setPeople([]);
      setHiddenPeople?.([]);
    }
  }, [session?.id, setHiddenPeople]);

  const loadDownloadData = useCallback(() => {
    if (session?.id) {
      ApiHelper.get("/visitsessions/download/" + session.id, "AttendanceApi").then((data) => setDownloadData(data));
    }
  }, [session?.id]);

  const handleRemove = useCallback(
    (vs: VisitSessionInterface) => {
      if (!session?.id) return;
      ApiHelper.delete("/visitsessions?sessionId=" + session.id + "&personId=" + vs.visit.personId, "AttendanceApi").then(() => {
        loadAttendance();
      });
    },
    [session?.id, loadAttendance]
  );

  const canEdit = useMemo(() => UserHelper.checkAccess(Permissions.attendanceApi.attendance.edit), []);

  const tableRows = useMemo(() => {
    const sortKey = (p?: PersonInterface) => {
      const last = (p?.name?.last || "").toLowerCase();
      const first = (p?.name?.first || p?.name?.display || "").toLowerCase();
      return `${last}|${first}`;
    };
    const rows = visitSessions
      .map((vs) => ({ vs, person: ArrayHelper.getOne(people, "id", vs.visit.personId) as PersonInterface | undefined }))
      .filter((r) => !!r.person)
      .sort((a, b) => sortKey(a.person).localeCompare(sortKey(b.person)));

    return rows.map(({ vs, person }) => {
      const editLink = canEdit ? (
        <IconButton
          size="small"
          color="error"
          onClick={() => handleRemove(vs)}
          data-testid={`remove-session-visitor-button-${vs.id}`}
          aria-label={`Remove ${person?.name?.display || "visitor"} from session`}>
          <Icon fontSize="small">person_remove</Icon>
        </IconButton>
      ) : (
        <></>
      );
      return (
        <TableRow key={vs.id}>
          <TableCell>
            <Avatar src={PersonHelper.getPhotoUrl(person)} sx={{ width: 48, height: 48 }} />
          </TableCell>
          <TableCell>
            <a className="personName" href={"/people/person.aspx?id=" + vs.visit.personId}>
              {person?.name?.display}
            </a>
          </TableCell>
          <TableCell style={{ textAlign: "right" }}>{editLink}</TableCell>
        </TableRow>
      );
    });
  }, [visitSessions, people, canEdit, handleRemove]);

  React.useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  React.useEffect(() => {
    loadDownloadData();
  }, [loadDownloadData]);

  React.useEffect(() => {
    if (addedPerson?.id && session?.id) {
      const v = { checkinTime: new Date(), personId: addedPerson.id, visitSessions: [{ sessionId: session.id }] } as VisitInterface;
      ApiHelper.post("/visitsessions/log", v, "AttendanceApi").then(() => {
        loadAttendance();
      });
      addedCallback?.(v.personId);
    }
  }, [addedPerson?.id, session?.id, loadAttendance, addedCallback]);

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

  return (
    <Paper sx={{ p: 2, position: "relative" }}>
      {downloadData && downloadData.length > 0 && (
        <Box sx={{ position: "absolute", top: 4, right: 4 }}>
          <ExportLink data={downloadData} filename={`${group.name}_visits.csv`} customHeaders={customHeaders} />
        </Box>
      )}
      <Box sx={{ mb: 2, pr: 5 }}>
        <Typography variant="h6" component="div" data-cy="session-present-msg">
          {Locale.label("groups.groupSessions.attFor")} {group.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {Locale.label("groups.groupSessions.session")}: {session.displayName}
          {(session as any).serviceTime?.name && ` • ${(session as any).serviceTime.name}`}
        </Typography>
      </Box>

      {visitSessions.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
          {Locale.label("groups.groupSessions.noAttendance")}
        </Typography>
      ) : (
        <Table id="groupMemberTable">
          <TableHead>
            <TableRow>
              <th></th>
              <th>{Locale.label("common.name")}</th>
              <th></th>
            </TableRow>
          </TableHead>
          <TableBody>{tableRows}</TableBody>
        </Table>
      )}
    </Paper>
  );
});
