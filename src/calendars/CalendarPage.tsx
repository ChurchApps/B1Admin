import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Typography,
  Grid,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Card,
  Box,
  Stack,
  TableHead
} from "@mui/material";
import { Delete as DeleteIcon, CalendarMonth as CalendarIcon, Groups as GroupsIcon, Add as AddIcon, Print as PrintIcon, UploadFile as ImportIcon, EventAvailable as ApprovalsIcon } from "@mui/icons-material";
import { ApiHelper, UserHelper, Loading, PageHeader, Locale, Permissions } from "@churchapps/apphelper";
import { type CuratedCalendarInterface, type GroupInterface, type CuratedEventInterface } from "@churchapps/helpers";
import { useConfirmDelete, useRequirePermission, usePendingApprovalsCount } from "../hooks";
import { CuratedCalendar } from "./components/CuratedCalendar";
import { EventModal } from "./components/EventModal";
import { ImportIcsModal } from "./components/ImportIcsModal";
import { AppIconButton } from "../components/ui/AppIconButton";
import { CountChip, EmptyState } from "../components/ui";
import { HeaderPrimaryButton, HeaderSecondaryButton } from "../components/ui/headerButtons";

const printStyles = `@media print {
  body * { visibility: hidden; }
  .print-area, .print-area * { visibility: visible; }
  .print-area { position: absolute; left: 0; top: 0; width: 100%; border: none !important; box-shadow: none !important; }
  .print-area .rbc-calendar { height: 7.8in !important; }
  .print-area .rbc-calendar:has(.rbc-agenda-view) { height: auto !important; }
  .print-area .no-print, .print-area .no-print *, .print-area .rbc-btn-group { display: none !important; }
}`;

export const CalendarPage = () => {
  const params = useParams();
  const [currentCalendar, setCurrentCalendar] = useState<CuratedCalendarInterface | null>(null);
  const [groups, setGroups] = useState<GroupInterface[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState<boolean>(false);
  const [events, setEvents] = useState<CuratedEventInterface[]>([]);
  const [refresh, refresher] = useState({});
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const { confirm, ConfirmDialogElement } = useConfirmDelete();
  const denied = useRequirePermission(Permissions.contentApi.content.edit);
  const pendingApprovals = usePendingApprovalsCount();

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

  const handleGroupDelete = async (groupId: string) => {
    if (await confirm(Locale.label("calendars.calendarPage.confirmRemoveGroup"))) {
      ApiHelper.delete("/curatedEvents/calendar/" + curatedCalendarId + "/group/" + groupId, "ContentApi").then(() => {
        loadData();
        refresher({});
      });
    }
  };

  const addedGroups = groups.filter((g) => events.find((event) => event.groupId === g.id));

  useEffect(() => {
    loadData();
  }, [curatedCalendarId]);

  if (!curatedCalendarId) return null;
  if (denied) return denied;

  return (
    <>
      {ConfirmDialogElement}
      <style>{printStyles}</style>
      <PageHeader
        icon={<CalendarIcon />}
        title={currentCalendar?.name || Locale.label("calendars.calendarPage.calendar")}
        subtitle={Locale.label("calendars.calendarPage.subtitle")}
      >
        {pendingApprovals > 0 && (
          <HeaderSecondaryButton startIcon={<ApprovalsIcon />} {...({ component: Link, to: "/calendars/approvals" } as any)} data-testid="pending-approvals-link">
            {Locale.label("calendars.calendarPage.pendingApprovals").replace("{count}", String(pendingApprovals))}
          </HeaderSecondaryButton>
        )}
        <HeaderSecondaryButton startIcon={<ImportIcon />} onClick={() => setShowImport(true)} data-testid="import-ics-button">
          {Locale.label("calendars.calendarPage.importIcs")}
        </HeaderSecondaryButton>
        <HeaderSecondaryButton startIcon={<PrintIcon />} onClick={() => window.print()} data-testid="print-calendar-button">
          {Locale.label("calendars.calendarPage.print")}
        </HeaderSecondaryButton>
        <HeaderPrimaryButton startIcon={<AddIcon />} onClick={() => setShowNewEvent(true)} data-testid="new-event-button">
          {Locale.label("calendars.calendarPage.newEvent")}
        </HeaderPrimaryButton>
      </PageHeader>

      <Box sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Card
              className="print-area"
              sx={{
                borderRadius: 2,
                border: "1px solid",
                borderColor: "grey.200"
              }}
            >
              <Box sx={{ p: 2, borderBottom: 1, borderColor: "var(--border-light)" }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <CalendarIcon sx={{ color: "primary.main", fontSize: 20 }} />
                  <Typography variant="h6">
                    {Locale.label("calendars.calendarPage.calendarEvents")}
                  </Typography>
                </Stack>
              </Box>
              <Box sx={{ p: 2 }}>
                <CuratedCalendar
                  curatedCalendarId={curatedCalendarId}
                  churchId={UserHelper.currentUserChurch?.church?.id || ""}
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
              <Box sx={{ p: 2, borderBottom: 1, borderColor: "var(--border-light)" }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <GroupsIcon sx={{ color: "primary.main", fontSize: 20 }} />
                  <Typography variant="h6">
                    {Locale.label("calendars.calendarPage.groupsInCalendar")}
                  </Typography>
                  {addedGroups.length > 0 && <CountChip count={addedGroups.length} />}
                </Stack>
              </Box>
              <Box>
                {isLoadingGroups ? (
                  <Box sx={{ p: 3, textAlign: "center" }}>
                    <Loading data-testid="groups-loading" />
                  </Box>
                ) : addedGroups.length === 0 ? (
                  <Box sx={{ p: 2 }}>
                    <EmptyState
                      variant="card"
                      icon={<GroupsIcon />}
                      title={Locale.label("calendars.calendarPage.noGroupsAdded")}
                      description={Locale.label("calendars.calendarPage.addEventsHint")}
                    />
                  </Box>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>
                          {Locale.label("calendars.calendarPage.groupName")}
                        </TableCell>
                        <TableCell align="right" />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {addedGroups.map((g) => (
                        <TableRow key={g.id}>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>{g.name}</Typography>
                          </TableCell>
                          {UserHelper.checkAccess(Permissions.contentApi.content.edit) && (
                            <TableCell align="right" className="rowActions">
                              <AppIconButton intent="remove" label={Locale.label("common.remove")} icon={<DeleteIcon />} onClick={() => handleGroupDelete(g.id || "")} data-testid={`remove-group-${g.id}-button`} />
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Box>
            </Card>
          </Grid>
        </Grid>
      </Box>
      {showNewEvent && (
        <EventModal
          churchId={UserHelper.currentUserChurch?.church?.id || ""}
          curatedCalendarId={curatedCalendarId}
          onDone={(saved) => {
            setShowNewEvent(false);
            if (saved) {
              loadData();
              refresher({});
            }
          }}
        />
      )}
      {showImport && (
        <ImportIcsModal
          onDone={(imported) => {
            setShowImport(false);
            if (imported) {
              loadData();
              refresher({});
            }
          }}
        />
      )}
    </>
  );
};
