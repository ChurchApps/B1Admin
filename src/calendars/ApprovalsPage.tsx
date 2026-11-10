import { useState, useEffect, useCallback } from "react";
import { ApiHelper, UserHelper, Loading, Locale, DateHelper } from "@churchapps/apphelper";
import { Permissions, type CuratedCalendarInterface, type EventInterface, type PersonInterface } from "@churchapps/helpers";
import { Link } from "react-router-dom";
import { Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, FormHelperText, MenuItem, Snackbar, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography } from "@mui/material";
import { PermissionDenied } from "../components";
import { CountChip, PillTabs, StatusBadge, Surface, TextAction, VerbRow, tableScrollSx } from "../components/ui";
import { useConfirmDelete } from "../hooks";
import { CalendarChrome } from "./components/CalendarChrome";
import { EventModal } from "./components/EventModal";
import { type EventBookingInterface } from "./interfaces";

const calendarsAdmin = { api: "ContentApi", contentType: "Calendars", action: "Admin" };

export const ApprovalsPage = () => {
  const [bookings, setBookings] = useState<EventBookingInterface[]>([]);
  const [events, setEvents] = useState<EventInterface[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [people, setPeople] = useState<Record<string, PersonInterface>>({});
  const [snack, setSnack] = useState("");
  const [approvingId, setApprovingId] = useState("");
  const [editingEventId, setEditingEventId] = useState("");
  const [publish, setPublish] = useState(false);
  const [curatedCalendarId, setCuratedCalendarId] = useState("");
  const [curatedCalendars, setCuratedCalendars] = useState<CuratedCalendarInterface[] | null>(null);
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  const canEditContent = UserHelper.checkAccess(Permissions.contentApi.content.edit);
  const canResolve = canEditContent || UserHelper.checkAccess(calendarsAdmin as any);

  const loadData = useCallback(() => {
    setLoading(true);
    const list = showHistory ? "resolved" : "pending";
    const requests: Promise<any>[] = [ApiHelper.get("/eventBookings/" + list, "ContentApi")];
    if (canResolve) requests.push(ApiHelper.get("/events/" + list, "ContentApi"));
    Promise.all(requests).then(async ([b, e]) => {
      const rows: EventBookingInterface[] = b || [];
      const eventRows: EventInterface[] = e || [];
      const ids = [...new Set([...rows.flatMap((r) => [r.requestedBy, r.resolvedBy]), ...eventRows.map((r: any) => r.requestedBy)].filter(Boolean))];
      const found: PersonInterface[] = ids.length > 0 ? await ApiHelper.get("/people/ids?ids=" + ids.join(","), "MembershipApi").catch((): PersonInterface[] => []) : [];
      const map: Record<string, PersonInterface> = {};
      (found || []).forEach((p) => { if (p.id) map[p.id] = p; });
      setPeople(map);
      setBookings(rows);
      setEvents(eventRows);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [canResolve, showHistory]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const confirmReject = async (action: "approve" | "reject") =>
    action !== "reject" || (await confirm(Locale.label("calendars.approvals.confirmReject"), {
      title: Locale.label("calendars.approvals.rejectTitle"),
      confirmLabel: Locale.label("calendars.approvals.reject"),
      destructive: true
    }));

  const notifyResolved = (action: "approve" | "reject") =>
    setSnack(Locale.label(action === "approve" ? "calendars.approvals.approvedToast" : "calendars.approvals.rejectedToast"));

  const resolveBooking = async (id: string, action: "approve" | "reject") => {
    if (!(await confirmReject(action))) return;
    ApiHelper.post("/eventBookings/" + id + "/" + action, {}, "ContentApi").then(() => { notifyResolved(action); loadData(); });
  };

  const openApproveBooking = (id: string) => {
    setPublish(false);
    setCuratedCalendarId("");
    setApprovingId(id);
    if (canEditContent && curatedCalendars === null) ApiHelper.get("/curatedCalendars", "ContentApi").then((data: CuratedCalendarInterface[]) => setCuratedCalendars(data || []));
  };

  const approveBooking = () => {
    const id = approvingId;
    setApprovingId("");
    const body = { publish, curatedCalendarId: publish ? curatedCalendarId || undefined : undefined };
    ApiHelper.post("/eventBookings/" + id + "/approve", body, "ContentApi").then(() => { notifyResolved("approve"); loadData(); });
  };

  const resolveEvent = async (id: string, action: "approve" | "reject") => {
    if (!(await confirmReject(action))) return;
    ApiHelper.post("/events/" + id + "/" + action, {}, "ContentApi").then(() => { notifyResolved(action); loadData(); });
  };

  const deleteEvent = async (id: string) => {
    if (!(await confirm(Locale.label("calendars.calendarEvent.confirmDelete", "Are you sure?"), { confirmLabel: Locale.label("common.delete"), destructive: true }))) return;
    ApiHelper.delete("/events/" + id, "ContentApi").then(() => loadData());
  };

  if (!canResolve) return <PermissionDenied permissions={[Permissions.contentApi.content.edit]} />;

  const sectionHead = (title: string, count: number) => (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ px: { xs: 2, md: 3 }, pt: { xs: 2, md: 3 }, pb: 2 }}>
      <Typography variant="h3" component="h2">{title}</Typography>
      <CountChip count={count} />
    </Stack>
  );

  const emptyLine = (text: string, testId: string) => (
    <Box sx={{ px: { xs: 2, md: 3 }, pb: 3 }} data-testid={testId}>
      <Typography variant="body2" color="text.secondary">{text}</Typography>
    </Box>
  );

  const when = (d?: Date | string) => (d ? DateHelper.prettyDateTime(new Date(d)) : "");

  const personLink = (personId?: string) => {
    const name = personId ? people[personId]?.name?.display : "";
    if (!personId || !name) return "—";
    return <Typography component={Link} to={"/people/" + personId} variant="body2" sx={{ textDecoration: "none", color: "primary.main", fontWeight: 600 }}>{name}</Typography>;
  };

  const decisionBadge = (status?: string) => (status === "approved"
    ? <StatusBadge tone="success">{Locale.label("calendars.approvals.approved")}</StatusBadge>
    : <StatusBadge tone="danger">{Locale.label("calendars.approvals.rejected")}</StatusBadge>);

  const decided = (b: EventBookingInterface) => {
    const name = b.resolvedBy ? people[b.resolvedBy]?.name?.display : "";
    if (!name || !b.resolvedDate) return "—";
    return <>{name}<Typography variant="caption" color="text.secondary" component="div">{DateHelper.prettyDate(new Date(b.resolvedDate))}</Typography></>;
  };

  const eventCell = (title?: string, start?: Date | string) => (
    <TableCell>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>{title}</Typography>
      <Typography variant="caption" color="text.secondary">{when(start)}</Typography>
    </TableCell>
  );

  const eventActions = (id: string) => (
    <>
      <TextAction small onClick={() => setEditingEventId(id)} data-testid={`edit-event-${id}`}>{Locale.label("common.edit")}</TextAction>
      <TextAction small onClick={() => deleteEvent(id)} data-testid={`delete-event-${id}`}>{Locale.label("common.delete")}</TextAction>
    </>
  );

  const roomCell = (b: EventBookingInterface) => (
    <TableCell>
      {b.roomName || b.resourceName}
      {b.resourceId && (b.quantity || 1) > 1 ? ` × ${b.quantity}` : ""}
    </TableCell>
  );

  const history = (
    <Stack spacing={3}>
      <Surface disablePadding>
        {sectionHead(Locale.label("calendars.approvals.bookingRequests"), bookings.length)}
        {bookings.length === 0 ? emptyLine(Locale.label("calendars.approvals.noResolvedBookings"), "no-resolved-bookings") : (
          <Box sx={tableScrollSx} role="region" aria-label={Locale.label("calendars.approvals.bookingRequests")} tabIndex={0}>
            <Table data-testid="history-bookings-table">
              <TableHead>
                <TableRow>
                  <TableCell>{Locale.label("calendars.approvals.event")}</TableCell>
                  <TableCell>{Locale.label("calendars.approvals.roomResource")}</TableCell>
                  <TableCell>{Locale.label("calendars.approvals.requestedBy")}</TableCell>
                  <TableCell>{Locale.label("calendars.approvals.status")}</TableCell>
                  <TableCell>{Locale.label("calendars.approvals.decided")}</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {bookings.map((b) => (
                  <TableRow key={b.id} hover>
                    {eventCell(b.eventTitle, b.eventStart)}
                    {roomCell(b)}
                    <TableCell>{personLink(b.requestedBy)}</TableCell>
                    <TableCell>{decisionBadge(b.status)}</TableCell>
                    <TableCell>{decided(b)}</TableCell>
                    <TableCell align="right" className="rowActions">
                      <VerbRow sx={{ justifyContent: "flex-end" }}>
                        {b.status === "approved"
                          ? <TextAction small onClick={() => resolveBooking(b.id || "", "reject")} data-testid={`reject-booking-${b.id}`}>{Locale.label("calendars.approvals.reject")}</TextAction>
                          : <TextAction small onClick={() => openApproveBooking(b.id || "")} data-testid={`approve-booking-${b.id}`}>{Locale.label("calendars.approvals.approve")}</TextAction>}
                      </VerbRow>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Surface>

      <Surface disablePadding>
        {sectionHead(Locale.label("calendars.approvals.eventRequests"), events.length)}
        {events.length === 0 ? emptyLine(Locale.label("calendars.approvals.noResolvedEvents"), "no-resolved-events") : (
          <Box sx={tableScrollSx} role="region" aria-label={Locale.label("calendars.approvals.eventRequests")} tabIndex={0}>
            <Table data-testid="history-events-table">
              <TableHead>
                <TableRow>
                  <TableCell>{Locale.label("calendars.approvals.event")}</TableCell>
                  <TableCell>{Locale.label("calendars.approvals.description")}</TableCell>
                  <TableCell>{Locale.label("calendars.approvals.requestedBy")}</TableCell>
                  <TableCell>{Locale.label("calendars.approvals.status")}</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {events.map((e) => (
                  <TableRow key={e.id} hover>
                    {eventCell(e.title, e.start)}
                    <TableCell>{e.description}</TableCell>
                    <TableCell>{personLink((e as any).requestedBy)}</TableCell>
                    <TableCell>{decisionBadge((e as any).approvalStatus)}</TableCell>
                    <TableCell align="right" className="rowActions">
                      <VerbRow sx={{ justifyContent: "flex-end" }}>
                        {(e as any).approvalStatus === "approved"
                          ? <TextAction small onClick={() => resolveEvent(e.id || "", "reject")} data-testid={`reject-event-${e.id}`}>{Locale.label("calendars.approvals.reject")}</TextAction>
                          : <TextAction small onClick={() => resolveEvent(e.id || "", "approve")} data-testid={`approve-event-${e.id}`}>{Locale.label("calendars.approvals.approve")}</TextAction>}
                        {eventActions(e.id || "")}
                      </VerbRow>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Surface>
    </Stack>
  );

  return (
    <>
      {ConfirmDialogElement}
      <CalendarChrome selected="approvals" subtitle={Locale.label("calendars.approvals.subtitle")}>
        <PillTabs
          aria-label={Locale.label("calendars.approvals.title")}
          value={showHistory ? "history" : "pending"}
          onChange={(v) => setShowHistory(v === "history")}
          options={[
            { value: "pending", label: Locale.label("calendars.approvals.pending"), "data-testid": "approvals-pending-pill" },
            { value: "history", label: Locale.label("calendars.approvals.history"), "data-testid": "approvals-history-pill" }
          ]}
          sx={{ mb: 2 }}
        />
        {loading ? <Loading /> : showHistory ? history : (
          <Stack spacing={3}>
            <Surface disablePadding>
              {sectionHead(Locale.label("calendars.approvals.bookingRequests"), bookings.length)}
              {bookings.length === 0 ? emptyLine(Locale.label("calendars.approvals.noPendingBookings"), "no-pending-bookings") : (
                <Box sx={tableScrollSx} role="region" aria-label={Locale.label("calendars.approvals.bookingRequests")} tabIndex={0}>
                  <Table data-testid="pending-bookings-table">
                    <TableHead>
                      <TableRow>
                        <TableCell>{Locale.label("calendars.approvals.event")}</TableCell>
                        <TableCell>{Locale.label("calendars.approvals.roomResource")}</TableCell>
                        <TableCell>{Locale.label("calendars.approvals.requestedBy")}</TableCell>
                        <TableCell>{Locale.label("calendars.approvals.status")}</TableCell>
                        <TableCell align="right" />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {bookings.map((b) => (
                        <TableRow key={b.id} hover>
                          {eventCell(b.eventTitle, b.eventStart)}
                          {roomCell(b)}
                          <TableCell>{personLink(b.requestedBy)}</TableCell>
                          <TableCell>
                            {(b.conflicts?.length || 0) > 0 ? (
                              <Tooltip title={<>{(b.conflicts || []).map((c, i) => <div key={i}>{c.message}</div>)}</>}>
                                <Box component="span" tabIndex={0} data-testid={`booking-conflicts-${b.id}`}>
                                  <StatusBadge tone="warning">{Locale.label("calendars.approvals.conflicts")}</StatusBadge>
                                </Box>
                              </Tooltip>
                            ) : (
                              <StatusBadge tone="success">{Locale.label("calendars.approvals.noConflicts")}</StatusBadge>
                            )}
                          </TableCell>
                          <TableCell align="right" className="rowActions">
                            <VerbRow sx={{ justifyContent: "flex-end" }}>
                              <TextAction small onClick={() => openApproveBooking(b.id || "")} data-testid={`approve-booking-${b.id}`}>{Locale.label("calendars.approvals.approve")}</TextAction>
                              <TextAction small onClick={() => resolveBooking(b.id || "", "reject")} data-testid={`reject-booking-${b.id}`}>{Locale.label("calendars.approvals.reject")}</TextAction>
                            </VerbRow>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </Surface>

            <Surface disablePadding>
              {sectionHead(Locale.label("calendars.approvals.eventRequests"), events.length)}
              {events.length === 0 ? emptyLine(Locale.label("calendars.approvals.noPendingEvents"), "no-pending-events") : (
                <Box sx={tableScrollSx} role="region" aria-label={Locale.label("calendars.approvals.eventRequests")} tabIndex={0}>
                  <Table data-testid="pending-events-table">
                    <TableHead>
                      <TableRow>
                        <TableCell>{Locale.label("calendars.approvals.event")}</TableCell>
                        <TableCell>{Locale.label("calendars.approvals.description")}</TableCell>
                        <TableCell>{Locale.label("calendars.approvals.requestedBy")}</TableCell>
                        <TableCell align="right" />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {events.map((e) => (
                        <TableRow key={e.id} hover>
                          {eventCell(e.title, e.start)}
                          <TableCell>{e.description}</TableCell>
                          <TableCell>{personLink((e as any).requestedBy)}</TableCell>
                          <TableCell align="right" className="rowActions">
                            <VerbRow sx={{ justifyContent: "flex-end" }}>
                              <TextAction small onClick={() => resolveEvent(e.id || "", "approve")} data-testid={`approve-event-${e.id}`}>{Locale.label("calendars.approvals.approve")}</TextAction>
                              <TextAction small onClick={() => resolveEvent(e.id || "", "reject")} data-testid={`reject-event-${e.id}`}>{Locale.label("calendars.approvals.reject")}</TextAction>
                              {eventActions(e.id || "")}
                            </VerbRow>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </Surface>
          </Stack>
        )}
      </CalendarChrome>
      {editingEventId && (
        <EventModal
          churchId={UserHelper.currentUserChurch?.church?.id || ""}
          eventId={editingEventId}
          onDone={(saved) => { setEditingEventId(""); if (saved) loadData(); }}
        />
      )}
      <Dialog open={!!approvingId} onClose={() => setApprovingId("")} fullWidth maxWidth="xs" data-testid="approve-booking-dialog">
        <DialogTitle>{Locale.label("calendars.approvals.approveBookingTitle")}</DialogTitle>
        <DialogContent>
          <FormControlLabel
            control={<Checkbox checked={publish} onChange={(e) => setPublish(e.target.checked)} data-testid="approve-booking-publish" />}
            label={Locale.label("calendars.approvals.publishToCalendar")}
          />
          <FormHelperText sx={{ mt: 0, mb: 2 }}>{Locale.label("calendars.approvals.publishHelp")}</FormHelperText>
          {publish && canEditContent && (
            <TextField fullWidth select label={Locale.label("calendars.approvals.curatedCalendar")} value={curatedCalendarId} onChange={(e) => setCuratedCalendarId(e.target.value)} data-testid="approve-booking-calendar" SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}>
              <MenuItem value="">{Locale.label("calendars.approvals.none")}</MenuItem>
              {(curatedCalendars || []).map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </TextField>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setApprovingId("")} data-testid="approve-booking-cancel">{Locale.label("common.cancel")}</Button>
          <Button variant="contained" onClick={approveBooking} data-testid="approve-booking-confirm">{Locale.label("calendars.approvals.approve")}</Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={!!snack}
        onClose={() => setSnack("")}
        autoHideDuration={2000}
        message={snack}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        data-testid="approvals-snackbar"
      />
    </>
  );
};

export default ApprovalsPage;
