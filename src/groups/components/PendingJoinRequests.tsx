import React, { useCallback, useState } from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Stack, TextField, Typography } from "@mui/material";
import { CheckCircle as ApproveIcon, Cancel as DeclineIcon } from "@mui/icons-material";
import { ApiHelper, PersonAvatar } from "@churchapps/apphelper";
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

  const handleApprove = useCallback(async (req: GroupJoinRequestInterface) => {
    setWorking(req.id || null);
    setError("");
    try {
      await ApiHelper.post(`/groupjoinrequests/${req.id}/approve`, {}, "MembershipApi");
      onChanged();
    } catch {
      setError("Unable to approve the request. Please try again.");
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
      setError("Unable to decline the request. Please try again.");
    } finally {
      setWorking(null);
    }
  }, [declineTarget, declineReason, onChanged]);

  if (!requests.length) return null;

  return (
    <Box data-testid="pending-requests" sx={{ mb: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
        Pending Requests ({requests.length})
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError("")}>{error}</Alert>}
      <Stack spacing={1}>
        {requests.map((req) => (
          <Paper key={req.id} variant="outlined" sx={{ p: 1.5 }} data-testid={`pending-request-${req.id}`}>
            <Stack direction="row" spacing={2} alignItems="center">
              <PersonAvatar person={req.person!} size="small" />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {req.person?.name?.display || "Unknown"}
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
                    {new Date(req.requestDate).toLocaleString()}
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
                Approve
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<DeclineIcon />}
                disabled={working === req.id}
                onClick={() => setDeclineTarget(req)}
                data-testid={`decline-${req.id}`}>
                Decline
              </Button>
            </Stack>
          </Paper>
        ))}
      </Stack>

      <Dialog open={!!declineTarget} onClose={() => setDeclineTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle>Decline Request</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Optionally provide a reason. This will be shown to the requester.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={2}
            maxRows={4}
            label="Reason (optional)"
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 500 } }}
            data-testid="decline-reason-input"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeclineTarget(null); setDeclineReason(""); }}>Cancel</Button>
          <Button onClick={handleDeclineSubmit} variant="contained" color="error" data-testid="decline-confirm">
            Decline
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
