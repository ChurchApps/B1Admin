import { useState, useEffect, useCallback } from "react";
import { ApiHelper, UserHelper, Loading, Locale, DateHelper } from "@churchapps/apphelper";
import { Permissions, type CuratedCalendarInterface, type EventInterface } from "@churchapps/helpers";
import { Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, FormHelperText, MenuItem, Snackbar, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography } from "@mui/material";
import { PermissionDenied } from "../components";
import { CountChip, StatusBadge, Surface, TextAction, VerbRow, tableScrollSx } from "../components/ui";
import { useConfirmDelete } from "../hooks";
import { CalendarChrome } from "./components/CalendarChrome";
import { type EventBookingInterface } from "./interfaces";

const calendarsAdmin = { api: "ContentApi", contentType: "Calendars", action: "Admin" };

export const ApprovalsPage = () => {
  const [bookings, setBookings] = useState<EventBookingInterface[]>([]);
  const [events, setEvents] = useState<EventInterface[]>([]);
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState("");
  const [approvingId, setApprovingId] = useState("");
  const [publish, setPublish] = useState(false);
  const [curatedCalendarId, setCuratedCalendarId] = useState("");
  const [curatedCalendars, setCuratedCalendars] = useState<CuratedCalendarInterface[] | null>(null);
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  const canEditContent = UserHelper.checkAccess(Permissions.contentApi.content.edit);
  const canResolve = canEditContent || UserHelper.checkAccess(calendarsAdmin as any);

  const loadData = useCallback(() => {
    setLoading(true);
    const requests: Promise<any>[] = [ApiHelper.get("/eventBookings/pending", "ContentApi")];
    if (canResolve) requests.push(ApiHelper.get("/events/pending", "ContentApi"));
    Promise.all(requests).then(([b, e]) => {
      setBookings(b || []);
      setEvents(e || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [canResolve]);

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

  const when = (d?: Date | string) => (d ? new Date(d).toLocaleString(DateHelper.locale) : "");

  return (
    <>
      {ConfirmDialogElement}
      <CalendarChrome selected="approvals" subtitle={Locale.label("calendars.approvals.subtitle")}>
        {loading ? <Loading /> : (
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
                        <TableCell>{Locale.label("calendars.approvals.status")}</TableCell>
                        <TableCell align="right" />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {bookings.map((b) => (
                        <TableRow key={b.id} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>{b.eventTitle}</Typography>
                            <Typography variant="caption" color="text.secondary">{when(b.eventStart)}</Typography>
                          </TableCell>
                          <TableCell>
                            {b.roomName || b.resourceName}
                            {b.resourceId && (b.quantity || 1) > 1 ? ` × ${b.quantity}` : ""}
                          </TableCell>
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
                        <TableCell align="right" />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {events.map((e) => (
                        <TableRow key={e.id} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>{e.title}</Typography>
                            <Typography variant="caption" color="text.secondary">{when(e.start)}</Typography>
                          </TableCell>
                          <TableCell>{e.description}</TableCell>
                          <TableCell align="right" className="rowActions">
                            <VerbRow sx={{ justifyContent: "flex-end" }}>
                              <TextAction small onClick={() => resolveEvent(e.id || "", "approve")} data-testid={`approve-event-${e.id}`}>{Locale.label("calendars.approvals.approve")}</TextAction>
                              <TextAction small onClick={() => resolveEvent(e.id || "", "reject")} data-testid={`reject-event-${e.id}`}>{Locale.label("calendars.approvals.reject")}</TextAction>
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
