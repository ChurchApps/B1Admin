import React, { useCallback, useState } from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Link, Stack, TextField, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { CheckCircle as ApproveIcon, Cancel as DeclineIcon } from "@mui/icons-material";
import { ApiHelper, PersonAvatar, DateHelper, Locale, Permissions, UserHelper } from "@churchapps/apphelper";
import type { GroupJoinRequestInterface } from "@churchapps/helpers";

interface Props {
  requests: GroupJoinRequestInterface[];
  showGroupName?: boolean;
  onChanged: () => void;
}

export const PendingJoinRequests: React.FC<Props> = ({ requests, showGroupName, onChanged }) => {
  const [declineTarget, setDeclineTarget] = useState<GroupJoinRequestInterface | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState("");
  const canOpenProfile = UserHelper.checkAccess(Permissions.membershipApi.people.view);

  const handleApprove = useCallback(async (req: GroupJoinRequestInterface) => {
    setWorking(req.id || null);
    setError("");
    try {
      await ApiHelper.post(`/groupjoinrequests/${req.id}/approve`, {}, "MembershipApi");
      onChanged();
    } catch {
      setError(Locale.label("groups.pendingRequests.approveError"));
    } finally {
      setWorking(null);
    }
  }, [onChanged]);

  const handleDeclineSubmit = useCallback(async () => {
    if (!declineTarget) return;
    setWorking(declineTarget.id || null);
    setError("");
    try {
      await ApiHelper.post(`/groupjoinrequests/${declineTarget.id}/decline`, { declineReason: declineReason || undefined }, "MembershipApi");
      setDeclineTarget(null);
      setDeclineReason("");
      onChanged();
    } catch {
      setError(Locale.label("groups.pendingRequests.declineError"));
    } finally {
      setWorking(null);
    }
  }, [declineTarget, declineReason, onChanged]);

  if (!requests.length) return null;

  return (
    <Box data-testid="pending-requests" sx={{ mb: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
        {Locale.label("groups.pendingRequests.title").replace("{count}", requests.length.toString())}
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError("")}>{error}</Alert>}
      <Stack spacing={1}>
        {requests.map((req) => (
          <Box key={req.id} sx={{ p: 2, border: 1, borderColor: "divider", borderRadius: "var(--b1-radius-panel)" }} data-testid={`pending-request-${req.id}`}>
            <Stack direction="row" spacing={2} alignItems="center">
              <PersonAvatar person={req.person!} size="small" />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {canOpenProfile && req.personId
                    ? <Link component={RouterLink} to={"/people/" + req.personId} underline="hover" data-testid={`pending-request-person-${req.id}`}>{req.person?.name?.display || Locale.label("groups.groupMembers.unknown")}</Link>
                    : req.person?.name?.display || Locale.label("groups.groupMembers.unknown")}
                  {showGroupName && req.group?.name && (
                    <Typography component="span" variant="body2" sx={{ ml: 1, color: "text.secondary", fontWeight: 400 }}>
                      → {req.group.name}
                    </Typography>
                  )}
                </Typography>
                {req.message && (
                  <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic" }}>
                    "{req.message}"
                  </Typography>
                )}
                {req.requestDate && (
                  <Typography variant="caption" sx={{ color: "text.disabled" }}>
                    {new Date(req.requestDate).toLocaleString(DateHelper.locale)}
                  </Typography>
                )}
              </Box>
              <Button
                size="small"
                variant="contained"
                color="success"
                startIcon={<ApproveIcon />}
                disabled={working === req.id}
                onClick={() => handleApprove(req)}
                data-testid={`approve-${req.id}`}>
                {Locale.label("groups.pendingRequests.approve")}
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<DeclineIcon />}
                disabled={working === req.id}
                onClick={() => setDeclineTarget(req)}
                data-testid={`decline-${req.id}`}>
                {Locale.label("groups.pendingRequests.decline")}
              </Button>
            </Stack>
          </Box>
        ))}
      </Stack>

      <Dialog open={!!declineTarget} onClose={() => setDeclineTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle>{Locale.label("groups.pendingRequests.declineTitle")}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {Locale.label("groups.pendingRequests.declineHelp")}
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={2}
            maxRows={4}
            label={Locale.label("groups.pendingRequests.reason")}
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 500 } }}
            data-testid="decline-reason-input"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeclineTarget(null); setDeclineReason(""); }}>{Locale.label("common.cancel")}</Button>
          <Button onClick={handleDeclineSubmit} disabled={!!declineTarget && working === declineTarget.id} variant="contained" color="error" data-testid="decline-confirm">
            {Locale.label("groups.pendingRequests.decline")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
