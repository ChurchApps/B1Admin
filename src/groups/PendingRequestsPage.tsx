import { Loading, Locale } from "@churchapps/apphelper";
import { Link as RouterLink } from "react-router-dom";
import { PageContainer, PageHeader, Surface, TextAction } from "../components/ui";
import { useQuery } from "@tanstack/react-query";
import { Box } from "@mui/material";
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
      <PageHeader title={Locale.label("groups.pendingRequestsPage.title")} subtitle={Locale.label("groups.pendingRequestsPage.subtitle")} />
      <PageContainer>
        <Box sx={{ mb: 3 }}>
          <TextAction to="/groups" component={RouterLink} data-testid="groups-back">{"← " + Locale.label("common.backTo", "Back to {name}").replace("{name}", Locale.label("groups.groupsPage.groups"))}</TextAction>
        </Box>
        <Box data-testid="pending-requests-page">
          <Surface>
            {requests.data && requests.data.length > 0 ? (
              <PendingJoinRequests
                requests={requests.data}
                showGroupName
                onChanged={() => requests.refetch()}
              />
            ) : (
              <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }} data-testid="pending-requests-empty">
                {Locale.label("groups.pendingRequestsPage.empty")}
              </Box>
            )}
          </Surface>
        </Box>
      </PageContainer>
    </>
  );
};

export default PendingRequestsPage;
