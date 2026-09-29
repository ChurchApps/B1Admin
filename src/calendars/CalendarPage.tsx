import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Typography, Box, Stack } from "@mui/material";
import { ApiHelper, UserHelper, Loading, Locale, Permissions } from "@churchapps/apphelper";
import { type CuratedCalendarInterface, type GroupInterface, type CuratedEventInterface } from "@churchapps/helpers";
import { useConfirmDelete, useRequirePermission, usePendingApprovalsCount } from "../hooks";
import { CuratedCalendar } from "./components/CuratedCalendar";
import { EventModal } from "./components/EventModal";
import { ImportIcsModal } from "./components/ImportIcsModal";
import { CalendarEdit } from "./components/CalendarEdit";
import { BackVerb, PageContainer, RecordHeading, RecordLayout, TextAction, VerbRow, eyebrowSx, useRecordView } from "../components/ui";

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
  const { view: requestedView, setView } = useRecordView("view", { replace: ["edit"] });
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

  const canEdit = UserHelper.checkAccess(Permissions.contentApi.content.edit);
  const view = requestedView === "edit" && canEdit && currentCalendar ? "edit" : "";
  const name = currentCalendar?.name || Locale.label("calendars.calendarPage.calendar");

  const identity = (
    <Box component="aside" data-testid="calendar-identity">
      <Typography id="page-header-title" variant="h1" component="h1" sx={{ overflowWrap: "anywhere" }}>{name}</Typography>
      <Typography id="page-header-subtitle" color="text.secondary" sx={{ mt: 0.5 }}>{Locale.label("calendars.calendarPage.subtitle")}</Typography>
      <VerbRow sx={{ mt: 2 }}>
        <TextAction onClick={() => setShowNewEvent(true)} data-testid="new-event-button">{Locale.label("calendars.calendarPage.newEvent")}</TextAction>
        <TextAction onClick={() => setShowImport(true)} data-testid="import-ics-button">{Locale.label("calendars.calendarPage.importIcs")}</TextAction>
        <TextAction onClick={() => window.print()} data-testid="print-calendar-button">{Locale.label("calendars.calendarPage.print")}</TextAction>
        {canEdit && view !== "edit" && <TextAction onClick={() => setView("edit")} data-testid="edit-calendar-button">{Locale.label("common.edit")}</TextAction>}
      </VerbRow>
      {pendingApprovals > 0 && (
        <Box sx={{ mt: 1 }}>
          <TextAction small to="/calendars/approvals" component={Link} data-testid="pending-approvals-link">
            {Locale.label("calendars.calendarPage.pendingApprovals").replace("{count}", String(pendingApprovals))}
          </TextAction>
        </Box>
      )}

      <Box sx={{ mt: 4 }}>
        <RecordHeading label={Locale.label("calendars.calendarPage.groupsInCalendar")} />
        {isLoadingGroups ? (
          <Loading data-testid="groups-loading" />
        ) : addedGroups.length === 0 ? (
          <>
            <Typography variant="body2">{Locale.label("calendars.calendarPage.noGroupsAdded")}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{Locale.label("calendars.calendarPage.addEventsHint")}</Typography>
          </>
        ) : (
          <Stack component="ul" spacing={1} sx={{ listStyle: "none", p: 0, m: 0 }}>
            {addedGroups.map((g) => (
              <Stack component="li" key={g.id} direction="row" spacing={2} justifyContent="space-between" alignItems="baseline">
                <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 0, overflowWrap: "anywhere" }}>{g.name}</Typography>
                {canEdit && (
                  <TextAction small onClick={() => handleGroupDelete(g.id || "")} data-testid={`remove-group-${g.id}-button`}>{Locale.label("common.remove")}</TextAction>
                )}
              </Stack>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );

  return (
    <>
      {ConfirmDialogElement}
      <style>{printStyles}</style>
      <PageContainer>
        <RecordLayout identity={identity} spacing={3} data-testid="calendar-record">
          {view === "edit" && currentCalendar ? (
            <>
              <Box><BackVerb name={name} onClick={() => setView("")} data-testid="calendar-record-back" /></Box>
              <CalendarEdit
                calendar={currentCalendar}
                updatedCallback={(cal) => {
                  if (cal === null) {
                    navigate("/calendars");
                    return;
                  }
                  setView("");
                  loadData();
                }}
              />
            </>
          ) : (
            <Box className="print-area">
              <Typography component="h2" sx={{ ...eyebrowSx, mb: 1.5 }} className="no-print">{Locale.label("calendars.calendarPage.calendarEvents")}</Typography>
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
        </RecordLayout>
      </PageContainer>
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
