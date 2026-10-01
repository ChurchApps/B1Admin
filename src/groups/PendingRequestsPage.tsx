import { Loading, Locale } from "@churchapps/apphelper";
import { Link as RouterLink } from "react-router-dom";
import { HeaderTextButton, PageContainer, PageHeader, Surface } from "../components/ui";
import { useQuery } from "@tanstack/react-query";
import { Box, Typography } from "@mui/material";
import { ArrowBack as BackIcon } from "@mui/icons-material";
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
      <PageHeader title={Locale.label("groups.pendingRequestsPage.title")} subtitle={Locale.label("groups.pendingRequestsPage.subtitle")}>
        <HeaderTextButton component={RouterLink} to="/groups" startIcon={<BackIcon />} data-testid="groups-back">{Locale.label("groups.groupsPage.groups")}</HeaderTextButton>
      </PageHeader>
      <PageContainer>
        <Box data-testid="pending-requests-page">
          <Surface>
            {requests.data && requests.data.length > 0 ? (
              <PendingJoinRequests
                requests={requests.data}
                showGroupName
                onChanged={() => requests.refetch()}
              />
            ) : (
              <Typography color="text.secondary" data-testid="pending-requests-empty">
                {Locale.label("groups.pendingRequestsPage.empty")}
              </Typography>
            )}
          </Surface>
        </Box>
      </PageContainer>
    </>
  );
};

export default PendingRequestsPage;
