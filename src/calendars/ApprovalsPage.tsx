import { useState, useEffect, useCallback } from "react";
import { ApiHelper, UserHelper, Loading, PageHeader, Locale } from "@churchapps/apphelper";
import { Permissions, type EventInterface } from "@churchapps/helpers";
import { Box, Card, Chip, Grid, Snackbar, Stack, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from "@mui/material";
import { Check as ApproveIcon, Close as RejectIcon, EventAvailable as ApprovalsIcon, WarningAmber as ConflictIcon } from "@mui/icons-material";
import { PermissionDenied } from "../components";
import { AppIconButton } from "../components/ui/AppIconButton";
import { CountChip } from "../components/ui";
import { useConfirmDelete } from "../hooks";
import { type EventBookingInterface } from "./interfaces";

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
      <PageHeader icon={<ApprovalsIcon />} title={Locale.label("calendars.approvals.title")} subtitle={Locale.label("calendars.approvals.subtitle")} />
      <Box sx={{ p: 3 }}>
        {loading ? <Loading /> : (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, lg: 7 }}>
              <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "grey.200" }}>
                <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <ApprovalsIcon sx={{ color: "primary.main", fontSize: 20 }} />
                    <Typography variant="h6">{Locale.label("calendars.approvals.bookingRequests")}</Typography>
                    {bookings.length > 0 && <CountChip count={bookings.length} />}
                  </Stack>
                </Box>
                {bookings.length === 0 ? (
                  <Box sx={{ p: 3, textAlign: "center" }} data-testid="no-pending-bookings">
                    <Typography variant="body2" color="text.secondary">{Locale.label("calendars.approvals.noPendingBookings")}</Typography>
                  </Box>
                ) : (
                  <Table size="small" data-testid="pending-bookings-table">
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
                              <Chip label={Locale.label("calendars.approvals.noConflicts")} size="small" sx={{ backgroundColor: "rgba(46, 125, 50, 0.1)", color: "success.main" }} />
                            )}
                          </TableCell>
                          <TableCell align="right" className="rowActions">
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <AppIconButton tone="card" label={Locale.label("calendars.approvals.approve")} icon={<ApproveIcon />} onClick={() => resolveBooking(b.id || "", "approve")} data-testid={`approve-booking-${b.id}`} />
                              <AppIconButton intent="remove" label={Locale.label("calendars.approvals.reject")} icon={<RejectIcon />} onClick={() => resolveBooking(b.id || "", "reject")} data-testid={`reject-booking-${b.id}`} />
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Card>
            </Grid>
            <Grid size={{ xs: 12, lg: 5 }}>
              <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "grey.200" }}>
                <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <ApprovalsIcon sx={{ color: "primary.main", fontSize: 20 }} />
                    <Typography variant="h6">{Locale.label("calendars.approvals.eventRequests")}</Typography>
                    {events.length > 0 && <CountChip count={events.length} />}
                  </Stack>
                </Box>
                {events.length === 0 ? (
                  <Box sx={{ p: 3, textAlign: "center" }} data-testid="no-pending-events">
                    <Typography variant="body2" color="text.secondary">{Locale.label("calendars.approvals.noPendingEvents")}</Typography>
                  </Box>
                ) : (
                  <Table size="small" data-testid="pending-events-table">
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
                            <Typography variant="caption" color="text.secondary">{e.start ? new Date(e.start).toLocaleString() : ""}</Typography>
                          </TableCell>
                          <TableCell>{e.description}</TableCell>
                          <TableCell align="right" className="rowActions">
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <AppIconButton tone="card" label={Locale.label("calendars.approvals.approve")} icon={<ApproveIcon />} onClick={() => resolveEvent(e.id || "", "approve")} data-testid={`approve-event-${e.id}`} />
                              <AppIconButton intent="remove" label={Locale.label("calendars.approvals.reject")} icon={<RejectIcon />} onClick={() => resolveEvent(e.id || "", "reject")} data-testid={`reject-event-${e.id}`} />
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Card>
            </Grid>
          </Grid>
        )}
      </Box>
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
