import { Stack, Box } from "@mui/material";
import { NotificationsActive as AttentionIcon, EventAvailable as ApprovalsIcon, GroupAdd as JoinRequestIcon } from "@mui/icons-material";
import { QuickActionItem, SundayService } from "./components";
import { MyWork } from "./components/MyWork";
import { Locale } from "@churchapps/apphelper";
import { PageContainer } from "../components/ui/PageContainer";
import { CardWithHeader } from "../components/ui/CardWithHeader";
import { usePendingApprovalsCount, usePendingJoinRequestsCount } from "../hooks";

export const DashboardPage = () => {
  const pendingApprovals = usePendingApprovalsCount();
  const pendingJoinRequests = usePendingJoinRequestsCount();
  const needsAttention = pendingApprovals > 0 || pendingJoinRequests > 0;

  return (
    <PageContainer>
      <Stack spacing={3}>
        <SundayService />

        {needsAttention && (
          <Box data-testid="needs-attention">
            <CardWithHeader title={Locale.label("dashboard.needsAttention.title")} icon={<AttentionIcon />}>
              <Stack>
                {pendingApprovals > 0 && (
                  <QuickActionItem icon={<ApprovalsIcon fontSize="small" />} title={Locale.label("dashboard.needsAttention.approvals").replace("{count}", String(pendingApprovals))} linkUrl="/calendars/approvals" />
                )}
                {pendingJoinRequests > 0 && (
                  <QuickActionItem icon={<JoinRequestIcon fontSize="small" />} title={Locale.label("dashboard.needsAttention.joinRequests").replace("{count}", String(pendingJoinRequests))} linkUrl="/groups/pending" />
                )}
              </Stack>
            </CardWithHeader>
          </Box>
        )}

        <Box sx={{ pt: 1 }}>
          <MyWork />
        </Box>
      </Stack>
    </PageContainer>
  );
};
