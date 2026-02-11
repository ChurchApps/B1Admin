import React, { useCallback, memo, useMemo, type JSX } from "react";
import {
  ApiHelper,
  ArrayHelper,
  PersonHelper,
  UserHelper,
  ExportLink,
  Permissions,
  Loading,
  SmallButton,
  Locale
} from "@churchapps/apphelper";
import { Table, TableBody, TableRow, TableCell, TableHead, Icon, Button, Grid, Avatar, Box, Typography, Paper, Pagination, Chip } from "@mui/material";
import { SessionCard } from "./SessionCard";

interface Props {
  group: GroupInterface;
  sidebarVisibilityFunction: (name: string, visible: boolean) => void;
  addedSession: SessionInterface;
  addedPerson: PersonInterface;
  addedCallback?: (personId: string) => void;
  setHiddenPeople?: (peopleIds: string[]) => void;
  onSessionEdit?: (session: SessionInterface) => void;
}

export const GroupSessions: React.FC<Props> = memo((props) => {
  const { group, sidebarVisibilityFunction, addedSession, addedPerson, addedCallback, setHiddenPeople, onSessionEdit } = props;
  const [visitSessions, setVisitSessions] = React.useState<VisitSessionInterface[]>([]);
  const [people, setPeople] = React.useState<PersonInterface[]>([]);
  const [sessions, setSessions] = React.useState<SessionInterface[]>([]);
  const [session, setSession] = React.useState<SessionInterface>(null);
  const [downloadData, setDownloadData] = React.useState<any[]>([]);
  const [sessionAttendanceCounts, setSessionAttendanceCounts] = React.useState<Record<string, number>>({});

  // Pagination and filtering state
  const [currentPage, setCurrentPage] = React.useState(1);
  const [selectedYear, setSelectedYear] = React.useState<string>("all");
  const sessionsPerPage = 12;

  const loadAttDownloadData = useCallback(() => {
    if (session?.id) {
      ApiHelper.get("/visitsessions/download/" + session.id, "AttendanceApi").then((data) => {
        setDownloadData(data);
      });
    }
  }, [session?.id]);

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
    }
  }, [session?.id, setHiddenPeople]);

  const loadSessionAttendanceCounts = useCallback(async (sessions: SessionInterface[]) => {
    const counts: Record<string, number> = {};

    // For scalability, only load counts for recent sessions or limit the batch size
    const sessionsToLoadCounts = sessions.slice(0, 50); // Limit to most recent 50 sessions

    // Load attendance counts in smaller batches to avoid overwhelming the API
    const batchSize = 10;
    for (let i = 0; i < sessionsToLoadCounts.length; i += batchSize) {
      const batch = sessionsToLoadCounts.slice(i, i + batchSize);
      const batchPromises = batch.map(async (session) => {
        try {
          const visitSessions = await ApiHelper.get(`/visitsessions?sessionId=${session.id}`, "AttendanceApi");
          counts[session.id] = visitSessions.length;
        } catch (error) {
          console.error(`Failed to load attendance for session ${session.id}:`, error);
          counts[session.id] = 0;
        }
      });

      await Promise.all(batchPromises);
      // Update counts incrementally for better UX
      setSessionAttendanceCounts((prev) => ({ ...prev, ...counts }));
    }
  }, []);

  const loadSessions = useCallback(() => {
    if (group.id) {
      ApiHelper.get("/sessions?groupId=" + group.id, "AttendanceApi").then(async (data) => {
        if (data.length > 0) {
          // Sort sessions by date (most recent first), with null safety
          const sortedSessions = [...data].sort((a, b) => {
            const dateA = a?.sessionDate ? new Date(a.sessionDate).getTime() : 0;
            const dateB = b?.sessionDate ? new Date(b.sessionDate).getTime() : 0;
            return dateB - dateA;
          });
          setSessions(sortedSessions);

          // Load attendance counts for all sessions
          await loadSessionAttendanceCounts(sortedSessions);
        } else {
          setSessions(data);
          setSessionAttendanceCounts({});
        }
      });
    }
  }, [group.id, loadSessionAttendanceCounts]);

  const handleRemove = useCallback(
    (vs: VisitSessionInterface) => {
      ApiHelper.delete("/visitsessions?sessionId=" + session.id + "&personId=" + vs.visit.personId, "AttendanceApi").then(() => {
        loadAttendance();
      });
    },
    [session?.id, loadAttendance]
  );

  const handleAdd = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      sidebarVisibilityFunction("addSession", true);
    },
    [sidebarVisibilityFunction]
  );

  const handleViewSession = useCallback((selectedSession: SessionInterface) => {
    setSession(selectedSession);
  }, []);

  const handleEditSession = useCallback(
    (sessionToEdit: SessionInterface) => {
      if (onSessionEdit) {
        onSessionEdit(sessionToEdit);
      }
    },
    [onSessionEdit]
  );

  // Extract unique years from session displayNames
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    sessions.forEach((session) => {
      if (session.displayName) {
        // Extract year from displayName (assuming format includes year like "Dec 15, 2024")
        const yearMatch = session.displayName.match(/\b(20\d{2})\b/);
        if (yearMatch) {
          years.add(yearMatch[1]);
        }
      }
    });
    // Sort years in descending order (most recent first)
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [sessions]);

  // Set default year to most recent when sessions load
  React.useEffect(() => {
    if (availableYears.length > 0 && selectedYear === "all") {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  // Filter sessions based on selected year
  const filteredSessions = useMemo(() => {
    if (selectedYear === "all") {
      return [...sessions];
    }

    // Filter by year in displayName
    return sessions.filter((s) => {
      if (!s.displayName) return false;
      return s.displayName.includes(`/${selectedYear}`) || s.displayName.includes(`, ${selectedYear}`);
    });
  }, [sessions, selectedYear]);

  // Auto-select logic: select most recent session from filtered results
  React.useEffect(() => {
    if (filteredSessions.length > 0 && (!session || !filteredSessions.find((s) => s.id === session.id))) {
      // If no session is selected or current session is not in filtered results,
      // select the most recent session from filtered results
      setSession(filteredSessions[0]);
    } else if (filteredSessions.length === 0) {
      // If no sessions match the filter, clear selection
      setSession(null);
    }
  }, [filteredSessions, session]);

  // Paginated sessions
  const paginatedSessions = useMemo(() => {
    const startIndex = (currentPage - 1) * sessionsPerPage;
    return filteredSessions.slice(startIndex, startIndex + sessionsPerPage);
  }, [filteredSessions, currentPage, sessionsPerPage]);

  const totalPages = Math.ceil(filteredSessions.length / sessionsPerPage);

  const canEdit = useMemo(() => UserHelper.checkAccess(Permissions.attendanceApi.attendance.edit), []);

  const tableRows = useMemo(() => {
    const result: JSX.Element[] = [];
    for (let i = 0; i < visitSessions.length; i++) {
      const vs = visitSessions[i];
      //let editLink = (canEdit) ? (<a href="about:blank" onClick={handleRemove} className="text-danger" data-personid={vs.visit.personId}><Icon>person_remove</Icon> Remove</a>) : null;
      const person = ArrayHelper.getOne(people, "id", vs.visit.personId);
      const editLink = canEdit ? (
        <SmallButton
          icon="person_remove"
          text="Remove"
          onClick={() => handleRemove(vs)}
          color="error"
          data-testid={`remove-session-visitor-button-${vs.id}`}
          ariaLabel={`Remove ${person?.name?.display || "visitor"} from session`}
        />
      ) : (
        <></>
      );
      if (person) {
        result.push(
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
      }
    }
    return result;
  }, [visitSessions, people, canEdit, handleRemove]);

  const renderFilterControls = () => (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h6" component="div">
          {Locale.label("groups.groupSessions.sessions")} ({filteredSessions.length})
        </Typography>
        {canEdit && getAddButton()}
      </Box>

      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        {availableYears.map((year) => (
          <Chip
            key={year}
            label={year}
            onClick={() => {
              setSelectedYear(year);
              setCurrentPage(1);
            }}
            color={selectedYear === year ? "primary" : "default"}
            variant={selectedYear === year ? "filled" : "outlined"}
          />
        ))}
        {availableYears.length > 1 && (
          <Chip
            label={Locale.label("groups.groupSessions.allYears")}
            onClick={() => {
              setSelectedYear("all");
              setCurrentPage(1);
            }}
            color={selectedYear === "all" ? "primary" : "default"}
            variant={selectedYear === "all" ? "filled" : "outlined"}
          />
        )}
      </Box>
    </Box>
  );

  const renderSessionCards = () => {
    if (sessions.length === 0) {
      return (
        <Paper sx={{ p: 4, textAlign: "center", mb: 3 }}>
          <Icon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }}>calendar_month</Icon>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {Locale.label("groups.groupSessions.noSesMsg")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {Locale.label("groups.groupSessions.addSesMsg")}
          </Typography>
          {getAddButton()}
        </Paper>
      );
    }

    if (filteredSessions.length === 0) {
      return (
        <Paper sx={{ p: 4, textAlign: "center", mb: 3 }}>
          <Icon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }}>search_off</Icon>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {Locale.label("groups.groupSessions.noSessionsFound")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {Locale.label("groups.groupSessions.tryAdjusting")}
          </Typography>
        </Paper>
      );
    }

    return (
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          {paginatedSessions.map((sessionItem) => (
            <Grid item size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={sessionItem.id}>
              <SessionCard
                session={sessionItem}
                attendanceCount={sessionAttendanceCounts[sessionItem.id] || 0}
                isSelected={session?.id === sessionItem.id}
                onView={handleViewSession}
                onEdit={handleEditSession}
                canEdit={canEdit}
              />
            </Grid>
          ))}
        </Grid>

        {totalPages > 1 && (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
            <Pagination count={totalPages} page={currentPage} onChange={(_, page) => setCurrentPage(page)} color="primary" showFirstButton showLastButton />
          </Box>
        )}
      </Box>
    );
  };

  const handleSessionSelected = useCallback(() => {
    if (session !== null) {
      loadAttendance();
      sidebarVisibilityFunction("addPerson", true);
    }
  }, [session?.id, loadAttendance, sidebarVisibilityFunction]);

  const handlePersonAdd = useCallback(() => {
    if (addedPerson?.id && session?.id) {
      const v = { checkinTime: new Date(), personId: addedPerson.id, visitSessions: [{ sessionId: session.id }] } as VisitInterface;
      ApiHelper.post("/visitsessions/log", v, "AttendanceApi").then(() => {
        loadAttendance();
      });
      addedCallback(v.personId);
    }
  }, [addedPerson?.id, session?.id, loadAttendance, addedCallback]);

  React.useEffect(() => {
    if (group.id !== undefined) {
      loadSessions();
    }
  }, [group.id, addedSession?.id, addedSession?.sessionDate, addedSession?._updateTimestamp, loadSessions]);

  React.useEffect(() => {
    if (addedPerson?.id !== undefined) {
      handlePersonAdd();
    }
  }, [addedPerson?.id, handlePersonAdd]);

  React.useEffect(() => {
    handleSessionSelected();
  }, [handleSessionSelected]);

  React.useEffect(() => {
    loadAttDownloadData();
  }, [loadAttDownloadData, session]);
  const customHeaders = [
    { label: "id", key: "id" },
    { label: "sessionDate", key: "sessionDate" },
    { label: "personName", key: "personName" },
    { label: "status", key: "status" },
    { label: "personId", key: "personId" },
    { label: "visitId", key: "visitId" }
  ];

  const getAddButton = () => {
    if (!UserHelper.checkAccess(Permissions.attendanceApi.attendance.edit)) return null;
    return (
      <Button variant="contained" color="primary" startIcon={<Icon>add</Icon>} onClick={handleAdd} data-cy="create-new-session">
        {Locale.label("groups.groupSessions.new")}
      </Button>
    );
  };

  const renderAttendanceSection = () => {
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
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Box>
            <Typography variant="h6" component="div" data-cy="session-present-msg">
              {Locale.label("groups.groupSessions.attFor")} {group.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {Locale.label("groups.groupSessions.session")}: {session.displayName}
              {session.serviceTime?.name && ` • ${session.serviceTime.name}`}
            </Typography>
          </Box>
          {downloadData && <ExportLink data={downloadData} spaceAfter={true} filename={`${group.name}_visits.csv`} customHeaders={customHeaders} />}
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
  };

  if (sessions === null) {
    return <Loading />;
  }

  return (
    <Box id="groupSessionsBox" data-cy="group-session-box">
      {renderFilterControls()}
      {renderSessionCards()}
      {renderAttendanceSection()}
    </Box>
  );
});
