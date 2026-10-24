import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Box, Link as MuiLink, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { Locale, UniqueIdHelper, UserHelper } from "@churchapps/apphelper";
import { type GroupMemberInterface, type TaskInterface } from "@churchapps/helpers";
import { NewTask } from "../../serving/tasks/components/NewTask";
import { RecordHeading, TextAction, VerbRow } from "../../components/ui";
import { hasAllGroupsAccess } from "../../helpers";

const linkSx = { fontWeight: 600 } as const;

// Home's quiet "mine" lists: my open tasks and my groups as plain text links.
export const MyWork: React.FC = () => {
  const personId = UserHelper.person?.id || "";
  const [showAdd, setShowAdd] = useState(false);
  const canAllGroups = hasAllGroupsAccess();

  const tasksQuery = useQuery<TaskInterface[]>({ queryKey: ["/tasks", "DoingApi"], enabled: !UniqueIdHelper.isMissing(personId), placeholderData: [] });
  const groupsQuery = useQuery<GroupMemberInterface[]>({ queryKey: ["/groupmembers?personId=" + personId, "MembershipApi"], enabled: !UniqueIdHelper.isMissing(personId), placeholderData: [] });

  const myTasks = useMemo(() => (tasksQuery.data || []).filter((t) => t.assignedToId === personId && t.status === "Open").slice(0, 4), [tasksQuery.data, personId]);
  const myGroups = groupsQuery.data || [];
  // Placeholder [] shows while loading; don't read it as "none".
  const loadingState = (q: { isPending: boolean; isPlaceholderData: boolean; isError: boolean }, testId: string) => {
    if (q.isError) return <Typography variant="body2" color="text.secondary">{Locale.label("dashboard.loadError", "Couldn't load this. Refresh to try again.")}</Typography>;
    if (!UniqueIdHelper.isMissing(personId) && (q.isPending || q.isPlaceholderData)) return <Typography variant="body2" color="text.secondary" data-testid={testId}>{Locale.label("common.loading")}</Typography>;
    return null;
  };

  return (
    <Box sx={{ display: "grid", gap: { xs: 4, md: 6 }, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, alignItems: "start" }}>
      <Box component="section" aria-labelledby="home-my-tasks" data-testid="home-my-tasks">
        <RecordHeading id="home-my-tasks" label={Locale.label("dashboard.myTasks", "My tasks")}>
          <VerbRow>
            {!showAdd && <TextAction small onClick={() => setShowAdd(true)} aria-label={Locale.label("tasks.taskList.addTaskAria")} data-testid="add-task-button">{Locale.label("tasks.taskList.addTask")}</TextAction>}
            <TextAction small to="/serving/tasks" component={Link}>{Locale.label("dashboard.allTasks", "All tasks")}</TextAction>
          </VerbRow>
        </RecordHeading>
        {showAdd && (
          <Box sx={{ mb: 2 }}>
            <NewTask compact onCancel={() => setShowAdd(false)} onSave={() => { tasksQuery.refetch(); setShowAdd(false); }} />
          </Box>
        )}
        {loadingState(tasksQuery, "my-tasks-loading") || (myTasks.length === 0
          ? <Typography variant="body2" color="text.secondary">{Locale.label("dashboard.noOpenTasks", "No open tasks assigned to you.")}</Typography>
          : (
            <Stack component="ul" spacing={1} sx={{ listStyle: "none", m: 0, p: 0 }}>
              {myTasks.map((t) => (
                <li key={t.id}>
                  <MuiLink component={Link} to={"/serving/tasks/" + t.id} underline="hover" sx={linkSx}>{t.title}</MuiLink>
                </li>
              ))}
            </Stack>
          ))}
      </Box>

      <Box component="section" aria-labelledby="home-my-groups" data-testid="home-my-groups">
        <RecordHeading id="home-my-groups" label={Locale.label("dashboard.myGroups", "My Groups")}>
          {canAllGroups && <TextAction small to="/groups" component={Link}>{Locale.label("dashboard.allGroups", "All groups")}</TextAction>}
        </RecordHeading>
        {loadingState(groupsQuery, "my-groups-loading") || (myGroups.length === 0
          ? <Typography variant="body2" color="text.secondary">{Locale.label("dashboard.noGroups", "You're not in any groups yet.")}</Typography>
          : (
            <VerbRow sx={{ typography: "body1" }}>
              {myGroups.map((gm) => (
                <MuiLink key={gm.id} component={Link} to={"/groups/" + gm.groupId} underline="hover" sx={linkSx}>{gm.group?.name || Locale.label("people.groups.unknownGroup")}</MuiLink>
              ))}
            </VerbRow>
          ))}
      </Box>
    </Box>
  );
};
