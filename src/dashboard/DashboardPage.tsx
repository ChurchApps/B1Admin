import { Stack, Grid, Box } from "@mui/material";
import { NotificationsActive as AttentionIcon, EventAvailable as ApprovalsIcon, GroupAdd as JoinRequestIcon } from "@mui/icons-material";
import { TaskList } from "../serving/tasks/components/TaskList";
import { QuickActionItem, SundayService } from "./components";
import { Groups } from "../people/components";
import { UserHelper, Locale } from "@churchapps/apphelper";
import { PageContainer } from "../components/ui/PageContainer";
import { CardWithHeader } from "../components/ui/CardWithHeader";
import { GRID_SIZES } from "../components/ui/layoutPresets";
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
            <CardWithHeader title={Locale.label("dashboard.needsAttention.title")} icon={<AttentionIcon sx={{ color: "warning.main", fontSize: 20 }} />}>
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

        <Grid container spacing={3}>
          <Grid size={GRID_SIZES.sidebar}>
            <Groups personId={UserHelper.person?.id || ""} title={Locale.label("dashboard.myGroups")} />
          </Grid>
          <Grid size={GRID_SIZES.mainContent}>
            <TaskList compact={true} status={Locale.label("tasks.taskPage.open")} />
          </Grid>
        </Grid>
      </Stack>
    </PageContainer>
  );
};
