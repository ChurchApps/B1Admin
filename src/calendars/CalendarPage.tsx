import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Typography, Table, TableBody, TableRow, TableCell, Box } from "@mui/material";
import { ApiHelper, UserHelper, Loading, Locale, Permissions } from "@churchapps/apphelper";
import { type CuratedCalendarInterface, type GroupInterface, type CuratedEventInterface } from "@churchapps/helpers";
import { useConfirmDelete, useRequirePermission, usePendingApprovalsCount } from "../hooks";
import { CuratedCalendar } from "./components/CuratedCalendar";
import { EventModal } from "./components/EventModal";
import { ImportIcsModal } from "./components/ImportIcsModal";
import { CalendarEdit } from "./components/CalendarEdit";
import { PlatedRecord, SectionLabel, Verb, plainTableSx } from "./components/plate";

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
  const navigate = useNavigate();
  const [currentCalendar, setCurrentCalendar] = useState<CuratedCalendarInterface | null>(null);
  const [groups, setGroups] = useState<GroupInterface[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState<boolean>(false);
  const [events, setEvents] = useState<CuratedEventInterface[]>([]);
  const [refresh, refresher] = useState({});
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState(false);
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

  const canEdit = UserHelper.checkAccess(Permissions.contentApi.content.edit);

  return (
    <>
      {ConfirmDialogElement}
      <style>{printStyles}</style>
      <PlatedRecord
        identity={(
          <>
            <Typography id="page-header-title" component="h1" sx={{ fontSize: { xs: "1.8rem", sm: "2.4rem" }, fontWeight: 500, letterSpacing: "-0.01em", lineHeight: 1.1 }}>
              {currentCalendar?.name || Locale.label("calendars.calendarPage.calendar")}
            </Typography>
            <Typography id="page-header-subtitle" sx={{ color: "text.secondary", mt: 1, mb: 2 }}>
              {Locale.label("calendars.calendarList.curatedCalendar")}
            </Typography>
            <Box sx={{ display: "flex", gap: 1.75, flexWrap: "wrap", mb: 1 }}>
              <Verb onClick={() => setShowNewEvent(true)} testId="new-event-button">{Locale.label("calendars.calendarPage.newEvent")}</Verb>
              <Verb onClick={() => setShowImport(true)} testId="import-ics-button">{Locale.label("calendars.calendarPage.importIcs")}</Verb>
              <Verb onClick={() => window.print()} testId="print-calendar-button">{Locale.label("calendars.calendarPage.print")}</Verb>
              {canEdit && <Verb onClick={() => setEditing(true)}>{Locale.label("common.edit")}</Verb>}
              {pendingApprovals > 0 && (
                <Box component={Link} to="/calendars/approvals" data-testid="pending-approvals-link" sx={{ fontSize: "0.88rem", fontWeight: 600, color: "primary.main", textDecoration: "none" }}>
                  {Locale.label("calendars.calendarPage.pendingApprovals").replace("{count}", String(pendingApprovals))}
                </Box>
              )}
            </Box>
            <SectionLabel>{Locale.label("calendars.calendarPage.groupsInCalendar")}</SectionLabel>
            {isLoadingGroups ? (
              <Loading data-testid="groups-loading" />
            ) : addedGroups.length === 0 ? (
              <Typography variant="body2" color="text.secondary">{Locale.label("calendars.calendarPage.noGroupsAdded")}</Typography>
            ) : (
              <Table size="small" sx={plainTableSx}>
                <TableBody>
                  {addedGroups.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{g.name}</Typography>
                      </TableCell>
                      {canEdit && (
                        <TableCell align="right" className="rowActions">
                          <Verb onClick={() => handleGroupDelete(g.id || "")} testId={`remove-group-${g.id}-button`}>{Locale.label("common.remove")}</Verb>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </>
        )}
        slice={editing && currentCalendar ? (
          <CalendarEdit
            calendar={currentCalendar}
            updatedCallback={(cal) => {
              setEditing(false);
              if (cal === null) {
                navigate("/calendars");
                return;
              }
              loadData();
            }}
          />
        ) : (
          <Box className="print-area">
            <SectionLabel>{Locale.label("calendars.calendarPage.calendarEvents")}</SectionLabel>
            <CuratedCalendar
              curatedCalendarId={curatedCalendarId}
              churchId={UserHelper.currentUserChurch?.church?.id || ""}
              mode="edit"
              updatedCallback={loadData}
              refresh={refresh}
              data-testid="curated-calendar"
            />
          </Box>
        )}
      />
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
