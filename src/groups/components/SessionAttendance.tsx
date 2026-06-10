import React, { useCallback, memo, useMemo } from "react";
import { type GroupInterface, type PersonInterface, type SessionInterface, type VisitInterface, type VisitSessionInterface } from "@churchapps/helpers";
import { ApiHelper, ArrayHelper, Locale, PersonHelper, Permissions, UserHelper } from "@churchapps/apphelper";
import { Avatar, Box, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { PersonRemove as PersonRemoveIcon } from "@mui/icons-material";
import { AppIconButton } from "../../components/ui/AppIconButton";
import { CountChip, ExportButton } from "../../components/ui";

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
          ApiHelper.get("/people/ids?ids=" + escape(peopleIds.join(",")), "MembershipApi").then((data: any) => setPeople(data));
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
      ApiHelper.get("/visitsessions/download/" + session.id, "AttendanceApi").then((data: any) => setDownloadData(data));
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
        <AppIconButton
          intent="remove"
          label={Locale.label("common.remove")}
          icon={<PersonRemoveIcon />}
          onClick={() => handleRemove(vs)}
          data-testid={`remove-session-visitor-button-${vs.id}`}
        />
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
          <TableCell align="right" className="rowActions">{editLink}</TableCell>
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
    <Paper sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h6" component="div" data-cy="session-present-msg">
              {Locale.label("groups.groupSessions.attFor")} {group.name}
            </Typography>
            {visitSessions.length > 0 && <CountChip count={visitSessions.length} />}
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {Locale.label("groups.groupSessions.session")}: {session.displayName}
            {(session as any).serviceTime?.name && ` • ${(session as any).serviceTime.name}`}
          </Typography>
        </Box>
        {downloadData && downloadData.length > 0 && (
          <ExportButton data={downloadData} filename={`${group.name}_visits.csv`} customHeaders={customHeaders} text={Locale.label("groups.groupsPage.export")} />
        )}
      </Stack>

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
