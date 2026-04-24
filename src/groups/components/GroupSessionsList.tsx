import React, { useCallback, memo, useMemo } from "react";
import { type GroupInterface, type SessionInterface } from "@churchapps/helpers";
import { ApiHelper, UserHelper, Permissions, Loading, Locale } from "@churchapps/apphelper";
import { Box, Button, Chip, Divider, Icon, IconButton, List, ListItem, ListItemButton, Pagination, Paper, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";

interface Props {
  group: GroupInterface;
  selectedSession: SessionInterface | null;
  onSelectSession: (session: SessionInterface | null) => void;
  onEditSession?: (session: SessionInterface) => void;
  onAddSession: () => void;
  addedSession?: SessionInterface;
}

const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const GroupSessionsList: React.FC<Props> = memo((props) => {
  const { group, selectedSession, onSelectSession, onEditSession, onAddSession, addedSession } = props;
  const [sessions, setSessions] = React.useState<SessionInterface[]>([]);
  const [sessionAttendanceCounts, setSessionAttendanceCounts] = React.useState<Record<string, number>>({});
  const [currentPage, setCurrentPage] = React.useState(1);
  const [selectedYear, setSelectedYear] = React.useState<string>("all");
  const sessionsPerPage = 25;

  const loadSessionAttendanceCounts = useCallback(async (sessions: SessionInterface[]) => {
    const counts: Record<string, number> = {};
    const sessionsToLoadCounts = sessions.slice(0, 50);
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
      setSessionAttendanceCounts((prev) => ({ ...prev, ...counts }));
    }
  }, []);

  const loadSessions = useCallback(() => {
    if (group.id) {
      ApiHelper.get("/sessions?groupId=" + group.id, "AttendanceApi").then(async (data) => {
        if (data.length > 0) {
          const sortedSessions = [...data].sort((a, b) => {
            const dateA = a?.sessionDate ? new Date(a.sessionDate).getTime() : 0;
            const dateB = b?.sessionDate ? new Date(b.sessionDate).getTime() : 0;
            return dateB - dateA;
          });
          setSessions(sortedSessions);
          await loadSessionAttendanceCounts(sortedSessions);
        } else {
          setSessions(data);
          setSessionAttendanceCounts({});
        }
      });
    }
  }, [group.id, loadSessionAttendanceCounts]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    sessions.forEach((session) => {
      if (session.sessionDate) {
        const y = new Date(session.sessionDate).getFullYear();
        if (!isNaN(y)) years.add(String(y));
      } else if (session.displayName) {
        const yearMatch = session.displayName.match(/\b(20\d{2})\b/);
        if (yearMatch) years.add(yearMatch[1]);
      }
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [sessions]);

  React.useEffect(() => {
    if (availableYears.length > 0 && selectedYear === "all") {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  const filteredSessions = useMemo(() => {
    if (selectedYear === "all") return [...sessions];
    return sessions.filter((s) => {
      if (s.sessionDate) {
        const y = new Date(s.sessionDate).getFullYear();
        return String(y) === selectedYear;
      }
      if (!s.displayName) return false;
      return s.displayName.includes(`/${selectedYear}`) || s.displayName.includes(`, ${selectedYear}`);
    });
  }, [sessions, selectedYear]);

  React.useEffect(() => {
    if (filteredSessions.length > 0 && (!selectedSession || !filteredSessions.find((s) => s.id === selectedSession.id))) {
      // Default to most recent non-future session; fall back to first (most recent)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const nonFuture = filteredSessions.find((s) => {
        if (!s.sessionDate) return true;
        const d = new Date(s.sessionDate);
        d.setHours(0, 0, 0, 0);
        return d.getTime() <= today.getTime();
      });
      onSelectSession(nonFuture || filteredSessions[0]);
    } else if (filteredSessions.length === 0) {
      onSelectSession(null);
    }
  }, [filteredSessions, selectedSession, onSelectSession]);

  const paginatedSessions = useMemo(() => {
    const startIndex = (currentPage - 1) * sessionsPerPage;
    return filteredSessions.slice(startIndex, startIndex + sessionsPerPage);
  }, [filteredSessions, currentPage, sessionsPerPage]);

  const totalPages = Math.ceil(filteredSessions.length / sessionsPerPage);
  const canEdit = useMemo(() => UserHelper.checkAccess(Permissions.attendanceApi.attendance.edit), []);

  React.useEffect(() => {
    if (group.id !== undefined) loadSessions();
  }, [group.id, addedSession?.id, addedSession?.sessionDate, (addedSession as any)?._updateTimestamp, loadSessions]);

  const handleAddClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onAddSession();
    },
    [onAddSession]
  );

  const renderRow = (session: SessionInterface) => {
    const isSelected = selectedSession?.id === session.id;
    const date = session.sessionDate ? new Date(session.sessionDate) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayStart = date ? new Date(date) : null;
    dayStart?.setHours(0, 0, 0, 0);

    const isFuture = dayStart ? dayStart.getTime() > today.getTime() : false;
    const isToday = date ? isSameDay(date, new Date()) : false;

    let dotColor = "primary.main";
    if (isFuture) dotColor = "grey.400";
    else if (isToday || isSelected) dotColor = "success.main";

    const dateLabel = date && !isNaN(date.getTime()) ? date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }) : session.displayName || "";
    const dayLabel = date && !isNaN(date.getTime()) ? date.toLocaleDateString("en-US", { weekday: "short" }) : "";
    const timeLabel = session.serviceTime?.name || "";
    const count = sessionAttendanceCounts[session.id];

    const rightText = isFuture ? Locale.label("groups.groupSessions.upcoming") || "upcoming" : count !== undefined ? String(count) : "";

    return (
      <React.Fragment key={session.id}>
        <ListItem
          disablePadding
          secondaryAction={
            canEdit && onEditSession ? (
              <IconButton
                edge="end"
                size="small"
                aria-label={Locale.label("groups.sessionCard.edit")}
                onClick={(e) => {
                  e.stopPropagation();
                  onEditSession(session);
                }}>
                <Icon fontSize="small">edit</Icon>
              </IconButton>
            ) : null
          }>
          <ListItemButton
            selected={isSelected}
            onClick={() => onSelectSession(session)}
            sx={{ py: 1.25, pl: 1.5, pr: canEdit && onEditSession ? 5 : 1.5, alignItems: "flex-start" }}>
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: dotColor, mt: 0.75, mr: 1.5, flexShrink: 0 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: isSelected ? "primary.main" : "text.primary" }}>
                  {dateLabel}
                  {dayLabel && (
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1, fontWeight: 400 }}>
                      {dayLabel}
                    </Typography>
                  )}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: isFuture ? "text.secondary" : isSelected ? "primary.main" : "text.primary",
                    fontWeight: isFuture ? 400 : 600,
                    fontStyle: isFuture ? "italic" : "normal",
                    whiteSpace: "nowrap"
                  }}>
                  {isFuture ? `— ${rightText}` : rightText}
                </Typography>
              </Box>
              {(timeLabel || isSelected) && (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                  {timeLabel}
                  {isSelected && !isFuture && ` · ${Locale.label("groups.sessionCard.active")}`}
                </Typography>
              )}
            </Box>
          </ListItemButton>
        </ListItem>
        <Divider component="li" />
      </React.Fragment>
    );
  };

  if (sessions === null) return <Loading />;

  return (
    <Paper sx={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <Box sx={{ p: 2, pb: 1 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
          <Typography variant="h6" component="div">
            {Locale.label("groups.groupSessions.sessions")}
          </Typography>
          <Chip label={filteredSessions.length} size="small" />
        </Box>
        {availableYears.length > 0 && (
          <ToggleButtonGroup
            value={selectedYear}
            exclusive
            size="small"
            fullWidth
            onChange={(_, value) => {
              if (value !== null) {
                setSelectedYear(value);
                setCurrentPage(1);
              }
            }}>
            {availableYears.map((year) => (
              <ToggleButton key={year} value={year} sx={{ textTransform: "none" }}>
                {year}
              </ToggleButton>
            ))}
            {availableYears.length > 1 && (
              <ToggleButton value="all" sx={{ textTransform: "none" }}>
                {Locale.label("groups.groupSessions.allYears") || "All"}
              </ToggleButton>
            )}
          </ToggleButtonGroup>
        )}
      </Box>

      {sessions.length === 0 ? (
        <Box sx={{ p: 3, textAlign: "center" }}>
          <Icon sx={{ fontSize: 40, color: "text.secondary", mb: 1 }}>calendar_month</Icon>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {Locale.label("groups.groupSessions.noSesMsg")}
          </Typography>
        </Box>
      ) : filteredSessions.length === 0 ? (
        <Box sx={{ p: 3, textAlign: "center" }}>
          <Icon sx={{ fontSize: 40, color: "text.secondary", mb: 1 }}>search_off</Icon>
          <Typography variant="body2" color="text.secondary">
            {Locale.label("groups.groupSessions.noSessionsFound")}
          </Typography>
        </Box>
      ) : (
        <>
          <Divider />
          <List disablePadding sx={{ flex: 1, overflowY: "auto", maxHeight: { xs: 480, md: 680 } }}>
            {paginatedSessions.map(renderRow)}
          </List>
          {totalPages > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 1, borderTop: 1, borderColor: "divider" }}>
              <Pagination count={totalPages} page={currentPage} onChange={(_, page) => setCurrentPage(page)} color="primary" size="small" />
            </Box>
          )}
        </>
      )}

      {canEdit && (
        <Box sx={{ p: 1.5, borderTop: 1, borderColor: "divider" }}>
          <Button variant="contained" color="primary" fullWidth startIcon={<Icon>add</Icon>} onClick={handleAddClick} data-cy="create-new-session">
            {Locale.label("groups.groupSessions.new")}
          </Button>
        </Box>
      )}
    </Paper>
  );
});
