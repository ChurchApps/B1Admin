import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { type GroupInterface } from "@churchapps/helpers";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Table, TableBody, TableCell, TableRow, Typography } from "@mui/material";

interface Props {
  serviceTimeId: string;
  sessionDate: string;
  onClose: () => void;
}

interface SessionStatusRow { groupId: string; sessionId: string | null; attendanceCount: number }

interface GroupStatus { group: GroupInterface; count: number }

// Every active group assigned to the service time, each marked entered or not for the date.
const loadStatus = async (serviceTimeId: string, sessionDate: string): Promise<GroupStatus[]> => {
  const [groups, status] = await Promise.all([
    ApiHelper.get("/groups", "MembershipApi") as Promise<GroupInterface[]>,
    ApiHelper.get("/attendancerecords/sessionStatus?serviceTimeId=" + serviceTimeId + "&date=" + sessionDate, "AttendanceApi") as Promise<SessionStatusRow[]>
  ]);
  const counts = new Map((status || []).map((s) => [s.groupId, s.attendanceCount]));
  return (groups || [])
    .filter((group) => counts.has(group.id!))
    .map((group) => ({ group, count: counts.get(group.id!) || 0 }))
    .sort((a, b) => Number(a.count > 0) - Number(b.count > 0) || (a.group.name || "").localeCompare(b.group.name || ""));
};

export const SessionStatusDialog: React.FC<Props> = ({ serviceTimeId, sessionDate, onClose }) => {
  const statuses = useQuery<GroupStatus[]>({
    queryKey: ["session-status", serviceTimeId, sessionDate],
    queryFn: () => loadStatus(serviceTimeId, sessionDate)
  });

  const rows = statuses.data || [];
  const entered = rows.filter((r) => r.count > 0).length;

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{Locale.label("groups.groupSessions.statusTitle")}</DialogTitle>
      <DialogContent>
        {statuses.isLoading ? (
          <CircularProgress size={24} />
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }} data-testid="session-status-summary">
              {Locale.label("groups.groupSessions.statusSummary").replace("{entered}", String(entered)).replace("{total}", String(rows.length))}
            </Typography>
            <Table size="small">
              <TableBody>
                {rows.map(({ group, count }) => (
                  <TableRow key={group.id} data-testid="session-status-row">
                    <TableCell>
                      <Link to={"/groups/" + group.id} onClick={onClose}>{group.name}</Link>
                    </TableCell>
                    <TableCell align="right">
                      {count > 0
                        ? <Chip size="small" color="success" variant="outlined" label={Locale.label("groups.groupSessions.statusEntered").replace("{count}", String(count))} />
                        : <Chip size="small" color="warning" label={Locale.label("groups.groupSessions.statusNotEntered")} />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{Locale.label("common.close")}</Button>
      </DialogActions>
    </Dialog>
  );
};
