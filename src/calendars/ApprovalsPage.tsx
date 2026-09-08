import { useState, useEffect, useCallback } from "react";
import { ApiHelper, UserHelper, Loading, Locale } from "@churchapps/apphelper";
import { Permissions, type EventInterface } from "@churchapps/helpers";
import { Chip, Snackbar, Stack, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from "@mui/material";
import { WarningAmber as ConflictIcon } from "@mui/icons-material";
import { PermissionDenied } from "../components";
import { useConfirmDelete } from "../hooks";
import { type EventBookingInterface } from "./interfaces";
import { CalendarChrome } from "./components/CalendarChrome";
import { SectionLabel, Verb, plainTableSx } from "./components/plate";

const calendarsAdmin = { api: "ContentApi", contentType: "Calendars", action: "Admin" };

export const ApprovalsPage = () => {
  const [bookings, setBookings] = useState<EventBookingInterface[]>([]);
  const [events, setEvents] = useState<EventInterface[]>([]);
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState("");
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  const canResolve = UserHelper.checkAccess(Permissions.contentApi.content.edit) || UserHelper.checkAccess(calendarsAdmin as any);

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

  const resolveEvent = async (id: string, action: "approve" | "reject") => {
    if (!(await confirmReject(action))) return;
    ApiHelper.post("/events/" + id + "/" + action, {}, "ContentApi").then(() => { notifyResolved(action); loadData(); });
  };

  if (!canResolve) return <PermissionDenied permissions={[Permissions.contentApi.content.edit]} />;

  return (
    <>
      {ConfirmDialogElement}
      <CalendarChrome selected="approvals">
        {loading ? <Loading /> : (
          <>
            <SectionLabel>{Locale.label("calendars.approvals.bookingRequests")}</SectionLabel>
            {bookings.length === 0 ? (
              <Typography variant="body2" color="text.secondary" data-testid="no-pending-bookings">{Locale.label("calendars.approvals.noPendingBookings")}</Typography>
            ) : (
              <Table size="small" data-testid="pending-bookings-table" sx={plainTableSx}>
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
                    <TableRow key={b.id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{b.eventTitle}</Typography>
                        <Typography variant="caption" color="text.secondary">{b.eventStart ? new Date(b.eventStart).toLocaleString() : ""}</Typography>
                      </TableCell>
                      <TableCell>
                        {b.roomName || b.resourceName}
                        {b.resourceId && (b.quantity || 1) > 1 ? ` × ${b.quantity}` : ""}
                      </TableCell>
                      <TableCell>
                        {(b.conflicts?.length || 0) > 0 ? (
                          <Tooltip title={<>{(b.conflicts || []).map((c, i) => <div key={i}>{c.message}</div>)}</>}>
                            <Chip icon={<ConflictIcon />} label={Locale.label("calendars.approvals.conflicts")} size="small" color="warning" data-testid={`booking-conflicts-${b.id}`} />
                          </Tooltip>
                        ) : (
                          <Typography variant="body2" sx={{ color: "success.main" }}>{Locale.label("calendars.approvals.noConflicts")}</Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={2} justifyContent="flex-end" className="rowActions">
                          <Verb onClick={() => resolveBooking(b.id || "", "approve")} testId={`approve-booking-${b.id}`}>{Locale.label("calendars.approvals.approve")}</Verb>
                          <Verb onClick={() => resolveBooking(b.id || "", "reject")} testId={`reject-booking-${b.id}`}>{Locale.label("calendars.approvals.reject")}</Verb>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <SectionLabel>{Locale.label("calendars.approvals.eventRequests")}</SectionLabel>
            {events.length === 0 ? (
              <Typography variant="body2" color="text.secondary" data-testid="no-pending-events">{Locale.label("calendars.approvals.noPendingEvents")}</Typography>
            ) : (
              <Table size="small" data-testid="pending-events-table" sx={plainTableSx}>
                <TableHead>
                  <TableRow>
                    <TableCell>{Locale.label("calendars.approvals.event")}</TableCell>
                    <TableCell>{Locale.label("calendars.approvals.description")}</TableCell>
                    <TableCell align="right" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {events.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{e.title}</Typography>
                        <Typography variant="caption" color="text.secondary">{e.start ? new Date(e.start).toLocaleString() : ""}</Typography>
                      </TableCell>
                      <TableCell>{e.description}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={2} justifyContent="flex-end" className="rowActions">
                          <Verb onClick={() => resolveEvent(e.id || "", "approve")} testId={`approve-event-${e.id}`}>{Locale.label("calendars.approvals.approve")}</Verb>
                          <Verb onClick={() => resolveEvent(e.id || "", "reject")} testId={`reject-event-${e.id}`}>{Locale.label("calendars.approvals.reject")}</Verb>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </>
        )}
      </CalendarChrome>
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
