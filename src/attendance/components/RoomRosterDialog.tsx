import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link as RouterLink } from "react-router-dom";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Link, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { ApiHelper, Loading, Locale, Permissions, UserHelper } from "@churchapps/apphelper";
import { type PersonInterface, type VisitInterface, type VisitSessionInterface } from "@churchapps/helpers";
import { type SessionInterface } from "../../helpers";
import { type CheckinDetails, visibleCheckinColumns } from "../checkinDetails";
import { isoDate, parseDate } from "../week";

interface Props {
  groupId: string;
  groupName: string;
  onClose: () => void;
}

// The Api adds the check-in details to each session visit; the shared interface does not list them yet.
type RoomVisit = VisitInterface & CheckinDetails;

export interface RoomRosterRow extends CheckinDetails {
  personId: string;
  name: string;
  serviceTimeName?: string;
}

const checkinOrder = (row: RoomRosterRow) => {
  const t = row.checkinTime ? new Date(row.checkinTime).getTime() : NaN;
  return isNaN(t) ? Number.MAX_SAFE_INTEGER : t;
};

// Everyone checked in to the room's sessions dated today, from the same session endpoints the group's Sessions tab uses.
const loadTodaysRoster = async (groupId: string): Promise<RoomRosterRow[]> => {
  const today = isoDate(new Date());
  const sessions: SessionInterface[] = (await ApiHelper.get("/sessions?groupId=" + groupId, "AttendanceApi")) || [];
  const todays = sessions.filter((s) => s.id && isoDate(parseDate(s.sessionDate as string | Date) || new Date(0)) === today);
  if (todays.length === 0) return [];
  const perSession = await Promise.all(todays.map(async (s) => {
    const visitSessions: VisitSessionInterface[] = (await ApiHelper.get("/visitsessions?sessionId=" + s.id, "AttendanceApi")) || [];
    return visitSessions.map((vs) => ({ visit: vs.visit as RoomVisit | undefined, serviceTimeName: s.serviceTime?.name || "" }));
  }));
  const visits = perSession.flat().filter((v) => v.visit?.personId);
  if (visits.length === 0) return [];
  const ids = [...new Set(visits.map((v) => v.visit!.personId!))];
  const people: PersonInterface[] = (await ApiHelper.get("/people/ids?ids=" + encodeURIComponent(ids.join(",")), "MembershipApi")) || [];
  const names = new Map(people.map((p) => [p.id, p.name?.display || ""]));
  return visits
    .map(({ visit, serviceTimeName }) => ({
      personId: visit!.personId!,
      name: names.get(visit!.personId!) || "",
      serviceTimeName,
      checkinTime: visit!.checkinTime,
      checkedInBy: visit!.checkedInBy,
      checkoutTime: visit!.checkoutTime,
      checkedOutBy: visit!.checkedOutBy
    }))
    .sort((a, b) => checkinOrder(a) - checkinOrder(b) || a.name.localeCompare(b.name));
};

// Who is in a room today: each check-in with its time, who checked them in, and when and by whom they were picked up.
export const RoomRosterDialog = ({ groupId, groupName, onClose }: Props) => {
  const roster = useQuery<RoomRosterRow[]>({ queryKey: ["room-roster-today", groupId], queryFn: () => loadTodaysRoster(groupId) });
  const rows = useMemo(() => roster.data || [], [roster.data]);
  const columns = useMemo(() => visibleCheckinColumns(rows), [rows]);
  const showServiceTime = useMemo(() => new Set(rows.map((r) => r.serviceTimeName).filter(Boolean)).size > 1, [rows]);
  const stillHere = rows.filter((r) => !r.checkoutTime).length;
  const canOpenProfile = UserHelper.checkAccess(Permissions.membershipApi.people.view);
  const titleId = React.useId();

  const body = () => {
    if (roster.isLoading) return <Loading />;
    if (roster.isError) return <Typography color="error" data-testid="room-roster-error">{Locale.label("attendance.roomRoster.loadError", "The room's check-ins could not be loaded.")}</Typography>;
    if (rows.length === 0) return <Typography color="text.secondary" data-testid="room-roster-empty">{Locale.label("attendance.roomRoster.empty", "No one has checked in to this room today.")}</Typography>;
    return (
      <>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }} data-testid="room-roster-summary">
          {Locale.label("attendance.roomRoster.summary", "{checkedIn} checked in, {stillHere} not picked up yet").replace("{checkedIn}", String(rows.length)).replace("{stillHere}", String(stillHere))}
        </Typography>
        <Table size="small" data-testid="room-roster-table">
          <TableHead>
            <TableRow>
              <TableCell>{Locale.label("common.name")}</TableCell>
              {showServiceTime && <TableCell>{Locale.label("attendance.roomRoster.serviceTime", "Service Time")}</TableCell>}
              {columns.map((c) => <TableCell key={c.key}>{c.label()}</TableCell>)}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={r.personId + "-" + i} data-testid="room-roster-row">
                <TableCell>
                  {canOpenProfile
                    ? <Link component={RouterLink} to={"/people/" + r.personId} underline="hover">{r.name}</Link>
                    : r.name}
                </TableCell>
                {showServiceTime && <TableCell>{r.serviceTimeName}</TableCell>}
                {columns.map((c) => (
                  <TableCell key={c.key} data-testid={`room-roster-${c.key}`} sx={{ whiteSpace: "nowrap" }}>
                    {c.value(r) || <Typography component="span" variant="body2" color="text.disabled">—</Typography>}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </>
    );
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md" aria-labelledby={titleId} data-testid="room-roster-dialog">
      <DialogTitle id={titleId}>{Locale.label("attendance.roomRoster.title", "{room} today").replace("{room}", groupName)}</DialogTitle>
      <DialogContent sx={{ overflowX: "auto" }}>{body()}</DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} data-testid="room-roster-close">{Locale.label("common.close")}</Button>
      </DialogActions>
    </Dialog>
  );
};
