import { Loading, PageHeader } from "@churchapps/apphelper";
import { useQuery } from "@tanstack/react-query";
import { Box, Paper } from "@mui/material";
import { Inbox as InboxIcon } from "@mui/icons-material";
import type { GroupJoinRequestInterface } from "@churchapps/helpers";
import { PendingJoinRequests } from "./components/PendingJoinRequests";

const PendingRequestsPage = () => {
  const requests = useQuery<GroupJoinRequestInterface[]>({
    queryKey: ["/groupjoinrequests/pending", "MembershipApi"],
    placeholderData: []
  });

  if (requests.isLoading) return <Loading />;

  return (
    <>
      <PageHeader icon={<InboxIcon />} title="Pending Join Requests" subtitle="Approve or decline member-initiated requests across all groups." />
      <Box sx={{ p: 3 }} data-testid="pending-requests-page">
        <Paper sx={{ p: 2 }}>
          {requests.data && requests.data.length > 0 ? (
            <PendingJoinRequests
              requests={requests.data}
              showGroupName
              onChanged={() => requests.refetch()}
            />
          ) : (
            <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }} data-testid="pending-requests-empty">
              No pending requests.
            </Box>
          )}
        </Paper>
      </Box>
    </>
  );
};

export default PendingRequestsPage;
