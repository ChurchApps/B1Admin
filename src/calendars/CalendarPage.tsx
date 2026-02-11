import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Typography,
  Grid,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Tooltip,
  IconButton,
  Card,
  Box,
  Stack,
  TableHead
} from "@mui/material";
import { Delete as DeleteIcon, CalendarMonth as CalendarIcon, Groups as GroupsIcon } from "@mui/icons-material";
import { ApiHelper, UserHelper, Loading, PageHeader, Locale } from "@churchapps/apphelper";
import { type CuratedCalendarInterface, type GroupInterface, type CuratedEventInterface } from "@churchapps/helpers";
import { CuratedCalendar } from "./components/CuratedCalendar";

export const CalendarPage = () => {
  const params = useParams();
  const [currentCalendar, setCurrentCalendar] = useState<CuratedCalendarInterface | null>(null);
  const [groups, setGroups] = useState<GroupInterface[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState<boolean>(false);
  const [events, setEvents] = useState<CuratedEventInterface[]>([]);
  const [refresh, refresher] = useState({});

  const curatedCalendarId = params.id;

  const loadData = () => {
    if (!curatedCalendarId) return;

    setIsLoadingGroups(true);
    ApiHelper.get("/curatedCalendars/" + curatedCalendarId, "ContentApi").then((data: CuratedCalendarInterface) => {
      setCurrentCalendar(data);
    });

    ApiHelper.get("/groups/my", "MembershipApi").then((data: GroupInterface[]) => {
      setGroups(data);
      setIsLoadingGroups(false);
    });

    ApiHelper.get("/curatedEvents/calendar/" + curatedCalendarId + "?withoutEvents=1", "ContentApi").then((data: CuratedEventInterface[]) => {
      setEvents(data);
    });
  };

  const handleGroupDelete = (groupId: string) => {
    if (confirm(Locale.label("calendars.calendarPage.confirmRemoveGroup"))) {
      ApiHelper.delete("/curatedEvents/calendar/" + curatedCalendarId + "/group/" + groupId, "ContentApi").then(() => {
        loadData();
        refresher({});
      });
    }
  };

  const addedGroups = groups.filter((g) => events.find((event) => event.groupId === g.id));

  const getRows = () => addedGroups.map((g) => (
    <TableRow key={g.id}>
      <TableCell>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {g.name}
        </Typography>
      </TableCell>
      <TableCell align="right">
        <Tooltip title={Locale.label("calendars.calendarPage.removeGroup")} arrow>
          <IconButton
            size="small"
            onClick={() => handleGroupDelete(g.id)}
            data-testid={`remove-group-${g.id}-button`}
            aria-label={Locale.label("calendars.calendarPage.removeGroupAria", g.name)}
            sx={{
              color: "error.main",
              "&:hover": { backgroundColor: "error.light" }
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  ));

  useEffect(() => {
    loadData();
  }, [curatedCalendarId]);

  if (!curatedCalendarId) return null;

  return (
    <>
      <PageHeader
        icon={<CalendarIcon />}
        title={currentCalendar?.name || Locale.label("calendars.calendarPage.calendar")}
        subtitle={Locale.label("calendars.calendarPage.subtitle")}
      />

      <Box sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Card
              sx={{
                borderRadius: 2,
                border: "1px solid",
                borderColor: "grey.200"
              }}
            >
              <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <CalendarIcon sx={{ color: "primary.main" }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
                    {Locale.label("calendars.calendarPage.calendarEvents")}
                  </Typography>
                </Stack>
              </Box>
              <Box sx={{ p: 2 }}>
                <CuratedCalendar
                  curatedCalendarId={curatedCalendarId}
                  churchId={UserHelper.currentUserChurch?.church?.id}
                  mode="edit"
                  updatedCallback={loadData}
                  refresh={refresh}
                  data-testid="curated-calendar"
                />
              </Box>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card
              sx={{
                borderRadius: 2,
                border: "1px solid",
                borderColor: "grey.200"
              }}
            >
              <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <GroupsIcon sx={{ color: "primary.main" }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
                    {Locale.label("calendars.calendarPage.groupsInCalendar")}
                  </Typography>
                </Stack>
              </Box>
              <Box>
                {isLoadingGroups ? (
                  <Box sx={{ p: 3, textAlign: "center" }}>
                    <Loading data-testid="groups-loading" />
                  </Box>
                ) : addedGroups.length === 0 ? (
                  <Box sx={{ p: 3, textAlign: "center" }}>
                    <GroupsIcon sx={{ fontSize: 48, color: "grey.400", mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      {Locale.label("calendars.calendarPage.noGroupsAdded")}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {Locale.label("calendars.calendarPage.addEventsHint")}
                    </Typography>
                  </Box>
                ) : (
                  <Table size="small">
                    <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600, color: "text.secondary" }}>
                          {Locale.label("calendars.calendarPage.groupName")}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: "text.secondary" }}>
                          {Locale.label("calendars.calendarPage.actions")}
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>{getRows()}</TableBody>
                  </Table>
                )}
              </Box>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </>
  );
};
